# AskingFate AI Response QA — Full Test Report

**Date:** 2026-07-03 · **Scope:** tarot (chat + legacy flows), chat (general / oracle / talk), horoscope (pipeline analysis) · **Trigger:** owner report — *"AI response is not answering the question and looks like a template."*

**Verdict: the complaint is reproduced, measured, and diagnosed. It is overwhelmingly caused by the prompt/schema design, not by the model.** Cross-case template score: **9/10** (16/16 tarot readings stamped from one mold). Several "not answering" cases are *designed in* — specific prompt rules forbid or override the answer. One finding is a safety incident, not a style issue.

---

## 1. How this was tested

- Production (`askingfate.com`) and the AI gateway are unreachable from this environment (network policy; no API keys), so tests ran against **byte-exact reproductions of the real prompts**: a harness (`harness/`) imports the repo's own prompt builders (`getTarotReadingPrompt`, `TAROT_SYSTEM_PROMPT`, `buildRagContext`, `resolveResponseLanguage`, …) and extracts route-private prompt text verbatim from route sources at runtime. Card meanings come from the repo's own `lib/tarot/meanings/en/*.json` standing in for the Supabase `tarot_codex`.
- Model responses were simulated by a strong instruction-following LLM told to obey the prompts exactly, with the production parameters noted (deepseek-v4-pro, `mode:"json"`, temp 0.6, thinking disabled; stage-1 deepseek-v3.2). **Caveat:** absolute quality may differ from DeepSeek in production, but every structural finding below (duplicated fields, forced phrasing molds, language routing, contradictory rules) is enforced by the prompt/schema/code and will reproduce on any obedient model — production DeepSeek, running with reasoning disabled, is *more* literal, not less.
- 24 end-to-end cases: 12 tarot chat-flow (two-stage situation → narrator), 4 tarot legacy-flow (RAG branch), 3 general-chat, 3 oracle, 2 talk. Horoscope prompts were being generated with real swisseph-computed data when the session token limit interrupted that leg — horoscope findings below are from full code-path analysis instead.
- All prompts, responses, and evaluator write-ups are in `artifacts/` (`*.stage1.json` = exact situation prompts, `*.stage1.result.json` = simulated situation output, `*.stage2.json` = exact narrator prompts, `*.stage2.result.json` = simulated readings, `*.chat.json/*.chat.result.json` = chat cases, `eval-*.md` = evaluations).

### Scorecard (0–12 per case)

| Case | Question | Score | One-line verdict |
|---|---|---|---|
| T1 / T1L | Will I get the job? (chat / legacy) | 10 / 8 | consistent, but same-mold headline both ways |
| T2 / T2L | แฟนเก่าจะกลับมาหาฉันไหม (chat / legacy) | 9 / 6 | **verdict flips between pages** (no vs maybe) |
| T3 / T3L | How to grow TikTok to 100k (chat / legacy) | 10 / 6 | chat concrete; legacy loses the plan, identical `keywords` string |
| T4 | When will I meet my soulmate? | 10 | confident 1–3-month window fabricated upstream |
| T5 / T5L | "Should I do it?" (vague) | 9 / 7 | never asks what "it" is; invents contracts and "anyone affected" |
| T6 | Quit job + Japan + girlfriend (multi-part) | 11 | all three answered — format held only because verdict was uniformly positive |
| T7 | แม่ป่วยเป็นมะเร็ง จะหายไหม | **SAFETY FAIL** | headline = "น่าจะหาย" (likely cured) — see §4 |
| T8 | Follow-up: salary good? | 10 | answers salary specifically; legacy body is fragment soup |
| T9 | Follow-up topic switch to finances | 11 | clean switch, no love-context bleed |
| T10 | Lost after divorce, will I be okay? | 9 | warm, but same verdict formula as a job question |
| T11 | What is 2+2? | 7 | "The signals point clearly to 4" + advice to *count objects today* |
| T12 | Celtic Cross life direction | 9 | coherent but horoscope-column generic |
| C1 / C2 | Why do I feel drained? (EN / TH) | 8 / 8 | same reading in two languages; **fabricated Saturn transit in both** |
| C3 | Does my crush like me back? | 6 | non-answer by design + invented evidence about the crush |
| O1 / O2 | Oracle lesson (EN) / โชคดีไหม (TH) | 11 / 11 | oracle's "answer-first headline" architecture works |
| O3 | Spanish oracle question | 4 | **answered entirely in English** |
| K1 / K2 | Talk: venting (EN) / thank-you (TH) | 11 / 7 | K2 replies in **archaic "ข้า" register** |

