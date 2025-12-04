-- Add stars_amount and pack_name columns to billing_transactions
alter table public.billing_transactions
add column if not exists stars_amount integer,
add column if not exists pack_name text;

-- Add comment for documentation
comment on column public.billing_transactions.stars_amount is 'Number of stars purchased (null for infinity packs)';
comment on column public.billing_transactions.pack_name is 'Name of the star pack purchased';

