-- =====================================================================
-- One-time star-pack purchase grant (Part 1) — webhook-driven, atomic
-- =====================================================================
-- Adds:
--   * stars.has_purchased  — one-time flag for the first-purchase bonus
--     (so the bonus is granted at most once per account).
--   * star_grant_purchase() — atomic grant used by the Stripe webhook (and
--     the success page as an idempotent safety net). Purchased stars are
--     added to the daily pool, which under the v2 economy never expires or
--     resets for authenticated users and is never topped up while > 0 — so
--     purchased stars persist and the free daily star never stacks on them.
--
--     This intentionally AVOIDS plan_stars/addon_stars: those pools are
--     reconciled (and zeroed for non-subscribers) by the subscription logic
--     in /api/stars/get-or-create, which would wipe a one-time purchase.
--
-- Idempotency of re-delivered webhooks / page refreshes is handled by the
-- caller via the UNIQUE billing_transactions.provider_payment_id insert;
-- this function only performs the balance math.
--
-- Idempotent to install. Run on staging first.
-- =====================================================================

begin;

alter table public.stars add column if not exists has_purchased boolean not null default false;

-- Atomic, idempotent one-time pack grant. Claims the purchase by inserting a
-- UNIQUE billing_transactions row keyed on the Stripe checkout session id and
-- applies the star grant in the SAME transaction — so a re-delivered webhook
-- or a /success page refresh can never double-grant, and a grant can never be
-- "claimed" without the balance actually moving (both commit together or
-- neither does).
create or replace function public.star_grant_purchase(
  p_user_id uuid,
  p_session_id text,
  p_stars integer,
  p_first_bonus integer,
  p_amount_cents integer,
  p_currency text,
  p_pack_name text
) returns table (
  status text,
  granted integer,
  first_bonus_applied boolean,
  current_stars integer
) as $$
declare
  v_now timestamptz := now();
  v_stars integer := greatest(0, coalesce(p_stars, 0));
  v_bonus integer := 0;
  v_had_purchased boolean;
  v_granted integer;
  v_current integer;
begin
  if p_user_id is null then
    raise exception 'star_grant_purchase requires an authenticated user';
  end if;
  if p_session_id is null or length(trim(p_session_id)) = 0 then
    raise exception 'star_grant_purchase requires a session id';
  end if;

  -- 1. Claim the purchase. A duplicate session id short-circuits with no grant.
  begin
    insert into public.billing_transactions (
      user_id, type, provider, provider_payment_id,
      amount_cents, currency, reference, status, stars_amount, pack_name
    ) values (
      p_user_id, 'one_time', 'stripe', p_session_id,
      greatest(0, coalesce(p_amount_cents, 0)),
      upper(coalesce(nullif(trim(p_currency), ''), 'USD')),
      'Star pack: ' || coalesce(p_pack_name, 'pack') || ' (' || p_session_id || ')',
      'succeeded', v_stars, p_pack_name
    );
  exception when unique_violation then
    select s.current_stars into v_current from public.stars s where s.user_id = p_user_id;
    return query select 'duplicate'::text, 0, false, coalesce(v_current, 0);
    return;
  end;

  -- 2. Ensure the row exists / is v2-normalized, then read the bonus flag.
  perform public.star_get_or_create(null, p_user_id);
  select coalesce(s.has_purchased, false) into v_had_purchased
    from public.stars s where s.user_id = p_user_id;
  if not v_had_purchased then
    v_bonus := greatest(0, coalesce(p_first_bonus, 0));
  end if;
  v_granted := v_stars + v_bonus;

  -- 3. Apply the grant to the (v2 non-expiring) daily pool.
  update public.stars s
     set daily_stars = greatest(0, coalesce(s.daily_stars, 0)) + v_granted,
         has_purchased = true,
         current_stars = greatest(0, coalesce(s.daily_stars, 0)) + v_granted
                         + coalesce(s.plan_stars, 0) + coalesce(s.addon_stars, 0),
         updated_at = v_now
   where s.user_id = p_user_id
   returning s.current_stars into v_current;

  -- 4. Record the actual granted amount (incl. first bonus) on the txn.
  if v_granted <> v_stars then
    update public.billing_transactions
       set stars_amount = v_granted
     where provider_payment_id = p_session_id;
  end if;

  return query select 'granted'::text, v_granted, (v_bonus > 0), coalesce(v_current, 0);
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.star_grant_purchase(uuid, text, integer, integer, integer, text, text) to authenticated, service_role;

commit;
