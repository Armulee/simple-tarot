# 🔮 Askingfate — The AI Fortune Web Experience

**Askingfate** is an intelligent, interactive web platform that reveals your destiny through modern AI-powered divination.  
It unites traditional fortune systems such as **Tarot, Astrology, Numerology, Namelogy, and Palmistry** — all interpreted through an advanced AI oracle that delivers personalized, story-like insights in seconds.

---

## 🌟 Overview

Askingfate reimagines ancient mysticism through artificial intelligence.  
Users can explore their **life paths, fate patterns, lucky symbols, and fated relationships** — all interpreted through GPT-driven spiritual reasoning combined with astrological and numerological logic.

Unlike typical fortune-telling apps, Askingfate generates **emotionally resonant readings** that blend symbolic meaning with AI storytelling for a magical, modern experience.

---

## 🔮 Features

| Category               | Description                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| 🃏 **Tarot Reading**   | Draw cards and let the AI oracle reveal your destiny through traditional archetypes.        |
| ☀️ **Birth Chart**     | Generate a complete astrological natal chart with AI-guided planetary interpretation.       |
| 🌙 **Horoscope**       | Get daily and monthly forecasts based on your zodiac and transits.                          |
| 🔢 **Numerology**      | Discover your life path, expression, and destiny numbers through mathematical spirituality. |
| 🪶 **Namelogy**        | Analyze your name’s vibration and meaning through AI linguistics and numerology.            |
| 🎨 **Lucky Colors**    | Find aura colors that enhance balance, confidence, and attraction.                          |
| 💞 **Fated Relations** | Compare two people’s charts to explore karmic and romantic compatibility.                   |
| ✋ **Palmistry**       | Upload or draw your palm lines — AI detects patterns and narrates your life story.          |

---

## ⚙️ Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (Full-stack React Framework)
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage)
- **AI Engine:** GPT-based tarot & astrology interpretation
- **Analytics:** [Vercel Analytics](https://vercel.com/analytics)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **Data Sources:** Ephemeris API (Astrology), internal tarot & numerology dataset

---

## 🧭 Core Philosophy

> “Where curiosity meets destiny.”

Askingfate bridges **ancient divination and artificial intelligence**, offering guidance that’s personal, emotional, and beautifully visualized.  
It’s not just a reading — it’s an **experience of self-reflection, prediction, and wonder.**

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/askingfate.git
cd askingfate
```

### 2. Privacy alias vault (encrypted PII)

Signed-in users get cross-device unmasking of redacted PII (e.g. `[Person_0]` resolves back to the original name) because the alias map is persisted in `public.privacy_aliases` as AES-256-GCM ciphertext, encrypted with a per-user key derived from a single server-side master secret.

1. Generate a 32-byte base64 master key and set it in `.env`:

    ```bash
    openssl rand -base64 32
    ```

    ```env
    PRIVACY_ENCRYPTION_MASTER_KEY=<paste-output-here>
    ```

2. Apply the schema (idempotent):

    ```bash
    psql "$DATABASE_URL" -f database-privacy-aliases.sql
    ```

If `PRIVACY_ENCRYPTION_MASTER_KEY` is missing, `/api/privacy-aliases` returns 500 and the client silently keeps its existing sessionStorage-only behavior — no crash, no plaintext fallback. Rotating the master key invalidates every existing ciphertext, so reserve the `key_version` column on `privacy_aliases` for any future rotation work.

### 3. Admins' own readings stay out of the admin dashboard

Admins are the people testing the product, so their readings are real `chat_sessions` rows that would inflate every admin number. The admin API leaves out every user id in the `admins` table — the same list `requireAdmin()` authorises against — across the interpretations list, the metric cards, the activity chart, and every analytics RPC.

There is nothing to configure: adding a row to `admins` both grants dashboard access and takes that person's readings out of the numbers. Anonymous readings are never filtered, and an empty `admins` table excludes nothing.

Apply the analytics schema so the RPCs accept the exclusion argument (idempotent):

```bash
psql "$DATABASE_URL" -f database-admin-analytics.sql
```

A call that a database rejects for not knowing the argument is retried without it, so an un-migrated database keeps working (un-filtered, with a warning in the server log) until the file above is applied.

### 4. If the admin dashboard says "Failed to load metrics."

Every section fed by the analytics RPCs (Data totals, cohort retention, active users, returning users, reading behaviour) reads through `database-admin-analytics.sql`. The charts directly under the Data cards query tables instead, so **a page where those charts render but every analytics section fails means the RPCs are missing from the database, not that the site is broken.**

The red box prints the reason underneath the generic message — a `PGRST202` there means the function isn't in the schema cache, and the fix is to apply the file:

```bash
psql "$DATABASE_URL" -f database-admin-analytics.sql
```

To see what the database actually has:

```sql
select p.oid::regprocedure
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname like 'admin_analytics%'
 order by 1;
```
