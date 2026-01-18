-- Migration: Prioritize billing_subscriptions for infinity stars detection
-- This migration updates the star functions to dynamically check for active subscriptions
-- and ensures all functions return the required fields for the frontend.

-- 1. Ensure columns exist in the stars table
ALTER TABLE public.stars
  ADD COLUMN IF NOT EXISTS is_infinity boolean not null default false,
  ADD COLUMN IF NOT EXISTS infinity_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_currency_before_infinity text;

-- 2. Drop existing functions to allow changing return signatures cleanly
DROP FUNCTION IF EXISTS public.star_get_or_create(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.star_spend(text, integer, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.star_add(text, integer, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.star_set(text, integer, uuid, boolean, timestamptz, text) CASCADE;
DROP FUNCTION IF EXISTS public.star_set(text, integer, uuid) CASCADE;

-- 3. Re-create star_get_or_create with dynamic subscription check
CREATE OR REPLACE FUNCTION public.star_get_or_create(
  p_anon_device_id text,
  p_user_id uuid default null
) RETURNS TABLE (
  id uuid,
  user_id uuid,
  anon_device_id text,
  current_stars integer,
  last_refill_at timestamptz,
  first_login_bonus_granted boolean,
  first_time_login_grant boolean,
  is_infinity boolean,
  infinity_expires_at timestamptz,
  last_currency_before_infinity text
) AS $$
DECLARE
  v_state public.stars%rowtype;
  v_cap integer := CASE WHEN p_user_id IS NULL THEN 5 ELSE 12 END;
  v_now timestamptz := now();
  v_new_current integer;
  v_new_last timestamptz;
  v_sub_active boolean := false;
  v_sub_expires timestamptz := null;
BEGIN
  IF p_user_id IS NOT NULL THEN
    -- Check for active or still-effective canceled subscription
    SELECT EXISTS (
      SELECT 1 FROM public.billing_subscriptions bs
      WHERE bs.user_id = p_user_id
        AND (status IN ('active', 'trialing')
             OR (status = 'canceled' AND current_period_end > v_now))
    ) INTO v_sub_active;

    IF v_sub_active THEN
      SELECT max(current_period_end) FROM public.billing_subscriptions bs
      WHERE bs.user_id = p_user_id
        AND (status IN ('active', 'trialing')
             OR (status = 'canceled' AND current_period_end > v_now))
      INTO v_sub_expires;
    END IF;

    -- Fetch or create user row
    SELECT * INTO v_state FROM public.stars s WHERE s.user_id = p_user_id LIMIT 1;
    IF NOT FOUND THEN
      -- Try to attach anon row if available
      IF p_anon_device_id IS NOT NULL AND length(p_anon_device_id) > 0 THEN
        SELECT * INTO v_state
          FROM public.stars s
         WHERE s.anon_device_id = p_anon_device_id AND s.user_id IS NULL
         LIMIT 1;
        IF FOUND THEN
          UPDATE public.stars
             SET user_id = p_user_id,
                 updated_at = v_now
           WHERE public.stars.id = v_state.id
           RETURNING * INTO v_state;
        ELSE
          INSERT INTO public.stars (
            user_id,
            current_stars,
            last_refill_at,
            first_login_bonus_granted,
            first_time_login_grant,
            updated_at
          )
          VALUES (p_user_id, 12, v_now, true, true, v_now)
          RETURNING * INTO v_state;
        END IF;
      ELSE
        INSERT INTO public.stars (
          user_id,
          current_stars,
          last_refill_at,
          first_login_bonus_granted,
          first_time_login_grant,
          updated_at
        )
        VALUES (p_user_id, 12, v_now, true, true, v_now)
        RETURNING * INTO v_state;
      END IF;
    END IF;

    -- If one-time infinity expired, reset flags in stars table
    IF v_state.is_infinity = true
       AND v_state.infinity_expires_at IS NOT NULL
       AND v_state.infinity_expires_at <= v_now THEN
      UPDATE public.stars
         SET is_infinity = false,
             infinity_expires_at = null,
             updated_at = v_now
       WHERE public.stars.id = v_state.id
       RETURNING * INTO v_state;
    END IF;

    -- Apply refill logic (skip if infinity active via subscription or one-time)
    IF v_sub_active
       OR (v_state.is_infinity = true
           AND (v_state.infinity_expires_at IS NULL OR v_state.infinity_expires_at > v_now)) THEN
      v_new_current := v_state.current_stars;
      v_new_last := v_state.last_refill_at;
    ELSE
      SELECT new_current, coalesce(new_last_refill, v_state.last_refill_at)
        INTO v_new_current, v_new_last
        FROM public._star_apply_refill(v_state.current_stars, v_state.last_refill_at, v_now, v_cap, 2);
    END IF;

    UPDATE public.stars
       SET current_stars = v_new_current,
           last_refill_at = v_new_last,
           updated_at = v_now
     WHERE public.stars.id = v_state.id
     RETURNING * INTO v_state;
  ELSE
    -- Anonymous flow
    IF p_anon_device_id IS NULL OR length(p_anon_device_id) = 0 THEN
      RAISE EXCEPTION 'anon device id required for anonymous state';
    END IF;

    SELECT * INTO v_state
      FROM public.stars s
     WHERE s.anon_device_id = p_anon_device_id AND s.user_id IS NULL
     LIMIT 1;
    IF NOT FOUND THEN
      INSERT INTO public.stars (anon_device_id, current_stars, last_refill_at, updated_at)
      VALUES (p_anon_device_id, 5, v_now, v_now)
      RETURNING * INTO v_state;
    END IF;

    -- Daily reset for anon (Bangkok timezone)
    IF (v_state.last_refill_at AT TIME ZONE 'Asia/Bangkok')::date
       < (v_now AT TIME ZONE 'Asia/Bangkok')::date THEN
      UPDATE public.stars
         SET current_stars = 5,
             last_refill_at = v_now,
             updated_at = v_now
       WHERE public.stars.id = v_state.id
       RETURNING * INTO v_state;
    END IF;
  END IF;

  -- Return everything, overriding infinity fields with subscription status if active
  RETURN QUERY SELECT
    v_state.id,
    v_state.user_id,
    v_state.anon_device_id,
    v_state.current_stars,
    v_state.last_refill_at,
    v_state.first_login_bonus_granted,
    v_state.first_time_login_grant,
    coalesce(v_sub_active OR v_state.is_infinity, false),
    CASE WHEN v_sub_active THEN v_sub_expires ELSE v_state.infinity_expires_at END,
    v_state.last_currency_before_infinity;
END;
$$ language plpgsql security definer set search_path = public;

-- 4. Re-create star_spend with infinity fields in return
CREATE OR REPLACE FUNCTION public.star_spend(
  p_anon_device_id text,
  p_amount integer,
  p_user_id uuid default null
) RETURNS TABLE (
  ok boolean,
  current_stars integer,
  last_refill_at timestamptz,
  is_infinity boolean,
  infinity_expires_at timestamptz,
  last_currency_before_infinity text
) AS $$
DECLARE
  v_row record;
  v_cap integer := case when p_user_id is null then 5 else 12 end;
  v_now timestamptz := now();
  v_new_current integer;
  v_new_last timestamptz;
  v_prev integer;
BEGIN
  IF coalesce(p_amount, 0) <= 0 THEN
    RETURN QUERY SELECT false, null::int, null::timestamptz, false, null::timestamptz, null::text;
  END IF;

  SELECT * FROM public.star_get_or_create(p_anon_device_id, p_user_id) INTO v_row;
  v_prev := v_row.current_stars;

  -- If dynamic infinity is active, allow spending without deduction
  IF v_row.is_infinity = true AND (v_row.infinity_expires_at IS NULL OR v_row.infinity_expires_at > v_now) THEN
    RETURN QUERY SELECT true, v_row.current_stars, v_row.last_refill_at, v_row.is_infinity, v_row.infinity_expires_at, v_row.last_currency_before_infinity;
    RETURN;
  END IF;

  -- Normal star spending logic
  IF p_user_id IS NOT NULL THEN
    SELECT new_current, coalesce(new_last_refill, v_row.last_refill_at)
      INTO v_new_current, v_new_last
      FROM public._star_apply_refill(v_row.current_stars, v_row.last_refill_at, v_now, v_cap, 2);
  ELSE
    v_new_current := v_row.current_stars;
    v_new_last := v_row.last_refill_at;
    IF (v_row.last_refill_at AT TIME ZONE 'Asia/Bangkok')::date < (v_now AT TIME ZONE 'Asia/Bangkok')::date THEN
      v_new_current := 5;
      v_new_last := v_now;
    END IF;
  END IF;

  IF v_new_current < p_amount THEN
    RETURN QUERY SELECT false, v_new_current, v_new_last, false, v_row.infinity_expires_at, v_row.last_currency_before_infinity;
    RETURN;
  END IF;

  v_new_current := v_new_current - p_amount;
  IF p_user_id IS NOT NULL THEN
    IF v_prev >= v_cap AND v_new_current < v_cap THEN
      v_new_last := v_now;
    END IF;
  END IF;

  UPDATE public.stars
     SET current_stars = v_new_current,
         last_refill_at = v_new_last,
         updated_at = v_now
   WHERE public.stars.id = v_row.id;

  RETURN QUERY SELECT true, v_new_current, v_new_last, false, v_row.infinity_expires_at, v_row.last_currency_before_infinity;
END;
$$ language plpgsql security definer set search_path = public;

-- 5. Re-create star_add with infinity fields in return
CREATE OR REPLACE FUNCTION public.star_add(
  p_anon_device_id text,
  p_amount integer,
  p_user_id uuid default null
) RETURNS TABLE (
  current_stars integer,
  last_refill_at timestamptz,
  is_infinity boolean,
  infinity_expires_at timestamptz,
  last_currency_before_infinity text
) AS $$
DECLARE
  v_row record;
  v_now timestamptz := now();
  v_curr integer;
  v_last timestamptz;
BEGIN
  SELECT * FROM public.star_get_or_create(p_anon_device_id, p_user_id) INTO v_row;

  UPDATE public.stars
     SET current_stars = v_row.current_stars + greatest(0, coalesce(p_amount, 0)),
         updated_at = v_now
   WHERE public.stars.id = v_row.id
   RETURNING public.stars.current_stars, public.stars.last_refill_at INTO v_curr, v_last;

  RETURN QUERY SELECT v_curr, v_last, v_row.is_infinity, v_row.infinity_expires_at, v_row.last_currency_before_infinity;
END;
$$ language plpgsql security definer set search_path = public;

-- 6. Re-create star_set with all fields
CREATE OR REPLACE FUNCTION public.star_set(
  p_anon_device_id text,
  p_new_balance integer,
  p_user_id uuid default null,
  p_is_infinity boolean default false,
  p_infinity_expires_at timestamptz default null,
  p_last_currency text default null
) RETURNS TABLE (
  current_stars integer,
  last_refill_at timestamptz,
  is_infinity boolean,
  infinity_expires_at timestamptz,
  last_currency_before_infinity text
) AS $$
DECLARE
  v_row record;
  v_now timestamptz := now();
  v_curr integer;
  v_last timestamptz;
  v_is_infinity boolean;
  v_expires_at timestamptz;
  v_last_currency text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'star_set requires authenticated user';
  END IF;

  SELECT * FROM public.star_get_or_create(p_anon_device_id, p_user_id) INTO v_row;

  UPDATE public.stars
     SET current_stars = greatest(0, coalesce(p_new_balance, 0)),
         is_infinity = coalesce(p_is_infinity, public.stars.is_infinity),
         infinity_expires_at = CASE
           WHEN p_is_infinity IS NOT NULL THEN p_infinity_expires_at
           ELSE public.stars.infinity_expires_at
         END,
         last_currency_before_infinity = coalesce(p_last_currency, public.stars.last_currency_before_infinity),
         updated_at = v_now
   WHERE public.stars.id = v_row.id
   RETURNING public.stars.current_stars,
             public.stars.last_refill_at,
             public.stars.is_infinity,
             public.stars.infinity_expires_at,
             public.stars.last_currency_before_infinity
     INTO v_curr, v_last, v_is_infinity, v_expires_at, v_last_currency;

  RETURN QUERY SELECT v_curr, v_last, v_is_infinity, v_expires_at, v_last_currency;
END;
$$ language plpgsql security definer set search_path = public;