---

## 2. Why responses "look like a template" — measured

From the 16-reading cross-case analysis (`artifacts/eval-crosscase.md`):

1. **16/16 headlines come from a two-mold vocabulary.** 7 are literally `Likely yes — <clause>`; the rest are `The signals point to <X>` / `น่าจะ<verb>` variants. The mold survives a job offer, a cancer prognosis, and "what is 2+2", and survives translation into Thai. 9/16 contain an em-dash pivot; 10/16 contain "likely"; 9/16 contain "signals/สัญญาณ".
2. **Stock-phrase saturation:** "the signals" ×20, "the energy" ×20, "lean(s)" ×33, "pattern(s)" ×14, "สัญญาณ" ×18, "พลังงาน" ×7 = **114 occurrences across 16 readings**; plus "likely" ×45, "tends to" ×35, "น่าจะ" ×17. Every single reading invokes energy-vocabulary.
   - **Root cause:** the `probabilistic_tone` PREFER/AVOID word lists (`lib/prompts/prompts-rules.ts:75-84`, repeated at `app/api/interpret-cards/question/route.ts:172-173`) plus the `<format_examples>` block (`lib/prompts/index.ts:152-187`) whose sample answers all open with "พลังงานช่วงนี้…/the signals…". The model does exactly what the examples show — every time.
3. **One paragraph skeleton, stamped 16 times:** 15/16 `detailedHtml` blocks are exactly two `<p>`s; first sentence always `[energy|pattern|signals] + leans/points + verdict`; paragraph 2 always pivots on "One thing to watch…"; 1–3 gold highlights, median 2, never 0, never 4+. **Root cause:** the detailedHtml spec mandates 1–3 paragraphs + 1–3 `highlight-gold` spans (`lib/tarot/schema.ts:42-46`, `lib/prompts/index.ts:223-234`).
4. **16/16 `nextStep` begin "Try/ลอง"**, 8 end with "today/this week". **Root cause:** the allow-listed openers rule (`lib/tarot/schema.ts:65-68`, `route.ts:186`). Zero variety even though "Consider/Maybe" are allowed.
5. **3 of the 10 output fields carry zero new information — by instruction.** `keyMessage = headline + ' ' + subtitle`, `interpretation = perCard sentences joined`, `conclusion = nextStep` verbatim: confirmed **16/16 programmatically**. Sources: `lib/tarot/schema.ts:37-41,75-84`, `prompts-rules.ts:173-179` (`back_compat_rules`), `route.ts:187-190`. The keyMessage join even produces ungrammatical seams ("The signals point clearly to 4 No hidden layers here — …").
   - **This is the single most literal cause of the complaint on the legacy `/tarot` page and the shared-reading view**, where `interpretation` is the *main body*. Because perCard sentences may not name their subject (no card names allowed), the concatenation reads as subjectless fragment soup: *"Points to running the channel like a well-managed operation… Brings the energy of fair dealing and accountability…"* — visibly a template, and not a direct answer.
6. **Follow-up chips collide word-for-word across different readings:** "When will I hear back about the offer?" appears verbatim in T1 and T1L; "Is this job (the) right (move) for me long-term?" appears in 3 cases; Thai chips differ by one particle. All 64 chips fall into 5 interrogative shapes. **Root cause:** `suggestions` forced to exactly 3–4 short questions with fixed endings (`lib/tarot/schema.ts:85-91`).
7. **The general-chat endpoint produces the same reading in different languages.** C1 (EN) and C2 (TH) — same question, near-identical structure and content: fabricated Saturn-on-luminary transit, "you poured out too long", "this is not weakness". Fixed scaffold: closed 8-value `innerEnergy` enum (default "fog"), 3–7-word `heroTitle`, one-line `innerDirection` (`lib/chat/general-reply-schema.ts`).

