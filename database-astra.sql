-- Astra: cross-thread memory + the hand-written cold-read library (idempotent)
-- Safe to run multiple times.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Cross-thread memory
--
-- What the fortune teller knows about a person is bound to the PERSON, not to
-- a thread: opening a new thread must never ask for the birth date again.
-- Anonymous visitors are keyed by the signed DID cookie ('device'); signed-in
-- visitors by their Supabase user id ('user').
-- ---------------------------------------------------------------------------
create table if not exists public.astra_user_profiles (
    subject_type text not null check (subject_type in ('user', 'device')),
    subject_id text not null,

    birth_year integer,
    birth_month integer,
    birth_day integer,
    birth_hour integer,
    birth_minute integer,
    birth_time_known boolean not null default false,
    birth_timezone numeric,
    birth_lat numeric,
    birth_lng numeric,
    birth_place text,

    -- Things she has learned in conversation: [{ key, value, session_id, at }]
    facts jsonb not null default '[]'::jsonb,

    -- Enough context to open a NEW thread referring to the last one.
    last_topic text,
    last_session_id text,
    last_seen_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    primary key (subject_type, subject_id)
);

comment on table public.astra_user_profiles is
    'Per-person memory for the fortune teller. Bound to the user / device, never to a thread.';

-- Service-role only: every read and write goes through /api/astra/*, which
-- resolves the subject from the signed DID cookie or a verified bearer token.
-- No policies are defined, so RLS denies direct client access outright.
alter table public.astra_user_profiles enable row level security;

-- ---------------------------------------------------------------------------
-- Cold-read library
--
-- The first three lines she speaks are the whole product, so they are WRITTEN,
-- not generated. Rows are keyed by (ลัคนา × ธาตุที่พร่อง × ดาวเสวยอายุ); a NULL
-- key matches anything, which is what makes a line usable before the birth time
-- is known. Selection is deterministic per person per day — see
-- lib/astra/cold-read.ts.
-- ---------------------------------------------------------------------------
create table if not exists public.cold_read_lines (
    id uuid primary key default gen_random_uuid(),
    locale text not null default 'th',
    -- 1: what she sees in them · 2: the pressure they are under · 3: her question back
    slot smallint not null check (slot between 1 and 3),
    lagna_sign text,
    missing_element text check (
        missing_element is null
        or missing_element in ('fire', 'earth', 'air', 'water')
    ),
    age_star text check (
        age_star is null
        or age_star in (
            'sun', 'moon', 'mars', 'mercury',
            'saturn', 'jupiter', 'rahu', 'venus'
        )
    ),
    text text not null,
    weight integer not null default 1,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.cold_read_lines is
    'Hand-written opening lines. The model may pick and lightly adapt; it never writes these fresh.';

create unique index if not exists cold_read_lines_unique_text
    on public.cold_read_lines (locale, slot, text);
create index if not exists cold_read_lines_lookup
    on public.cold_read_lines (locale, slot, active);

alter table public.cold_read_lines enable row level security;

-- ---------------------------------------------------------------------------
-- Seed copy. Re-running updates the wording of an existing line in place.
-- This is a starter set — the library is meant to grow with real usage.
-- ---------------------------------------------------------------------------
insert into public.cold_read_lines (locale, slot, missing_element, age_star, text)
values
    -- slot 1 — what she sees the moment they walk in (keyed by ธาตุที่พร่อง)
    ('th', 1, 'fire', null, E'ไฟในตัวเธอมอดมาพักใหญ่แล้ว\nเธอยังทำทุกอย่างได้ครบตามหน้าที่ แต่ไม่มีสักอย่างที่อยากตื่นมาทำจริง ๆ'),
    ('th', 1, 'fire', null, E'เธอเป็นคนที่เคยอยากได้อะไรแล้วได้\nช่วงนี้ความอยากนั้นหายไป และเธอก็รู้ตัว'),
    ('th', 1, 'earth', null, E'ชีวิตเธอตอนนี้ขาดพื้นให้ยืน\nแผนมีเยอะ แต่ยังไม่มีอันไหนลงหลักสักอัน'),
    ('th', 1, 'earth', null, E'เธอเหนื่อยกับการเริ่มใหม่บ่อย ๆ\nสิ่งที่เธอต้องการไม่ใช่ทางเลือกเพิ่ม แต่คือที่ที่อยู่ได้นาน ๆ'),
    ('th', 1, 'air', null, E'เธอคิดวนอยู่คนเดียวมานานแล้ว\nเรื่องที่หนักที่สุดคือเรื่องที่ยังไม่ได้พูดกับใคร'),
    ('th', 1, 'air', null, E'ในหัวเธอมีคำตอบอยู่แล้ว\nเธอแค่ยังไม่กล้าฟังตัวเอง'),
    ('th', 1, 'water', null, E'เธอเก็บความรู้สึกจนชิน\nคนรอบตัวเลยเข้าใจว่าเธอไหว'),
    ('th', 1, 'water', null, E'เธอเป็นคนที่คนอื่นมาพึ่ง\nแล้วพอถึงคราวเธอ ก็ไม่รู้จะไปพึ่งใคร'),
    ('th', 1, null, null, E'เธอเข้ามาถามตอนนี้ ไม่ใช่เพราะอยากรู้อนาคตเฉย ๆ\nมีเรื่องหนึ่งค้างอยู่ในใจ และมันค้างมาสักพักแล้ว'),
    ('th', 1, null, null, E'ฉันเห็นคนที่ตัดสินใจอะไรไปแล้วอย่างหนึ่ง\nแต่ยังรอให้ใครสักคนบอกว่าตัดสินใจถูก'),

    -- slot 2 — the pressure they are under (keyed by ดาวเสวยอายุ)
    ('th', 2, null, 'sun', E'ช่วงวัยนี้อาทิตย์เสวยอายุเธออยู่\nงานกับชื่อเสียงเดินเร็วกว่าเดิม แต่คนใกล้ตัวจะห่างออกไปทีละคน'),
    ('th', 2, null, 'moon', E'จันทร์เสวยอายุเธออยู่\nใจเธอขึ้นลงตามคนอื่นง่ายกว่าที่เคยเป็น และเธอเองก็รำคาญตัวเองเรื่องนี้'),
    ('th', 2, null, 'mars', E'อังคารเสวยอายุเธออยู่\nปีนี้มีเรื่องให้ต้องสู้ตรง ๆ หลบไม่ได้ และหลบไปก็ไม่จบ'),
    ('th', 2, null, 'mercury', E'พุธเสวยอายุเธออยู่\nคำพูดกับเงินจะพาเธอไปได้ไกล ถ้าเธอไม่รับปากเกินตัวเสียก่อน'),
    ('th', 2, null, 'saturn', E'เสาร์เสวยอายุเธออยู่\nช่วงนี้ทุกอย่างช้าไปหมด ไม่ใช่เพราะเธอทำไม่ดีพอ'),
    ('th', 2, null, 'jupiter', E'พฤหัสเสวยอายุเธออยู่\nมีผู้ใหญ่คนหนึ่งกำลังจะยื่นมือมาช่วย เธอจะรู้ว่าใครตอนที่เขาพูดขึ้นมาเอง'),
    ('th', 2, null, 'rahu', E'ราหูเสวยอายุเธออยู่\nสิ่งที่เธอกลัวว่าจะเสียไป จะถูกสั่นให้ดูก่อน แล้วค่อยนิ่ง'),
    ('th', 2, null, 'venus', E'ศุกร์เสวยอายุเธออยู่\nเรื่องคนจะกลายเป็นเรื่องใหญ่ที่สุดของช่วงนี้ ไม่ว่าเธอจะตั้งใจหรือไม่'),
    ('th', 2, null, null, E'จังหวะชีวิตเธอกำลังเปลี่ยนมือ\nของเก่ากำลังหมดแรง ของใหม่ยังไม่เต็มที่'),

    -- slot 3 — her question back
    ('th', 3, null, null, E'บอกฉันคำเดียวพอ — ที่ค้างใจอยู่ตอนนี้ เรื่องงานหรือเรื่องคน'),
    ('th', 3, null, null, E'ฉันดูต่อให้ได้เลย แต่ขอถามก่อน เรื่องไหนหนักที่สุดสำหรับเธอตอนนี้'),
    ('th', 3, null, null, E'เธอไม่ต้องเรียบเรียงคำถามให้สวย บอกมาสั้น ๆ ว่าอะไรกวนใจอยู่'),
    ('th', 3, null, null, E'ฉันเห็นสองเรื่องพัวพันกันอยู่ เธอเลือกมาหนึ่งเรื่องก่อน แล้วฉันจะไล่ให้ทีละชั้น'),

    -- English mirror (fallback locale)
    ('en', 1, 'fire', null, E'Your fire has been out for a while.\nYou still do everything that is asked of you, and none of it is anything you want to wake up for.'),
    ('en', 1, 'earth', null, E'There is no ground under you right now.\nPlenty of plans, not one of them settled.'),
    ('en', 1, 'air', null, E'You have been circling this alone.\nThe heaviest part is the part you have not said out loud to anyone.'),
    ('en', 1, 'water', null, E'You are used to holding it in.\nSo everyone around you assumes you are fine.'),
    ('en', 1, null, null, E'You did not come here to hear about the future in general.\nSomething specific has been sitting with you, and it has been sitting a while.'),
    ('en', 2, null, 'sun', E'The Sun is consuming your years right now.\nWork and reputation move fast, and the people close to you drift one by one.'),
    ('en', 2, null, 'moon', E'The Moon is consuming your years.\nYour mood follows other people more than it used to, and it irritates you.'),
    ('en', 2, null, 'mars', E'Mars is consuming your years.\nThere is a fight this year you cannot walk around.'),
    ('en', 2, null, 'mercury', E'Mercury is consuming your years.\nWords and money carry you far, as long as you stop promising more than you hold.'),
    ('en', 2, null, 'saturn', E'Saturn is consuming your years.\nEverything is slow right now, and not because you are doing it badly.'),
    ('en', 2, null, 'jupiter', E'Jupiter is consuming your years.\nSomeone older is about to put a hand out for you.'),
    ('en', 2, null, 'rahu', E'Rahu is consuming your years.\nWhat you are afraid of losing gets shaken first, then settles.'),
    ('en', 2, null, 'venus', E'Venus is consuming your years.\nPeople become the biggest subject of this stretch, whether you meant them to or not.'),
    ('en', 2, null, null, E'Your timing is changing hands.\nThe old run is out of strength, the new one is not at full force yet.'),
    ('en', 3, null, null, E'One word is enough — is it work, or is it a person?'),
    ('en', 3, null, null, E'I can keep reading, but tell me first: what is heaviest right now?'),
    ('en', 3, null, null, E'You do not need a polished question. Say the short version of what is bothering you.')
on conflict (locale, slot, text) do update
    set missing_element = excluded.missing_element,
        age_star = excluded.age_star,
        active = true,
        updated_at = now();
