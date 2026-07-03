# Fixes applied from REPORT.md

All 14 recommendations implemented (2026-07-03). Verified: typecheck clean, lint clean, `question-intent` tests pass, and a re-run of the harness against the updated prompts produced a non-templated, directly-answering reading (see "Verification" below).

## Answer quality (the "template / not answering" core)

1. **Real answer fields instead of deterministic copies** — `lib/tarot/schema.ts`, `lib/prompts/prompts-rules.ts` (`<back_compat_rules>` → `<answer_body_rules>`), `app/api/interpret-cards/question/route.ts`:
   - `interpretation` is now THE MAIN ANSWER BODY: 3–5 flowing sentences that answer the question (leaning → why → what to do), with an explicit ban on subjectless fragments and perCard joins.
   - `conclusion` is a fresh closing line — same direction as `nextStep`, never a verbatim copy.
   - `keyMessage` is a grammatical prose fusion of headline+subtitle (no more missing-period seams).
2. **Phrase molds killed** — removed every PREFER tone-word list (kept AVOID lists), added an `<anti_template_variety>` rule (stock hedges max once per reading; no two fields may open the same way; headline may drop the hedge when the subtitle carries it), rewrote all four `<format_examples>` Good answers with different openers, and varied the mold-teaching examples in `no_markdown`/`headline_rules`. `nextStep` no longer has a fixed opener allow-list ("Try/ลอง" every time) — variety required.
3. **Sensitive-domain hard gate** — `app/api/interpret-cards/question/route.ts`: when `situation.questionDomain ∈ {medical, legal, financial}` (or a keyword fallback detects it on the legacy no-situation path), a SENSITIVE DOMAIN OVERRIDE that **outranks reading_direction** forbids outcome verdicts (no "cured/win/rich" headlines), redirects to the emotional landscape + professional deferral. Stage 1 (`app/api/situation/route.ts`) has a matching SENSITIVE DOMAIN EXCEPTION so the direction never contains a prognosis in the first place. Added a GRAVITY EXCEPTION to the casual-tone rules (no breezy slang on illness/legal/loss questions).
4. **Fabricated astrology stopped** — `app/api/chat/question/route.ts` + `lib/chat/general-reply-schema.ts`: the "exactly ONE astrological reference" instruction is now conditional on an astrology context actually being supplied; with no birth data the closing instruction explicitly forbids mentioning/inventing any planet or transit. Added "NEVER invent observations/events the user did not report."
5. **Direct-question escape hatch** — same route: for direct yes/no/when/should questions the reflection must honestly name the leaning or plainly say the question deserves a full tarot/horoscope reading — no more misty non-answers.

## Language & register

6. **One language resolver everywhere** — `app/api/chat/oracle/route.ts`, `app/api/chat/talk/route.ts`, `app/api/tarot/explain/route.ts`, `app/api/horoscope/explain/route.ts` now use `resolveResponseLanguage(locale, question)`; the four private `detectQuestionLanguage` copies (which ignored `locale`, mislabeled Chinese as Japanese, and defaulted es/id/pt-BR/my to English) are deleted. Their previously-dead `locale` request fields are now honored.
7. **Modern-Thai register rule** — `app/api/chat/talk/route.ts` system prompt: persona lives in tone, never archaic grammar (bans ข้า/เจ้า/ดั่ง/เยี่ยง; requires ฉัน/คุณ). Same rule added to the shared tarot `casual_tone` block.
8. **Legacy /tarot page now sends `locale`** — `components/tarot/interpretation/index.tsx`, `action.tsx` (via `useLocale()`).

## Pipeline correctness

9. **Stage-1 reasoner upgraded** — `app/api/situation/route.ts`: DeepSeek thinking enabled (`deepseekThinking(true, "low")` — non-streaming call, latency invisible mid-stream), `previousQuestion` accepted and injected (parity with the narrator), and `topic` is now an enum (`lib/chat/situation-schema.ts` `SITUATION_TOPICS`) so `pickMeaning` stops missing free-form topics like "social media growth" / Thai strings. `cardReadingDirection` length spec aligned (3–6 sentences in both prompt and schema).
10. **Vague questions** — new `needsClarification` flag in `situationSchema`; stage 1 must not invent named specifics for vague questions, and the narrator gets a VAGUE QUESTION NOTE (no invented contracts/people/dates; one suggestion chip invites the user to clarify). Wired through `components/chat/session.tsx` (both call sites, which also now send `previousQuestion` to `/api/situation`).
11. **Thai topic keywords for the legacy RAG branch** — `lib/tarot/rag.ts`: love/career/financial/health/yes-no/timing/advice keyword lists now include Thai terms, so Thai questions on the legacy page get topical + yes/no codex context (this also removes the chat-vs-legacy verdict-flip mechanism).
12. **Horoscope topic filter: rank, don't drop** — `app/api/horoscope/question/route.ts`, `app/api/horoscope/verdict/route.ts`: `filterAspectsByRelevantPlanets` now sorts focus-planet aspects first instead of deleting the rest, so a misdetected topic can no longer erase the relevant data. Prompt instruction 14 (`lib/prompts/index.ts`) softened from "ignore other planets" to "prioritize focus planets, but never ignore an obviously dominant aspect".
13. **Thin-data honesty for horoscope timing** — `lib/prompts/index.ts`: the exact-date mandate and the "never vague timing words" rule are now conditional on aspect/calendar data existing; with no events the model must say no strong window stands out and anchor on the timeframe boundaries instead of fabricating dates. The over-matching Thai love regex (bare `กัน`, bare `เลิก`, bare `ชอบ`) in `lib/astrology/question-intent.ts` was narrowed.

## Streaming, waste, dead code

14. **`mode: "json"`** added to `chat/question`, `chat/oracle`, `chat/talk`, `astrology/summary` streamObject calls (fixes the "pop in all at once" buffering the tarot route had already fixed for itself). The `/api/chat` classifier was left on `auto` deliberately — it conditionally enables thinking, and its decision object is consumed programmatically, not rendered progressively.
15. **Dead fields cut** — `currents` + `whisper` removed from `generalReplySchema` generation (~25-30% of every general-reply payload, never rendered). Kept optional in the streaming schema + a `StoredGeneralReply` type in `session.tsx` for old persisted replies.
16. **`/api/agent` contradiction fixed** — user prompt no longer says "Respond with valid JSON only" against a system prompt demanding a plain message.
17. **`franc` removed** from package.json (declared, never imported).
18. **Spec drift fixed** — `<output_schema>` in `prompts-rules.ts` now matches the zod declaration order and includes `detailedHtml`.

## Verification

Re-ran the harness (which extracts the live route source, so it reflects these changes) on the T1L case ("Will I get the job I interviewed for last week?", legacy branch — previously: headline "Likely yes — the signals lean in your favor." + fragment-soup interpretation + conclusion==nextStep):

- headline: **"Strong odds, one hurdle left in the room."** — no stock mold.
- interpretation: 4 flowing sentences that directly answer the question with question-specific content (panel decision, slower answer, how to read silence).
- conclusion == nextStep: **false**.

Full before/after artifacts: `artifacts/` (before) vs `T1L` re-run under the updated prompts.
