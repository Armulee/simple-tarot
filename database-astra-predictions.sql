-- Astra: the answers she commits to, and the day she comes back to ask (idempotent)
-- Safe to run multiple times.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- A fortune teller who never checks her own work is not accountable to
-- anything. Every OUTCOME and TIMING answer is written down with the date she
-- said it would show, so she can come back and ask how it went, and so asking
-- the same question twice in a day returns the SAME answer instead of a
-- reshuffle.
-- ---------------------------------------------------------------------------
create table if not exists public.astra_predictions (
    id uuid primary key default gen_random_uuid(),

    subject_type text not null check (subject_type in ('user', 'device')),
    subject_id text not null,
    session_id text,

    -- hash(subject + normalized question + local date). Unique per subject, so
    -- a repeat of the same question on the same day reads the stored answer.
    seed text not null,
    answer_id text not null,

    intent text not null check (
        intent in ('IDENTITY', 'TIMING', 'OUTCOME', 'AUSPICIOUS_DATE')
    ),
    topic text not null,
    guardrail text,
    question text not null,

    -- What she committed to, and the bubbles she actually said it in.
    verdict text not null,
    bubbles jsonb not null default '[]'::jsonb,
    -- The computed values the answer was built from (the proof layer reads this).
    basis jsonb not null default '{}'::jsonb,

    -- When the answer said it would show, and how it turned out.
    due_date date,
    asked_result_at timestamptz,
    outcome text check (outcome in ('hit', 'miss', 'unclear')),
    outcome_note text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.astra_predictions is
    'Answers she stands behind: same question same day returns the same row, and a due date brings her back to ask how it went.';

create unique index if not exists astra_predictions_seed
    on public.astra_predictions (subject_type, subject_id, seed);
create index if not exists astra_predictions_due
    on public.astra_predictions (subject_type, subject_id, due_date)
    where outcome is null;

-- Service-role only: reads and writes go through /api/astra/*, which resolves
-- the subject from the signed DID cookie or a verified bearer token.
alter table public.astra_predictions enable row level security;
