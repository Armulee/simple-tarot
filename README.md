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