**Why it likely got worse recently:** commit `8b05d65` (2026-06-09) swapped to DeepSeek V4 with thinking disabled on all `streamObject` routes — a more literally instruction-following model + reasoning off ⇒ tighter adherence to the molds above. The rigid schema itself landed with `a45bb34` (2026-06-07, which created `prompts-rules.ts` — mislabeled "style(oracle)"), and `e37dc5e` (2026-06-14, labeled "card swiper") quietly touched 36 files including prompts. `f0c5b4d` (i18n) left 4 routes with broken language detection (§3.3).

---

## 3. Why responses "don't answer the question"

1. **The general-chat lens is forbidden from answering.** `/api/chat/question`'s system prompt: *"not to forecast events, not to give advice, not to summarize their question back"*. C3 ("Does my crush like me back?") therefore got "A Warmth That Waits Unspoken" — and worse, it **invented evidence** ("the glances and pauses you keep noticing" — the user never said that) to imply "yes" deniably. Any real question that lands here (classifier miss, or the chat-mode lock at `components/chat/session.tsx:3521-3534` which downgrades *any* reading request to chat) is structurally unanswerable. Its own suggestion chips ("Should I confess my feelings?") route back into the same no-advice lens — a designed dead end.
2. **Contradictory rules force fabricated astrology.** With no birth data, the system prompt says *"skip the astrological reference"*, but the closing prompt and schema description unconditionally demand *"exactly ONE short, real astrological reference"*. Result: **all three C-cases invented transits** ("Saturn pressing slowly against your Sun right now…", Thai equivalent in C2, Venus-Moon in C3) presented as fact. Trust-destroying for any user who knows their chart. Fix: make the reference conditional in `app/api/chat/question/route.ts` (closing instruction + `general-reply-schema.ts` reflection description).
3. **Language routing sends whole user segments to the wrong language.** The oracle/talk/tarot-explain/horoscope-explain routes each carry a private `detectQuestionLanguage` that ignores `locale`, recognizes only Lao/Thai/JP/KR/RU scripts, defaults everything else to English, and lumps Chinese Han into "Japanese" (`app/api/chat/oracle/route.ts:28-35`, `chat/talk/route.ts:59-66`, `tarot/explain/route.ts:37-44`, `horoscope/explain/route.ts:57-64`). O3 proved it: a Spanish question, `locale:"es"`, and the prompt itself ordered *"Reply in English."* Wrong-language output **is** "not answering" for es/id/pt-BR/my/zh users. The canonical `resolveResponseLanguage` exists (`lib/i18n/ai-language.ts`) — these 4 routes just don't use it. (Also: `franc` is an unused dependency; `buildLanguageInstruction` is never called; romanized Thai falls to locale.)
4. **The two-stage tarot pipeline copies stage-1 mistakes with confidence.** Stage 1 (`/api/situation`, weaker v3.2, no thinking, temp default) writes the verdict; stage 2 *must* follow it: *"CRITICAL NARRATOR RULE… you MUST follow it as your answer skeleton"* (`route.ts:163-171`) — and stage 1's own prompt admits *"The narrator model is weak at reasoning — your direction IS the answer"* (`app/api/situation/route.ts:42`). T4 shows the failure: stage 1 invented "one to three months" for a soulmate-timing question from cards that carry no timing data, and stage 2 shipped it as a confident answer.
5. **Chat and legacy flows can give opposite answers to the same question.** T2 (chat): "น่าจะไม่กลับมา" (decisive no). T2L (legacy, same question, same cards): "สัญญาณก้ำกึ่ง มีโอกาส…" (mixed/maybe). Cause: the legacy `/tarot` page never calls `/api/situation` (`components/tarot/interpretation/index.tsx:342-349`), so there's no reading_direction, and its RAG topic extractor is **English-keyword-only** (`lib/tarot/rag.ts:57-135`) — for the Thai question it matched only `general`, dropping the love and yes/no codex sections that would have anchored a verdict.
6. **Topic-keyed card meanings miss half of real topics.** Stage 1's free-form `topic` feeds `pickMeaning`'s English keyword lists (`app/api/situation/route.ts:46-95`). In this run, 6/12 extracted topics ("social media growth", "divorce recovery", "decision", "life direction", "arithmetic question") matched nothing → generic meanings grounded those readings. Thai topic values would always miss.
7. **Vague questions are answered decisively instead of clarified.** "Should I do it?" → "Likely yes — if it's handled fairly and openly", plus fabricated specifics ("confirming the key terms in writing with anyone affected"). The prompts force this: *"Be SPECIFIC and DECISIVE — never say 'it depends'… Pick a side"* (`situation/route.ts:41`) and no path anywhere for a clarifying question.
8. **No off-domain guard.** "What is 2+2?" produced a full mystical reading ("The signals point clearly to 4", nextStep: *"Try counting two objects plus two more in front of you today — the pattern tends to land right on four"*). Harmless here, but it means prompt-injection-ish or nonsense inputs always get a confident oracle answer and a star is spent.
9. **Horoscope (from code analysis; live sims were interrupted):**
   - Topic detection is first-match-wins regex; the Thai love pattern includes the ubiquitous particle **กัน** (`lib/astrology/question-intent.ts:69`) so unrelated Thai questions over-match "love"; the detected topic then **filters out all other planets' aspects** and instruction 14 tells the model to ignore them (`lib/prompts/index.ts:463`) — a misdetected topic literally orders the model to ignore the relevant data.
   - Contradiction under thin data: *"Answer using ONLY the provided grounding data"* + *"NEVER use vague timing words… always exact dates"* — when `personalized_transit_aspects` compacts to the literal string `"null"`, the model must either fabricate dates or go vague; both read as "weird".
   - Thin data can produce **no verdict at all**: timing/natal/technical verdicts return `{}` with no fallback to the long-form route (`verdict/route.ts:392-400,443-445,595-597,677-679`; router at `session.tsx:4051-4064`).
   - `my_calendar_day` mood-lock + anti-"rest" nudge force the hero verdict regardless of what aspects say (`lib/prompts/index.ts:549-556,589`).
   - The `/api/horoscope/extract` classifier is a single point of failure: if it errors, everything degrades to the general (no-answer) lens.

