-- Migration: Avatar feature — "wish" currency + one free reveal per user.
--
-- Adds the server-side economy and locking that backs the /avatar feature:
--   * public.avatar_entitlements  — per-user free_reveal_used flag + wish_balance
--   * public.avatar_sessions      — one row per HeyGen session for locking / refunds
--   * atomic RPCs for start / mark-spoke / end(+refund)
--
-- All gating is enforced here (SECURITY DEFINER). The /avatar API never trusts
-- the client; it only passes the authenticated user id.
--
-- Idempotent: safe to run multiple times.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Entitlements: the free reveal flag and the wish balance live here.
-- 1 wish = 1 minute of real-time avatar conversation.
-- ---------------------------------------------------------------------------
create table if not exists public.avatar_entitlements (
    user_id uuid primary key references auth.users(id) on delete cascade,
    free_reveal_used boolean not null default false,
    wish_balance integer not null default 0 check (wish_balance >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.avatar_entitlements enable row level security;

-- Read-only from the client (for showing balance in the UI). All mutations go
-- through the SECURITY DEFINER RPCs below, never direct writes.
drop policy if exists "Users can view own avatar entitlements" on public.avatar_entitlements;
create policy "Users can view own avatar entitlements" on public.avatar_entitlements
    for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Sessions: one row per HeyGen streaming session. Used to lock against
-- concurrent starts (double-charge / double-free), and to know whether the
-- avatar actually spoke (so a broken session is refunded, not charged).
--
-- status: 'active' | 'ended'
-- mode:   'free' | 'paid'
-- ---------------------------------------------------------------------------
create table if not exists public.avatar_sessions (
    session_id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    mode text not null check (mode in ('free', 'paid')),
    status text not null default 'active' check (status in ('active', 'ended')),
    charged_wish boolean not null default false,
    reserved_free boolean not null default false,
    spoke boolean not null default false,
    refunded boolean not null default false,
    -- Short-lived HeyGen session token, stored so the separate speak/stop
    -- serverless requests can authorize against the same session. Server-only
    -- (RLS denies all client access; the service role bypasses RLS).
    heygen_token text,
    expires_at timestamptz,
    created_at timestamptz not null default now(),
    ended_at timestamptz
);

-- Idempotent add for existing deployments.
alter table public.avatar_sessions
    add column if not exists heygen_token text;

create index if not exists avatar_sessions_user_active
    on public.avatar_sessions(user_id)
    where status = 'active';

alter table public.avatar_sessions enable row level security;
-- No client policies: sessions are server-only (service role bypasses RLS).

-- ---------------------------------------------------------------------------
-- Get-or-create the entitlement row for a user.
-- ---------------------------------------------------------------------------
create or replace function public.avatar_get_or_create_entitlement(
    p_user_id uuid
) returns public.avatar_entitlements as $$
declare
    v_row public.avatar_entitlements%rowtype;
begin
    if p_user_id is null then
        raise exception 'user_id is required';
    end if;

    insert into public.avatar_entitlements (user_id)
        values (p_user_id)
        on conflict (user_id) do nothing;

    select * into v_row from public.avatar_entitlements where user_id = p_user_id;
    return v_row;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- Start a session atomically.
--
-- Eligibility: free_reveal_used = false (free path) OR wish_balance >= 1 (paid).
--   * free path  → reserve the free reveal (set free_reveal_used = true now,
--                  reverted on refund if the avatar never spoke).
--   * paid path  → deduct 1 wish now (refunded if the avatar never spoke).
--
-- Locking: row-locks the entitlement (FOR UPDATE) so two tabs can't both
-- consume the free reveal or double-spend a wish. Also rejects a start if the
-- user already has an active session (one live session per user).
--
-- Returns: ok, mode, reason, wish_balance, free_reveal_used.
-- ---------------------------------------------------------------------------
create or replace function public.avatar_start_session(
    p_user_id uuid,
    p_session_id text,
    p_duration_seconds integer default 60
) returns table (
    ok boolean,
    mode text,
    reason text,
    wish_balance integer,
    free_reveal_used boolean
) as $$
declare
    v_ent public.avatar_entitlements%rowtype;
    v_active integer;
    v_mode text;
begin
    if p_user_id is null or p_session_id is null then
        return query select false, null::text, 'INVALID_ARGS'::text, null::int, null::boolean;
        return;
    end if;

    -- Ensure a row exists, then lock it for the duration of the transaction.
    perform public.avatar_get_or_create_entitlement(p_user_id);
    select * into v_ent from public.avatar_entitlements
        where user_id = p_user_id
        for update;

    -- One live session per user (guards against concurrent starts).
    select count(*) into v_active from public.avatar_sessions
        where user_id = p_user_id and status = 'active';
    if v_active > 0 then
        return query select false, null::text, 'SESSION_ALREADY_ACTIVE'::text,
            v_ent.wish_balance, v_ent.free_reveal_used;
        return;
    end if;

    if v_ent.free_reveal_used = false then
        v_mode := 'free';
        update public.avatar_entitlements
            set free_reveal_used = true, updated_at = now()
            where user_id = p_user_id;
    elsif v_ent.wish_balance >= 1 then
        v_mode := 'paid';
        update public.avatar_entitlements
            set wish_balance = wish_balance - 1, updated_at = now()
            where user_id = p_user_id;
    else
        return query select false, null::text, 'NO_WISHES'::text,
            v_ent.wish_balance, v_ent.free_reveal_used;
        return;
    end if;

    insert into public.avatar_sessions (
        session_id, user_id, mode, status,
        charged_wish, reserved_free, expires_at
    ) values (
        p_session_id, p_user_id, v_mode, 'active',
        (v_mode = 'paid'), (v_mode = 'free'),
        now() + make_interval(secs => greatest(1, coalesce(p_duration_seconds, 60)))
    );

    select * into v_ent from public.avatar_entitlements where user_id = p_user_id;
    return query select true, v_mode, 'OK'::text, v_ent.wish_balance, v_ent.free_reveal_used;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- Mark that the avatar successfully spoke at least once in this session.
-- After this, end_session will NOT refund (the credit was genuinely consumed).
-- ---------------------------------------------------------------------------
create or replace function public.avatar_mark_spoke(
    p_session_id text
) returns boolean as $$
begin
    update public.avatar_sessions
        set spoke = true
        where session_id = p_session_id and status = 'active';
    return found;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- End a session. Refund automatically if the avatar never spoke (broken /
-- failed session must not burn the free reveal or a paid wish).
--   * reserved_free → revert free_reveal_used to false
--   * charged_wish  → +1 wish_balance
-- Idempotent: only acts while status = 'active'.
-- ---------------------------------------------------------------------------
create or replace function public.avatar_end_session(
    p_session_id text,
    p_force_refund boolean default false
) returns table (
    ended boolean,
    refunded boolean,
    mode text
) as $$
declare
    v_sess public.avatar_sessions%rowtype;
    v_should_refund boolean;
    v_did_refund boolean := false;
begin
    select * into v_sess from public.avatar_sessions
        where session_id = p_session_id
        for update;

    if not found then
        return query select false, false, null::text;
        return;
    end if;

    if v_sess.status = 'ended' then
        return query select false, v_sess.refunded, v_sess.mode;
        return;
    end if;

    -- Refund when the avatar never spoke, or when the caller forces it.
    v_should_refund := (v_sess.spoke = false) or coalesce(p_force_refund, false);

    if v_should_refund and v_sess.refunded = false then
        if v_sess.reserved_free then
            update public.avatar_entitlements
                set free_reveal_used = false, updated_at = now()
                where user_id = v_sess.user_id;
            v_did_refund := true;
        elsif v_sess.charged_wish then
            update public.avatar_entitlements
                set wish_balance = wish_balance + 1, updated_at = now()
                where user_id = v_sess.user_id;
            v_did_refund := true;
        end if;
    end if;

    update public.avatar_sessions
        set status = 'ended',
            ended_at = now(),
            refunded = v_did_refund
        where session_id = p_session_id;

    return query select true, v_did_refund, v_sess.mode;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- Add wishes to a user's balance. Called by the store/checkout flow after a
-- successful wish purchase (30 THB first time, 60 THB after — pricing lives in
-- the store, NOT here). Exposed so the Stripe webhook / fulfillment can grant.
-- ---------------------------------------------------------------------------
create or replace function public.avatar_add_wishes(
    p_user_id uuid,
    p_amount integer
) returns integer as $$
declare
    v_balance integer;
begin
    if p_user_id is null or coalesce(p_amount, 0) <= 0 then
        raise exception 'user_id and positive amount required';
    end if;

    perform public.avatar_get_or_create_entitlement(p_user_id);
    update public.avatar_entitlements
        set wish_balance = wish_balance + p_amount, updated_at = now()
        where user_id = p_user_id
        returning wish_balance into v_balance;

    return v_balance;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- Sweep: force-end sessions that ran past their expiry without a clean stop
-- (e.g. the browser closed). Run from a cron / scheduled function so paid
-- minutes can't leak. Refunds are NOT applied here — by expiry the avatar has
-- already spoken; the minute was used.
-- ---------------------------------------------------------------------------
create or replace function public.avatar_sweep_expired()
returns integer as $$
declare
    v_count integer;
begin
    with expired as (
        update public.avatar_sessions
            set status = 'ended', ended_at = now()
            where status = 'active' and expires_at is not null and expires_at < now()
            returning 1
    )
    select count(*) into v_count from expired;
    return v_count;
end;
$$ language plpgsql security definer;
