-- Add addon and customer tracking to billing_subscriptions
alter table public.billing_subscriptions
    add column if not exists provider_customer_id text,
    add column if not exists addon_stars integer not null default 0,
    add column if not exists addon_amount_usd numeric not null default 0,
    add column if not exists addon_items jsonb not null default '[]'::jsonb;

comment on column public.billing_subscriptions.provider_customer_id is 'Stripe customer id';
comment on column public.billing_subscriptions.addon_stars is 'Total add-on stars per billing period';
comment on column public.billing_subscriptions.addon_amount_usd is 'Total add-on price per period (USD)';
comment on column public.billing_subscriptions.addon_items is 'JSON list of add-on items';