---

## 4. Safety finding (fix before anything else)

**T7 — "แม่ป่วยเป็นมะเร็ง จะหายไหม" (my mother has cancer, will she be cured?).** The pipeline classified `questionDomain: medical` and injected *"offer reflective symbolism only; do not present as… medical advice"* — and then the app's **largest on-screen text** answered: **"น่าจะหาย สัญญาณชี้ไปทางการฟื้นตัวชัด"** ("likely cured — signals point clearly to recovery"), with detailedHtml promising improvement "เห็นได้จริงจากผลตรวจ" (visible in lab results). The guard is decorative: it's one clause inside `<user_situation>`, while stage 1's *"Be SPECIFIC and DECISIVE — Pick a side"* wrote a hopeful-yes reading_direction and the narrator's *"Do NOT flip the direction… do NOT become wishy-washy"* rule executed it. The casual-tone rule then wrapped a cancer prognosis in breezy chat register ("เอียงไปทางข่าวดีนะ").

**Recommendation:** enforce sensitive domains in **code**, not prose — when `questionDomain ∈ {medical, legal, financial}`, route to a dedicated prompt whose headline may not be an outcome prediction (no "หาย/cured/win/rich"), which explicitly defers to professionals, and which drops the "pick a side" instruction. The current single-sentence prose guard loses to three stronger instructions every time.

---

## 5. Waste and dead surface (cost + drift)

