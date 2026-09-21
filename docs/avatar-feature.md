# Immerse mode — the talking fortune teller on `/`

The landing page is a full-screen AI fortune teller (Astra) you type or speak
to, who answers back with a **lip-synced talking avatar** — real audio, real
mouth movement — driven by **our own LLM** (HeyGen only speaks the text we send).
Built on HeyGen **LiveAvatar / Lite mode** (bring-your-own-LLM) over
**WebRTC / LiveKit**.

The original text-first landing is still there as **legacy mode**, behind the
floating button at the bottom right. Mode is stored in
`localStorage["askingfate_landing_mode"]` (`lib/landing-mode-storage.ts`) and
can be forced for one navigation with `?mode=immerse` / `?mode=legacy`.

> There is no `/avatar` route any more — immerse **is** the landing page.
> `components/question-input.tsx`'s avatar toggle hands its question over as
> `/?ask={chatSessionId}`.

## Architecture

```
[Browser /]                  [app/api/avatar/* (server, holds HEYGEN_API_KEY)]      [HeyGen]
  enter page ── poster shown immediately (idle), no live session yet
  signed out ─ send ─▶ sign-in dialog. NO request is made. An anonymous visit costs nothing.
  ask question ─ POST /session ─▶ auth + gating → create_token + streaming.new ─▶ {session_id, access_token, wss url}
  ◀── {access_token, url, session_id, mode}  (API key NEVER sent to client)
  connect LiveKit (livekit-client) → render <video>
            ── POST /speak {question, locale} ─▶ OUR LLM writes the reading → streaming.task ─▶ avatar speaks live
  countdown / done ── POST /stop ─▶ streaming.stop (server force-closes)
```

