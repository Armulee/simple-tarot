# Avatar: Astra

## Source artwork
`assets/astra-source.png` — 941 × 1672 (9:16), the canonical likeness.
Web derivatives live in `public/avatar/` (see *Web assets* below).

## Appearance
- Age: young adult
- Gender: woman
- Ethnicity: East Asian
- Hair: long dark brown, braided crown with loose strands
- Wardrobe: sheer off-shoulder gown in deep purple with gold star and
  constellation embroidery; gold star pendant, crescent-moon earrings
- Setting: a candlelit reading room — arched window over a night skyline,
  crescent moon, amethyst crystals, an armillary sphere, stacked grimoires,
  a tarot spread on a midnight-blue cloth, a black cat asleep at her side
- Expression: warm, welcoming, chin resting on one hand

## Voice
- Tone: warm, calm, encouraging
- Accent: Thai
- Energy: gentle, unhurried
- Gender: **female** — every prompt in `lib/avatar/reading.ts` and
  `lib/prompts/prompts-rules.ts` writes her with female Thai particles
  (`ค่ะ` / `นะคะ`), which a Thai listener will immediately hear against a
  male voice

## HeyGen

> ⚠️ **These IDs are stale and do not match the artwork above.** They were
> created from an earlier draft — a young East Asian *man* in a dark crew-neck
> tee, voice "Niwat - Natural". Until they are regenerated, the idle poster and
> the live avatar are two different people, and the voice contradicts the
> script. Regenerate before shipping audio:
>
> ```bash
> HEYGEN_API_KEY=xxx ELEVENLABS_API_KEY=xxx \
> npx tsx scripts/setup-heygen-avatar.ts \
>   --image ./assets/astra-source.png \
>   --voice ./assets/astra-voice.mp3 \
>   --voice-name "Astra"
> ```
>
> Using `assets/astra-source.png` as the talking-photo source is what makes the
> still → live transition seamless: the poster and the streamed video become
> the same person in the same room.

- Group ID: 1ed2a1ca46a04304bbec43e503a788da *(stale)*
- Voice ID: 267604df751e4934b041a9eea2dafd3f — "Niwat - Natural", **male** *(stale)*
- Voice Designed: false
- Looks: portrait=e721a16d218a41e4b8444663e8298958 *(stale)*
- Last Synced: 2026-04-19T00:55:00Z

Resolve fresh look IDs from the Group ID at runtime if looks change.

## Web assets

| File | Use |
|---|---|
| `public/avatar/astra-idle.webp` | 941w portrait — the idle poster, and the stage's LCP element |
| `public/avatar/astra-idle-640.webp` | 640w variant, picked by `srcset` on small phones |
| *(none yet)* | Landscape crop for wide viewports — set `NEXT_PUBLIC_AVATAR_POSTER_WIDE` once it exists |

The portrait is 9:16, so on a desktop `object-cover object-top` crop it becomes
a centred close-up and the room is lost. `components/immerse/stage/avatar-stage.tsx`
serves a landscape asset instead at `min-width: 768px` — but only when
`NEXT_PUBLIC_AVATAR_POSTER_WIDE` is set, since a `<source>` pointing at a
missing file would break the image outright.
