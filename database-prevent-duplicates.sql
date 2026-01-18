-- Migration: Prevent Duplicate Billing Transactions
-- This migration cleans up existing duplicate transactions and adds a unique constraint

-- 1. Clean up existing duplicate transactions
-- We keep the earliest record for each provider_payment_id (Stripe session ID)
DELETE FROM public.billing_transactions
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY provider_payment_id 
                   ORDER BY created_at ASC
               ) as row_num
        FROM public.billing_transactions
        WHERE provider_payment_id IS NOT NULL
    ) t
    WHERE t.row_num > 1
);

-- 2. Add unique constraint to provider_payment_id
-- This will prevent multiple records for the same Stripe checkout session
-- In Postgres, UNIQUE constraints allow multiple NULL values, so manual transactions are unaffected
ALTER TABLE public.billing_transactions
DROP CONSTRAINT IF EXISTS billing_transactions_provider_payment_id_unique;

ALTER TABLE public.billing_transactions
ADD CONSTRAINT billing_transactions_provider_payment_id_unique UNIQUE (provider_payment_id);



