-- Migration: Remove infinity stars support
-- This migration drops legacy infinity-related columns and indexes.

alter table public.stars
  drop column if exists is_infinity,
  drop column if exists infinity_expires_at,
  drop column if exists last_currency_before_infinity;

drop index if exists idx_stars_infinity_expires_at;