- **`app/api/avatar/session`** — mints the LiveKit token + enforces gating. `GET` returns entitlement status (signed-in only; the client skips it entirely while signed out).
- **`app/api/avatar/speak`** — our LLM authors the reading **in the visitor's locale**, then HeyGen speaks it. Marks the credit consumed **only after** a successful spoken reveal.
- **`app/api/avatar/stop`** — force-closes the session; refunds if the avatar never spoke.
- **`app/api/avatar/sweep`** — scheduled cleanup, see *Leaked sessions* below.
- **`lib/heygen.ts`** — server-only HeyGen REST client (the only file touching `HEYGEN_API_KEY`).
- **`lib/wishes.ts`** — typed wrappers over the atomic gating RPCs.
- **`lib/avatar/reading.ts`** — draws a card + generates the spoken reading via our model, in the visitor's language (`lib/i18n/ai-language.ts`).
- **`lib/avatar/live-connection.ts`** — browser wrapper that joins the HeyGen LiveKit room via `livekit-client` (the transport HeyGen's `@heygen/liveavatar-web-sdk` bundles). We use the transport directly because the session is created server-side for gating/cost control; the high-level SDK owns its own session and can't attach to ours.

The browser renders the WebRTC video itself — video is **never proxied**
through our server.

## UI

`components/immerse/` holds the experience; `components/home/home-switch.tsx`
picks between it and the legacy hero.

- `index.tsx` — composition, the sign-in gate, and the `?ask=` deep link.
- `stage/avatar-stage.tsx` — the three-layer stack described below.
- `immerse-composer.tsx` — the input bar. Deliberately **not** `QuestionInput`, which carries attachments, mentions and the settings menu.
- `greeting-bubble.tsx` — carries the page `<h1>`, so the crawlable heading survives the redesign.
- `immerse-chrome.tsx` — sets `html[data-immerse="on"]`, which is how `globals.css` strips the navbar back to transparent.

### The stage's three layers

1. **Poster** — always present, paints immediately, and is the LCP element. A `<picture>` rather than `next/image`, because art direction needs media-switched sources and a second `<Image>` hidden by a breakpoint class would still be downloaded. Two renders of the same scene: `NEXT_PUBLIC_AVATAR_POSTER` (9:16, with a 640w `srcset` sibling for small phones) below 768px, `NEXT_PUBLIC_AVATAR_POSTER_WIDE` (16:9) at and above it. The browser downloads exactly one. A missing poster degrades to the gradient rather than a broken image.
2. **Idle clip** — rendered **only** when `NEXT_PUBLIC_AVATAR_INTRO` is set. Unset today: the first Astra asset is a still image, so swapping in a video later is an env change, not a code change.
3. **Live WebRTC video** — fades in once a session connects.

## Economy & gating (server-side only)

Backed by `database-avatar-wishes.sql`:

- **`avatar_entitlements`** — `free_reveal_used` (bool) + `wish_balance` (int) per user.
- A session starts only if `free_reveal_used = false` **OR** `wish_balance >= 1`.
- **Free path:** one complete spoken reveal, then the session closes. The free flag is *reserved* at start (so two tabs can't both claim it) and **reverted** if the avatar never speaks.
- **Paid path:** **1 wish = 1 minute.** A wish is deducted atomically at start; HeyGen's `session_duration_limit` is set to 60s as the hard cap, the client runs a countdown and calls `/stop` at zero.
- **Immerse spends a wish and never a star** — legacy chat charges 1 star per action; charging both would bill twice for one reading.
- **Refunds:** if the session fails to create or breaks before the avatar speaks, the wish / free reveal is refunded automatically (`avatar_end_session`).
- **Locking:** the entitlement row is `FOR UPDATE`-locked and only one live session per user is allowed, preventing double-charge / double-free.
- **Concurrency:** HeyGen's plan limit surfaces as a graceful "the fortune teller is busy" message, never a hang.

Wish **pricing** (30 THB first purchase, 60 THB after) lives in the store/checkout, not here. Grant purchased wishes by calling the `avatar_add_wishes(user_id, amount)` RPC from the Stripe fulfillment flow. **TODO:** wire the wish product into the existing checkout (`app/api/checkout`, `lib/stripe.ts`) — until then a user gets one free reveal and then a dead end.

## Leaked sessions

A browser that closes without reaching `/stop` leaves the row `active`, which
locks that user out of ever starting another session
(`SESSION_ALREADY_ACTIVE`) *and* holds a HeyGen concurrency seat.
`app/api/avatar/sweep` fixes both: it reads the expired rows while their
`heygen_token` is still available, force-closes each at HeyGen, then runs
`avatar_sweep_expired()`.

It runs every 5 minutes from `.github/workflows/avatar-session-sweep.yml`
(Vercel Hobby only allows daily crons), with the `vercel.json` cron as a daily
backstop. Both need `CRON_SECRET`.

## Setup (one-time)

The face image and voice sample must be turned into HeyGen assets first — they
can't be lip-synced on the fly. See `scripts/setup-heygen-avatar.ts`:

```bash
HEYGEN_API_KEY=xxx ELEVENLABS_API_KEY=xxx \
npx tsx scripts/setup-heygen-avatar.ts \
  --image ./assets/fortune-teller.png \
  --voice ./assets/fortune-teller-voice.mp3 \
  --voice-name "AskingFate Fortune Teller"
```

It prints `HEYGEN_AVATAR_ID` and `HEYGEN_VOICE_ID`.

⚠️ **The documented avatar does not match the persona.** `AVATAR-ASTRA.md`
describes Astra as a young East Asian **man** with the voice "Niwat - Natural",
while the artwork and every prompt are female. Re-run the setup script with the
current likeness and a matching voice before shipping audio.

## Required env

```
HEYGEN_API_KEY=          # server only, never exposed
HEYGEN_AVATAR_ID=        # from setup (photo/streaming avatar)
HEYGEN_VOICE_ID=         # from setup (cloned ElevenLabs voice)
HEYGEN_VOICE_MODEL=eleven_multilingual_v2
CRON_SECRET=             # shared with the sweep workflow
# optional:
HEYGEN_BASE_URL=https://api.heygen.com
AVATAR_READING_MODEL=deepseek/deepseek-v3.2      # the LLM that writes readings
NEXT_PUBLIC_AVATAR_POSTER=/avatar/astra-idle.webp       # idle still, 9:16, below 768px (default)
NEXT_PUBLIC_AVATAR_POSTER_WIDE=/avatar/astra-idle-wide.webp # idle still, 16:9, >=768px (default)
NEXT_PUBLIC_AVATAR_INTRO=                               # optional idle clip; unset = still image only
```

## Voice input

`hooks/use-voice-input.ts` uses the browser's **Web Speech API** — free, no
audio upload, live interim transcript. Where it is unavailable (Firefox, and
Chrome has no Lao or Burmese model — see `lib/voice/speech-locales.ts`) the mic
and the "Ask by Voice" pill are hidden rather than shown dead.

A final transcript **fills the composer rather than sending**: a mis-heard
question would otherwise spend a wish before anyone read it.

A MediaRecorder → server-transcription fallback for the remaining browsers is
not built yet. The AI Gateway is a text/embeddings proxy and most likely cannot
do audio, so that path needs its own provider — ElevenLabs `scribe_v1` is the
candidate, since `ELEVENLABS_API_KEY` is already configured for `/api/tts`.

## Notes

- HeyGen iterates on the LiveAvatar API/SDK — verify endpoint and field names against https://docs.heygen.com. All HeyGen REST calls are centralized in `lib/heygen.ts`; the WebRTC/LiveKit rendering is isolated in `lib/avatar/live-connection.ts`.
- The reading is still a **single card** via `lib/avatar/reading.ts`. Routing immerse through the full `/api/chat` decision engine (tarot / horoscope / oracle / synastry) is the next step.
- There is **no rate limiting** anywhere in the app. `/api/avatar/session` is the endpoint that most needs it.
