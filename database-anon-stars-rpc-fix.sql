-- Migration: add anonymous-star bucket and fix RPC spending flow.
-- Anonymous users spend from anon_stars only, reset at midnight Asia/Bangkok (UTC+7).

alter table public.stars
    add column if not exists anon_stars integer not null default 3,
    add column if not exists anon_last_refill_at timestamptz;

update public.stars
set
    anon_stars = case
        when user_id is null then greatest(
            0,
            coalesce(anon_stars, daily_stars, current_stars, 3)
        )
        else 0
    end,
    anon_last_refill_at = coalesce(
        anon_last_refill_at,
        last_refill_at,
        daily_last_refill_at,
        now()
    ),
    daily_stars = case
        when user_id is null then coalesce(daily_stars, 0)
        else coalesce(daily_stars, 6)
    end,
    current_stars = case
        when user_id is null then greatest(
            0,
            coalesce(anon_stars, daily_stars, current_stars, 3)
        )
        else greatest(0, coalesce(daily_stars, 0))
            + greatest(0, coalesce(plan_stars, 0))
            + greatest(0, coalesce(addon_stars, 0))
    end;

drop function if exists public.star_spend(text, integer, uuid);
drop function if exists public.star_add(text, integer, uuid);
drop function if exists public.star_get_or_create(text, uuid);

create or replace function public.star_get_or_create(
    p_anon_device_id text,
    p_user_id uuid default null
) returns table (
    id uuid,
    user_id uuid,
    anon_device_id text,
    anon_stars integer,
    anon_last_refill_at timestamptz,
    daily_stars integer,
    daily_last_refill_at timestamptz,
    plan_stars integer,
    plan_last_refill_at timestamptz,
    addon_stars integer,
    addon_last_refill_at timestamptz,
    current_stars integer,
    last_refill_at timestamptz,
    first_login_bonus_granted boolean,
    first_time_login_grant boolean
) as $$
declare
    v_state public.stars%rowtype;
    v_cap integer := 6;
    v_now timestamptz := now();
    v_new_daily integer;
    v_new_last timestamptz;
begin
    if p_user_id is not null then
        select *
        into v_state
        from public.stars s
        where s.user_id = p_user_id;

        if not found then
            insert into public.stars (
                user_id,
                anon_stars,
                anon_last_refill_at,
                daily_stars,
                daily_last_refill_at,
                plan_stars,
                addon_stars,
                current_stars,
                last_refill_at,
                first_login_bonus_granted,
                first_time_login_grant,
                updated_at
            )
            values (p_user_id, 0, null, 6, v_now, 0, 0, 6, v_now, true, true, v_now)
            returning * into v_state;
        end if;

        select new_current, coalesce(new_last_refill, v_state.daily_last_refill_at)
        into v_new_daily, v_new_last
        from public._star_apply_refill(
            coalesce(v_state.daily_stars, 0),
            coalesce(v_state.daily_last_refill_at, v_now),
            v_now,
            v_cap,
            2
        );

        update public.stars s
        set daily_stars = v_new_daily,
            daily_last_refill_at = v_new_last,
            last_refill_at = v_new_last,
            anon_stars = 0,
            current_stars = v_new_daily
                + greatest(0, coalesce(s.plan_stars, 0))
                + greatest(0, coalesce(s.addon_stars, 0)),
            updated_at = v_now
        where s.id = v_state.id
        returning * into v_state;
    else
        if p_anon_device_id is null or length(p_anon_device_id) = 0 then
            raise exception 'anon device id required for anonymous state';
        end if;

        select *
        into v_state
        from public.stars s
        where s.anon_device_id = p_anon_device_id;

        if not found then
            insert into public.stars (
                anon_device_id,
                anon_stars,
                anon_last_refill_at,
                daily_stars,
                plan_stars,
                addon_stars,
                current_stars,
                last_refill_at,
                updated_at
            )
            values (p_anon_device_id, 3, v_now, 0, 0, 0, 3, v_now, v_now)
            returning * into v_state;
        end if;

        if (coalesce(v_state.anon_last_refill_at, v_state.last_refill_at, v_now) at time zone 'Asia/Bangkok')::date
           < (v_now at time zone 'Asia/Bangkok')::date then
            update public.stars s
            set anon_stars = 3,
                anon_last_refill_at = v_now,
                current_stars = 3,
                last_refill_at = v_now,
                updated_at = v_now
            where s.id = v_state.id
            returning * into v_state;
        end if;
    end if;

    return query
    select
        v_state.id,
        v_state.user_id,
        v_state.anon_device_id,
        coalesce(v_state.anon_stars, 0),
        coalesce(v_state.anon_last_refill_at, v_state.last_refill_at),
        coalesce(v_state.daily_stars, 0),
        v_state.daily_last_refill_at,
        coalesce(v_state.plan_stars, 0),
        v_state.plan_last_refill_at,
        coalesce(v_state.addon_stars, 0),
        v_state.addon_last_refill_at,
        coalesce(v_state.current_stars, 0),
        v_state.last_refill_at,
        v_state.first_login_bonus_granted,
        v_state.first_time_login_grant;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.star_spend(
    p_anon_device_id text,
    p_amount integer,
    p_user_id uuid default null
) returns table (
    ok boolean,
    anon_stars integer,
    daily_stars integer,
    plan_stars integer,
    addon_stars integer,
    current_stars integer,
    anon_last_refill_at timestamptz,
    daily_last_refill_at timestamptz
) as $$
declare
    v_state public.stars%rowtype;
    v_entry record;
    v_now timestamptz := now();
    v_remaining integer;
    v_daily integer;
    v_plan integer;
    v_addon integer;
    v_anon integer;