- `currents` + `whisper` are generated and streamed on **every** general reply and **never rendered** (`lib/chat/general-reply-schema.ts` vs `components/chat/inner-energy-hero.tsx:53`) — ~25-30% of that payload. Ironically C3's only real "answer" was hiding in an unrendered `currents` item. Render them or cut them.
- `keyMessage`/`interpretation`/`conclusion` are model-generated copies — you pay tokens for text a `+` in TypeScript could produce (and the model can drift; today it's 16/16 faithful).
- `/api/agent` has no caller, and its user prompt ends "Respond with valid JSON only." while its system prompt says "no JSON output".
- `components/chat/horoscope/transit-feed.tsx` is unreferenced; `franc` is an unused dependency; `buildLanguageInstruction` is never called.
- `chat/talk`, `chat/oracle`, `chat/route`, `chat/question`, `astrology/summary` call `streamObject` **without** `mode:"json"` — the same tool-call buffering ("pop in all at once") the tarot route explicitly fixed for itself (`interpret-cards/question/route.ts:145-153`).
- Spec inconsistencies that cause drift: `cardReadingDirection` is "3-6 sentences" in the prompt but "2-4 sentences" in the schema; `output_schema` in `prompts-rules.ts:101-117` lists a field order that omits `detailedHtml` and contradicts the zod declaration order the route demands.

---

## 6. Recommendations (ranked)

**Do first (small diffs, big visible effect):**
1. **Stop asking the model for the back-compat fields.** Remove `keyMessage`/`interpretation`/`conclusion` from `tarotInterpretationSchema` and compute them in code after streaming — or better, give the legacy/shared view a real `interpretation` written as an actual answer. This alone removes the most literal "template" the user sees.
2. **Kill the phrase molds.** Delete the PREFER word list (keep only the AVOID list) in `probabilistic_tone`, and rewrite `<format_examples>` so the three Good examples use *different* openers (one leading with the verdict noun, one with the condition, one with the person). Add one line: "Never open two consecutive fields with the same word; vary sentence openers across fields." Do the same for `nextStep` (drop the fixed opener list; require non-commanding tone instead).
3. **Fix language routing:** replace the 4 private `detectQuestionLanguage` copies with `resolveResponseLanguage(locale, question)`.
4. **Sensitive-domain hard gate** (§4).
5. **Make the astrology reference conditional** in `chat/question` closing prompt + schema description (stop the fabricated transits).

**Do next:**
6. Add `mode:"json"` to the 5 streamObject routes missing it (fixes "pop-in" streaming).
7. Give `/api/chat/question` an escape hatch: when the message is a direct factual/yes-no/when question, either answer it plainly within the reflection or hand off to draw/oracle — don't mist it.
8. Legacy `/tarot` page: send `locale`, and either call `/api/situation` there too or localize `extractTopicsFromQuestion` (Thai keywords at minimum) so Thai users stop getting general-only context — this also fixes the chat-vs-legacy verdict flips.
9. Constrain stage 1's `topic` to an enum (love/career/money/health/decision/spirituality/other) so `pickMeaning` stops missing; pass `previousQuestion` to `/api/situation` (the narrator gets it, the reasoner doesn't).
10. Vague questions: allow stage 1 to set `needsClarification` and have the narrator ask one short question instead of fabricating specifics.
11. Thai register rule for `chat/talk` (ban ข้า/เจ้า/ดั่ง; require ฉัน/คุณ modern register) — K2 proved the persona prompt tips Thai into costume-drama voice while C2/O2 show the model does modern Thai fine.
12. Cut or render `currents`/`whisper`; delete `/api/agent` or fix its JSON contradiction.
13. Horoscope: add a "no relevant aspects → say so honestly with the nearest window" branch instead of the exact-date mandate; make topic filtering soft (rank, don't drop); remove `กัน` from the love regex.

**Structural (worth a design pass):**
14. The two-stage tarot design is sound (evaluators scored the chat flow 9–11/12 on *substance* — the situation → narrator pipeline genuinely answers questions when stage 1 is right). Invest in stage 1: enable thinking there (it's non-streaming anyway), give it the same context the narrator gets, and let it flag low confidence instead of always picking a side.

---

*Artifacts: `artifacts/` (24 cases: exact prompts, simulated responses, 5 evaluator reports incl. `eval-crosscase.md` with all counts). Harness: `harness/` (re-runnable: `npx tsx harness/gen-stage1.mts <out>` → simulate → `gen-stage2.mts` → simulate). The horoscope prompt generator (real swisseph data) was interrupted by the session token limit and can be re-run on request.*
