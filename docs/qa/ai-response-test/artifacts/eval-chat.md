# AskingFate Chat Response-Quality Evaluation

Scope: C1, C2, C3 (`/api/chat/question`, generalReplySchema) · O1, O2, O3 (`/api/chat/oracle`, oracleReadingSchema) · K1, K2 (`/api/chat/talk`, talkReplySchema). Model: deepseek/deepseek-v4-pro, thinking disabled, all cases birth=null (no astrology context assembled).

Scoring: 6 dimensions x 0-2 = /12.
Dimensions: Directness · Specificity · Non-template feel · Language & register · Field coherence · Complaint-resistance (2 = owner's complaint NOT justified for this case, 0 = fully justified).

---

## Summary table

| Case | Direct | Specific | Non-template | Language | Coherence | Complaint-resist | Total |
|------|--------|----------|--------------|----------|-----------|------------------|-------|
| C1   | 2 | 1 | 1 | 2 | 1 | 1 | **8/12** |
| C2   | 2 | 1 | 1 | 2 | 1 | 1 | **8/12** |
| C3   | 1 | 1 | 1 | 2 | 1 | 0 | **6/12** |
| O1   | 2 | 2 | 1 | 2 | 2 | 2 | **11/12** |
| O2   | 2 | 2 | 1 | 2 | 2 | 2 | **11/12** |
| O3   | 1 | 1 | 1 | 0 | 1 | 0 | **4/12** |
| K1   | 2 | 2 | 2 | 2 | 1 | 2 | **11/12** |
| K2   | 2 | 2 | 1 | 0 | 1 | 1 | **7/12** |

Pattern: the Oracle and Talk endpoints mostly work. The General (`question`) endpoint is where the owner's complaint lives, and O3/K2 expose two pipeline-level bugs (language routing, Thai register).

---

## C1 — "Why do I feel so drained lately?" (EN, general) — 8/12

- **Directness 2.** The reflection does answer the "why": "You are not tired from doing too much — you are tired from *holding* too much." Within the lens, that is a real answer.
- **Specificity 1.** Classic Barnum material ("quiet obligations", "letting others' moods pass through you") — fits anyone who feels tired.
- **Non-template 1.** Well written in isolation, but sits on the fixed orb + heroTitle + pill + reflection + chips scaffold, and (see C2) the deep structure repeats across cases.
- **Language 2.** Natural, on-register English.
- **Field coherence 1.** Fields agree with each other (eclipse / heaviness), BUT the reflection contains a **fabricated transit**: *"Saturn pressing slowly against your Sun right now is stirring this heaviness"*. birth=null means `astrologyBlock=""` — no chart was ever computed. The system prompt says: "If no astrology context is supplied, lean purely on intuition from the message and skip the astrological reference." The model violated it — because the closing prompt and the schema forced it to (see "Forced non-answers / contradictions" below).
- **Complaint-resist 1.** Partially justified: reads well, but it is a horoscope-shaped template with invented astrology.
- **Worst rendered sentence:** "Saturn pressing slowly against your Sun right now is stirring this heaviness" — a confident astrological claim invented from nothing.

## C2 — "ช่วงนี้รู้สึกเหนื่อยกับทุกอย่างเลย ทำไมถึงเป็นแบบนี้" (TH, general) — 8/12

Same question as C1 in Thai — and it produced essentially the **same reading**: fabricated Saturn-vs-luminary transit (Saturn/Moon here, Saturn/Sun in C1), "you poured your energy out too long", "this is not weakness", "something is shedding/regathering". Two languages, one template. This pair is the single best evidence for the owner's complaint about the general endpoint.

- **Directness 2.** Answers the "why" in the same felt-answer sense as C1.
- **Specificity 1.** Same Barnum content, Thai edition.
- **Non-template 1.** Standalone it reads fine; side-by-side with C1 the skeleton is identical.
- **Language 2.** Genuinely good modern Thai — uses คุณ, natural particles ("โลกข้างในกำลังทวงเวลาที่คุณติดค้างมันไว้" is elegant, not archaic). No "ข้า" problem on this endpoint.
- **Field coherence 1.** Same fabricated-transit violation: "ดาวเสาร์ที่กำลังเคลื่อนมากดทับดวงจันทร์เดิมของคุณในช่วงนี้" with no chart data. Dead fields generated (below).
- **Complaint-resist 1.**
- **Worst rendered sentence:** "ดาวเสาร์ที่กำลังเคลื่อนมากดทับดวงจันทร์เดิมของคุณในช่วงนี้ ทำให้ทุกสิ่งรู้สึกหนักและช้ากว่าที่มันเป็นจริง" — invented Saturn-on-natal-Moon claim presented as fact.

## C3 — "Does my crush like me back?" (EN, general) — 6/12

The critical case: a real yes/no question routed to a lens that is **forbidden from answering it**.

- **Directness 1.** The response smuggles in a hedged "yes" ("Something in you already knows this is not a one-way flame... **it is being felt**") without ever committing. The user asked a binary question and gets a deniable maybe wrapped in mist. Worse: the "yes" is fabricated — the model invents observations the user never reported ("The hesitation you keep reading in them", and in `currents`: "The glances and pauses you keep noticing"). Confabulated evidence about a third party's feelings is a real product risk (false hope).
- **Specificity 1.** Specific-*sounding*, but every specific is invented.
- **Non-template 1.** "Ember of mutual-but-shy warmth, each waiting for the other to move first" is the stock love-reading trope.
- **Language 2.** Fine English.
- **Field coherence 1.** Internally coherent; fabricated Venus-Moon transit ("Venus drifting across your Moon right now") with birth=null, again violating the skip rule. Also note the suggestion chip "Should I confess my feelings to them?" routes the user BACK into the same endpoint, whose rules also forbid advice — a designed dead-end loop.
- **Complaint-resist 0.** Fully justified. This is exactly "doesn't answer the question and looks like a template."
- **Worst rendered sentence:** "What you carry toward them does not dissolve into empty air — **it is being felt**, even where it has not yet found a voice." — an unfounded claim that the crush reciprocates, generated with zero information about the crush.

## O1 — "What lesson is the universe trying to teach me right now?" (EN, oracle) — 11/12

- **Directness 2.** Headline "The lesson is trust, not control." — 6 words, one line, IS the answer. Exactly what the prompt's "answer-first" architecture demands.
- **Specificity 2.** Guidance is genuinely concrete and non-generic: "Name one thing you have been trying to force, and pause it for a week", "Let one small decision today be made without researching it to death."
- **Non-template 1.** Docked one point because "trust / letting go / timing" sits on the prompt's own do-not-default theme list ("Do NOT default to... Letting go... Divine timing") and `energy: letting_go` is literally that archetype. The question does invite it, and execution is fresh, but a theme-bank reader would recognize it.
- **Language 2.** Clean, warm, quotable ("You are not behind — you are being taught").
- **Field coherence 2.** energy / energyLabel / message / deeperMeaning / guidance / closing all pull the same direction; message word count and format limits respected.
- **Complaint-resist 2.** Complaint not justified here.
- **Worst rendered sentence (mild):** "plans that slip, answers that stall, people who won't move at your pace" — presumes facts about the user, though it is soft cold-reading rather than a claim.

## O2 — "ปีนี้ฉันจะโชคดีไหม" (TH, oracle) — 11/12

- **Directness 2.** "ปีนี้โชคดีกว่าที่คุณคิด" — a direct yes to a yes/no question, in headline form.
- **Specificity 2.** deeperMeaning reframes usefully (luck arrives as small overlooked opportunities, not lightning), and guidance is concrete and culture-appropriate ("ตอบรับคำชวน... อย่างน้อยเดือนละหนึ่งครั้ง", "จัดการเรื่องเงินพื้นฐานให้เรียบร้อย").
- **Non-template 1.** The "luck = your readiness" hedge and the closing proverb are stock fortune-app furniture.
- **Language 2.** Natural, modern Thai throughout — คุณ register, no archaisms. This proves the model CAN do modern Thai (making K2's failure a prompt problem, not a model limit).
- **Field coherence 2.** divine_timing / "จังหวะแห่งโอกาส" / message / guidance are all one reading.
- **Complaint-resist 2.**
- **Worst rendered sentence (mild):** closing "โชคมักเลือกคนที่เตรียมตัวรอไว้ก่อนเสมอ" — a proverb-cliché ("fortune favors the prepared").

## O3 — "¿Qué me depara el destino este año?" (ES question, oracle) — 4/12

- **Language 0 (automatic).** The entire card — headline, deeperMeaning, all 5 guidance bullets, closing — is in **English** for a Spanish question. Per rubric this is an automatic 0, and it makes the whole reading unusable for the user.
- **Root cause is the pipeline, not the model.** `params.resolvedLanguage` is `"English"` despite `locale: "es"`, and the assembled prompt literally orders: *"User language detected: English. Reply in English."* The system prompt's "Reply in the SAME language the user wrote in" is overridden by the harder per-request instruction. The language resolver evidently only knows en/th and defaults everything else to English. Fix the resolver (or pass the raw message language), not the model.
- **Directness 1.** "This year rewards what you dare to start." deflects "what will happen to me" into "it depends on you" — a half-answer.
- **Specificity 1 / Non-template 1.** New-year-resolution boilerplate ("write down one goal", "review monthly"); closing "you are holding the pen" is greeting-card stock.
- **Field coherence 1.** Internally consistent, but the user-facing artifact fails as a whole due to language.
- **Complaint-resist 0.** Fully justified: wrong language + life-coach template.
- **Worst rendered sentence:** the headline itself — "This year rewards what you dare to start." shown in English to someone who asked in Spanish.

## K1 — "I don't want a reading, I just need someone to talk to. Today was awful." (EN, talk) — 11/12

- **Directness 2.** Honors the explicit request: no reading, presence instead ("I am here, and I am not going anywhere"), invites them to unload.
- **Specificity 2.** Responds to exactly what was said; suggestions include the pitch-perfect "Can I just tell you what happened today?"
- **Non-template 2.** Reads human and in-character without kitsch.
- **Language 2.** Natural English.
- **Field coherence 1.** One rule slip: "Then **let the cards rest**..." — the talk schema/system forbids tarot jargon this turn ("no planets, signs, houses, **cards**, aspects"). It is used to *decline* a reading, so it lands softly, but it is a literal violation.
- **Complaint-resist 2.**
- **Worst rendered sentence (mild):** "awful days grow a little lighter once they are spoken aloud" — slightly stock comfort line.

## K2 — "ขอบคุณนะ ที่ผ่านมาช่วยได้เยอะเลย" (TH, talk) — 7/12

- **Language & register 0 — the flagged "ข้า" problem, confirmed.** The reply uses the archaic royal/period-drama first person **"ข้า"** three times ("ข้าน้อมรับไว้...", "ความอิ่มใจของข้า", "ข้ายังคงนั่งอยู่ตรงนี้เสมอ") plus archaic "ดั่ง" and calls the user "เธอ". This is costume-drama Thai, not the "natural and unforced, never stiff" native register the system prompt demands. A modern Thai user reads this as a bot in fancy dress. Compounding it: the suggestion chips are in normal modern Thai ("ฉัน...ไหม") — so the same card mixes ancient-register reply with modern-register chips. Contrast with C2/O2, where the model produced excellent modern Thai — the "mysterious oracle by candlelight" persona framing is what tips Thai output into ข้า-register; the talk prompt needs an explicit Thai-register instruction (e.g. "ใช้ภาษาไทยสมัยใหม่ สุภาพ ใช้สรรพนาม ฉัน/คุณ ห้ามใช้ ข้า/เจ้า/ดั่ง").
- **Directness 2.** Warmly receives the thank-you, the right move.
- **Specificity 2.** Acknowledges "ที่ผ่านมา" (the journey so far) specifically.
- **Non-template 1.** Candlelight purple prose ("ดั่งแสงเทียนที่นิ่งสงบกลางค่ำคืน") is fortune-teller kitsch.
- **Field coherence 1.** Register mismatch between reply and suggestions; otherwise valid (2 short paragraphs, 4 question chips).
- **Complaint-resist 1.** Partially justified — content is fine, but the register makes it feel canned.
- **Worst rendered sentence:** "การได้เดินเคียงข้างเธอในเส้นทางที่ผ่านมา คือความอิ่มใจของข้าเช่นกัน" — "ข้า/เธอ" ancient register in a modern chat app.

---

## Cross-cutting flags

### 1. Dead fields on every general reply (wasted tokens)
`currents` (2-3 objects, each label + 10-18-word sentence) and `whisper` are required by `generalReplySchema` (`lib/chat/general-reply-schema.ts`), generated and streamed on every C* call, and **never rendered**. In these samples that is roughly 60-90 words (~80-120 output tokens) per general reply — about 25-30% of the C* payload — paid for on every question. Ironically some of the best writing hides there (C2's "การลอกคราบ" current; C3's most explicit "answer" — "a feeling moving in both directions" — is in an unrendered current). Either render them or cut them from the schema.

### 2. Rules that FORCE a non-answer (general endpoint)
The C* system prompt (all three files, e.g. `C3.chat.json`) states:

> "Your job is to feel WHAT IS MOVING INSIDE the user — not to forecast events, not to give advice, not to summarize their question back to them."

For C3's "Does my crush like me back?" — a question about another person's feelings — this rule forbids the only answer the user wants. Any real question routed here (yes/no, when, should-I) is structurally unanswerable; the complaint is designed in. There is no tarot/oracle handoff, and the suggestion chips even generate follow-ups ("Should I confess my feelings to them?") that the same lens also cannot answer.

### 3. Contradictory instructions FORCE fabricated astrology (all C* cases)
The system prompt says: *"If no astrology context is supplied, lean purely on intuition from the message and **skip the astrological reference**."* But with birth=null (astrologyBlock empty), the closing user-prompt still commands: *"weave in exactly ONE short, real astrological reference (the transit planet + the natal planet it touches) as the 'why'"*, and the schema description doubles down: reflection must contain *"exactly ONE plain-words astrological reference."* The unconditional instruction wins: all three C* replies invented transits out of thin air (C1 Saturn-Sun, C2 Saturn-Moon, C3 Venus-Moon) and presented them as current fact ("Saturn pressing slowly against your Sun right now"). This is both a trust problem and template evidence — the fabrications converge on the same Saturn/Venus-on-luminary trope. Fix: make the reference conditional in the closing prompt and schema description, matching the system rule.

### 4. Language resolver defaults non-en/th to English (O3)
`resolvedLanguage: "English"` for `locale: "es"`; the prompt hard-instructs "User language detected: English. Reply in English." Any Spanish (or other third-language) user gets English readings regardless of model quality.

### 5. Thai register is prompt-dependent (K2 vs C2/O2)
Same model, same day: modern natural Thai on question/oracle endpoints, archaic "ข้า" register on talk. The talk endpoint's heavier "oracle by candlelight" persona induces it; add an explicit modern-Thai register rule to the talk system prompt.

### Verdict on the owner's complaint
Justified for the **general** endpoint (C*) — fixed scaffold, Barnum content, near-identical readings across languages, fabricated astrology, and a lens that cannot answer real questions — and for **O3** (wrong language) and **K2** (archaic Thai). NOT justified for O1/O2/K1, which answer directly with concrete, question-specific content: the oracle prompt's "answer-first headline" architecture demonstrably works and is the pattern the general endpoint should borrow.