begin
    if coalesce(p_amount, 0) <= 0 then
        return query select false, null::int, null::int, null::int, null::int, null::int, null::timestamptz, null::timestamptz;
        return;
    end if;

    select *
    into v_entry
    from public.star_get_or_create(p_anon_device_id, p_user_id);

    if not found then
        return query select false, null::int, null::int, null::int, null::int, null::int, null::timestamptz, null::timestamptz;
        return;
    end if;

    select *
    into v_state
    from public.stars s
    where s.id = v_entry.id
    for update;

    if p_user_id is null then
        v_anon := greatest(0, coalesce(v_state.anon_stars, 0));
        if v_anon < p_amount then
            return query
            select
                false,
                v_anon,
                coalesce(v_state.daily_stars, 0),
                coalesce(v_state.plan_stars, 0),
                coalesce(v_state.addon_stars, 0),
                v_anon,
                coalesce(v_state.anon_last_refill_at, v_state.last_refill_at),
                v_state.daily_last_refill_at;
            return;
        end if;

        v_anon := v_anon - p_amount;

        update public.stars s
        set anon_stars = v_anon,
            current_stars = v_anon,
            last_refill_at = coalesce(v_state.anon_last_refill_at, v_state.last_refill_at, v_now),
            updated_at = v_now
        where s.id = v_state.id
        returning * into v_state;

        return query
        select
            true,
            coalesce(v_state.anon_stars, 0),
            coalesce(v_state.daily_stars, 0),
            coalesce(v_state.plan_stars, 0),
            coalesce(v_state.addon_stars, 0),
            coalesce(v_state.current_stars, 0),
            coalesce(v_state.anon_last_refill_at, v_state.last_refill_at),
            v_state.daily_last_refill_at;
        return;
    end if;

    v_remaining := p_amount;
    v_daily := greatest(0, coalesce(v_state.daily_stars, 0));
    v_plan := greatest(0, coalesce(v_state.plan_stars, 0));
    v_addon := greatest(0, coalesce(v_state.addon_stars, 0));

    if v_daily >= v_remaining then
        v_daily := v_daily - v_remaining;
        v_remaining := 0;
    else
        v_remaining := v_remaining - v_daily;
        v_daily := 0;
    end if;

    if v_remaining > 0 then
        if v_plan >= v_remaining then
            v_plan := v_plan - v_remaining;
            v_remaining := 0;
        else
            v_remaining := v_remaining - v_plan;
            v_plan := 0;
        end if;
    end if;

    if v_remaining > 0 then
        if v_addon >= v_remaining then
            v_addon := v_addon - v_remaining;
            v_remaining := 0;
        else
            v_remaining := v_remaining - v_addon;
            v_addon := 0;
        end if;
    end if;

    if v_remaining > 0 then
        return query
        select
            false,
            coalesce(v_state.anon_stars, 0),
            coalesce(v_state.daily_stars, 0),
            coalesce(v_state.plan_stars, 0),
            coalesce(v_state.addon_stars, 0),
            coalesce(v_state.current_stars, 0),
            coalesce(v_state.anon_last_refill_at, v_state.last_refill_at),
            v_state.daily_last_refill_at;
        return;
    end if;

    update public.stars s
    set daily_stars = v_daily,
        plan_stars = v_plan,
        addon_stars = v_addon,
        daily_last_refill_at = case
            when coalesce(v_state.daily_stars, 0) >= 6 and v_daily < 6 then v_now
            else v_state.daily_last_refill_at
        end,
        last_refill_at = case
            when coalesce(v_state.daily_stars, 0) >= 6 and v_daily < 6 then v_now
            else v_state.last_refill_at
        end,
        current_stars = v_daily + v_plan + v_addon,
        updated_at = v_now
    where s.id = v_state.id
    returning * into v_state;

    return query
    select
        true,
        coalesce(v_state.anon_stars, 0),
        coalesce(v_state.daily_stars, 0),
        coalesce(v_state.plan_stars, 0),
        coalesce(v_state.addon_stars, 0),
        coalesce(v_state.current_stars, 0),
        coalesce(v_state.anon_last_refill_at, v_state.last_refill_at),
        v_state.daily_last_refill_at;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.star_add(
    p_anon_device_id text,
    p_amount integer,
    p_user_id uuid default null
) returns table (
    anon_stars integer,
    daily_stars integer,
    plan_stars integer,
    addon_stars integer,
    current_stars integer,
    anon_last_refill_at timestamptz,
    daily_last_refill_at timestamptz
) as $$
declare
    v_state public.stars%rowtype;
    v_entry record;
    v_now timestamptz := now();
    v_delta integer := greatest(0, coalesce(p_amount, 0));
