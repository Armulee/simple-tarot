# Talking Avatar (`/avatar`)

A real-time fortune-teller avatar that draws a card and **speaks** the reading
aloud with lip-sync, driven by **our own LLM** (HeyGen only speaks the text we
send). Built on HeyGen **LiveAvatar / Lite mode** (bring-your-own-LLM) over
**WebRTC / LiveKit**.

## Architecture

```
[Browser /avatar]            [app/api/avatar/* (server, holds HEYGEN_API_KEY)]      [HeyGen]
  enter page ── poster shown immediately (idle), no live session yet
  ask question ─ POST /session ─▶ auth + gating → create_token + streaming.new ─▶ {session_id, access_token, wss url}
  ◀── {access_token, url, session_id, mode}  (API key NEVER sent to client)
  connect LiveKit (livekit-client) → render <video>
            ── POST /speak {question} ─▶ OUR LLM writes reading → streaming.task ─▶ avatar speaks live
  countdown / done ── POST /stop ─▶ streaming.stop (server force-closes)
```

- **`app/api/avatar/session`** — mints the LiveKit token + enforces gating. `GET` returns entitlement status for the page's default mode.
- **`app/api/avatar/speak`** — our LLM authors the Thai reading, then HeyGen speaks it. Marks the credit consumed **only after** a successful spoken reveal.
- **`app/api/avatar/stop`** — force-closes the session; refunds if the avatar never spoke.
- **`lib/heygen.ts`** — server-only HeyGen REST client (the only file touching `HEYGEN_API_KEY`).
- **`lib/wishes.ts`** — typed wrappers over the atomic gating RPCs.
- **`lib/avatar/reading.ts`** — draws a card + generates the spoken Thai reading via our model.
- **`lib/avatar/live-connection.ts`** — browser wrapper that joins the HeyGen LiveKit room via `livekit-client` (the transport HeyGen's `@heygen/liveavatar-web-sdk` bundles). We use the transport directly because the session is created server-side for gating/cost control; the high-level SDK owns its own session and can't attach to ours.

The browser renders the WebRTC video itself — video is **never proxied** through our server.

## Economy & gating (server-side only)

Backed by `database-avatar-wishes.sql`:

- **`avatar_entitlements`** — `free_reveal_used` (bool) + `wish_balance` (int) per user.
- A session starts only if `free_reveal_used = false` **OR** `wish_balance >= 1`.
- **Free path:** one complete spoken reveal, then the session closes. The free flag is *reserved* at start (so two tabs can't both claim it) and **reverted** if the avatar never speaks.
- **Paid path:** **1 wish = 1 minute.** A wish is deducted atomically at start; HeyGen's `session_duration_limit` is set to 60s as the hard cap, the client runs a countdown and calls `/stop` at zero, and `avatar_sweep_expired()` cleans up any leaked sessions (run it from a cron / scheduled function).
- **Refunds:** if the session fails to create or breaks before the avatar speaks, the wish / free reveal is refunded automatically (`avatar_end_session`).
- **Locking:** the entitlement row is `FOR UPDATE`-locked and only one live session per user is allowed, preventing double-charge / double-free.
- **Concurrency:** HeyGen's plan limit surfaces as a graceful "the fortune teller is busy" message, never a hang.

Wish **pricing** (30 THB first purchase, 60 THB after) lives in the store/checkout, not here. Grant purchased wishes by calling the `avatar_add_wishes(user_id, amount)` RPC from the Stripe fulfillment flow. **TODO:** wire the wish product into the existing checkout (`app/api/checkout`, `lib/stripe.ts`).

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

It prints `HEYGEN_AVATAR_ID` and `HEYGEN_VOICE_ID`. (An existing avatar/voice is
already documented in `AVATAR-ASTRA.md`.)

## Required env

```
HEYGEN_API_KEY=          # server only, never exposed
HEYGEN_AVATAR_ID=        # from setup (photo/streaming avatar)
HEYGEN_VOICE_ID=         # from setup (cloned ElevenLabs voice)
HEYGEN_VOICE_MODEL=eleven_multilingual_v2
# optional:
HEYGEN_BASE_URL=https://api.heygen.com
AVATAR_READING_MODEL=deepseek/deepseek-v3.2   # the LLM that writes readings
NEXT_PUBLIC_AVATAR_POSTER=/avatar/idle.png    # idle poster shown on entry
```

## Apply the migration

Run `database-avatar-wishes.sql` against the Supabase project (idempotent), then
schedule `select public.avatar_sweep_expired();` (e.g. every minute) so paid
minutes can't leak if a browser closes uncleanly.

## Notes

- HeyGen iterates on the LiveAvatar API/SDK — verify endpoint and field names
  against https://docs.heygen.com. All HeyGen REST calls are centralized in
  `lib/heygen.ts`; the WebRTC/LiveKit rendering is isolated in
  `lib/avatar/live-connection.ts`. If you prefer HeyGen's high-level
  `@heygen/liveavatar-web-sdk` (client-managed session), swap it in there and
  move session creation off the server — but you'd then re-implement the
  server-side gate/force-close differently.
- The chat fallback links to the main chat rather than duplicating it; if you
  want full inline chat on `/avatar`, mount the existing chat component there.
