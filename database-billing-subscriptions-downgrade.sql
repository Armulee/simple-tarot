-- Add pending downgrade tracking to billing_subscriptions
alter table public.billing_subscriptions
    add column if not exists pending_plan text,
    add column if not exists pending_change_at timestamptz;

comment on column public.billing_subscriptions.pending_plan is 'Plan key to apply at period end (scheduled downgrade)';
comment on column public.billing_subscriptions.pending_change_at is 'Timestamp when pending_plan should take effect';
