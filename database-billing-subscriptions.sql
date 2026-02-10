-- Create billing_subscriptions table to track recurring products
create table if not exists public.billing_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    provider text not null default 'stripe',
    provider_subscription_id text unique,
    provider_customer_id text,
    plan text,
    pending_plan text,
    pending_change_at timestamptz,
    status text not null default 'active',
    current_period_start timestamptz,
    current_period_end timestamptz,
    cancel_at_period_end boolean not null default false,
    addon_stars integer not null default 0,
    addon_amount_usd numeric not null default 0,
    addon_items jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Index for faster user-based lookups
create index if not exists idx_billing_subscriptions_user_id on public.billing_subscriptions(user_id);

-- Enable Row Level Security
alter table public.billing_subscriptions enable row level security;

-- Policy: users can view their own subscriptions
drop policy if exists "Users can view own subscriptions" on public.billing_subscriptions;
create policy "Users can view own subscriptions" on public.billing_subscriptions
    for select using (auth.uid() = user_id);

-- Add subscription_id column to billing_transactions if it doesn't exist
do $$ 
begin
    if not exists (
        select 1 from information_schema.columns 
        where table_name='billing_transactions' and column_name='subscription_id'
    ) then
        alter table public.billing_transactions 
        add column subscription_id uuid references public.billing_subscriptions(id) on delete set null;
    end if;
end $$;