begin
    select *
    into v_entry
    from public.star_get_or_create(p_anon_device_id, p_user_id);

    select *
    into v_state
    from public.stars s
    where s.id = v_entry.id
    for update;

    if p_user_id is null then
        update public.stars s
        set anon_stars = greatest(0, coalesce(s.anon_stars, 0)) + v_delta,
            current_stars = greatest(0, coalesce(s.anon_stars, 0)) + v_delta,
            updated_at = v_now
        where s.id = v_state.id
        returning * into v_state;
    else
        update public.stars s
        set daily_stars = least(6, greatest(0, coalesce(s.daily_stars, 0)) + v_delta),
            current_stars = least(6, greatest(0, coalesce(s.daily_stars, 0)) + v_delta)
                + greatest(0, coalesce(s.plan_stars, 0))
                + greatest(0, coalesce(s.addon_stars, 0)),
            updated_at = v_now
        where s.id = v_state.id
        returning * into v_state;
    end if;

    return query
    select
        coalesce(v_state.anon_stars, 0),
        coalesce(v_state.daily_stars, 0),
        coalesce(v_state.plan_stars, 0),
        coalesce(v_state.addon_stars, 0),
        coalesce(v_state.current_stars, 0),
        coalesce(v_state.anon_last_refill_at, v_state.last_refill_at),
        v_state.daily_last_refill_at;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.star_get_or_create(text, uuid) to anon, authenticated;
grant execute on function public.star_spend(text, integer, uuid) to anon, authenticated;
grant execute on function public.star_add(text, integer, uuid) to anon, authenticated;
