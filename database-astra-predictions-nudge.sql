-- Astra: separate "we sent a reminder" from "she asked how it went" (idempotent)
-- Safe to run multiple times.

-- ---------------------------------------------------------------------------
-- `asked_result_at` means she has already put the question to them inside the
-- chat, and the opening turn uses it to avoid asking twice. The daily sweep
-- that emails "how did it go?" is a different event: it is what brings them
-- back so she CAN ask. Writing the sweep into the same column silenced her --
-- the reminder arrived, the person returned, and she said nothing about it.
-- ---------------------------------------------------------------------------
alter table public.astra_predictions
    add column if not exists nudged_at timestamptz;

comment on column public.astra_predictions.nudged_at is
    'When the due-date sweep reminded them. One nudge per prediction; distinct from asked_result_at, which is when she asked in the chat.';

-- The sweep scans for due, unanswered, never-nudged rows across all subjects,
-- so it wants an index that is not scoped to one person.
create index if not exists astra_predictions_due_sweep
    on public.astra_predictions (due_date)
    where outcome is null and nudged_at is null;
