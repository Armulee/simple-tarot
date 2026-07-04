-- Migration: refill notifications — sweep matured 5-hour batch refills.
--
-- The 5-star batch refill is applied lazily by the star RPCs when the user
-- next visits. To notify users the moment their refill lands (in-app
-- notification + reminder email), a scheduled job (see
-- app/api/stars/refill-sweep + vercel.json cron) applies matured refills
-- proactively via the RPC below and then notifies each refilled user.
--
-- Also prepares the "has the mobile app" flag: when true, the reminder email
-- is skipped (push will cover it once the mobile app exists). False for now —
-- there is no mobile app yet.
--
-- Idempotent: safe to run multiple times.

-- 1. Mobile-app flag (future: set true when the user installs the app).
alter table public.user_settings
  add column if not exists has_mobile_app boolean not null default false;

-- 2. Sweep: batch-refill every authenticated row whose 5-hour timer has
--    matured, exactly mirroring _star_apply_refill's lazy semantics
--    (below cap + anchor older than 5 hours → jump straight to 5).
--    Returns the refilled user ids so the caller can notify them.
--    daily_last_refill_at is intentionally left unchanged: at cap the anchor
--    is unused, and star_spend re-anchors on the next drop below the cap.
create or replace function public.star_sweep_matured_refills()
returns table (user_id uuid) as $$
  with matured as (
    update public.stars s
       set daily_stars = 5,
           current_stars = 5 + coalesce(s.plan_stars, 0) + coalesce(s.addon_stars, 0),
           updated_at = now()
     where s.user_id is not null
       and s.daily_stars < 5
       and public._star_coerce_refill_ts(s.daily_last_refill_at, now()) + interval '5 hours' <= now()
     returning s.user_id
  )
  select user_id from matured;
$$ language sql security definer;

-- Server-only: the cron route calls this with the service role.
revoke all on function public.star_sweep_matured_refills() from public;
revoke all on function public.star_sweep_matured_refills() from anon;
revoke all on function public.star_sweep_matured_refills() from authenticated;
grant execute on function public.star_sweep_matured_refills() to service_role;
