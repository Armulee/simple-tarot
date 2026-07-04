# Cross-Case Template-Detection Analysis — AskingFate Stage-2 Responses

Corpus: 16 files (`T1–T12, T1L, T2L, T3L, T5L` — `*.stage2.result.json`), 13 English + 3 Thai (T2, T7, T2L).
Scope: structural repetition ACROSS cases only. Individual quality not evaluated.

---

## 1. Headline patterns — 16/16 drawn from a two-word template vocabulary

Every one of the 16 headlines uses either the hedge **"Likely / น่าจะ"** or the noun **"signals / สัญญาณ"** (most use both). Grouped:

| Group | Construction | Count | Cases |
|---|---|---|---|
| A | `Likely yes — <clause>` (verbatim mold) | **7** | T1, T5, T6, T8, T9, T10, T1L |
| B | `The signals point (clearly) to <X>` | **3** (+1 Thai) | T11, T12, T3L (+T7 "สัญญาณชี้ไปทาง..." = literal Thai translation of the same mold) |
| C | Thai `น่าจะ<verb> ...` ("probably ...") | 2 | T2 ("น่าจะไม่กลับมา..."), T7 ("น่าจะหาย...") |
| D | Other likely/signals hedges | 4 | T3 ("The likely path: ..."), T4 ("Likely soon — ..."), T5L ("Mixed signals — likely yes if..."), T2L ("สัญญาณก้ำกึ่ง...") |

Secondary tics:
- **9/16** headlines contain an em-dash pivot (`<verdict> — <qualifier>`).
- **10/16** English headlines contain the word "likely"; both pure-Thai verdict headlines open with "น่าจะ".
- **9/16** headlines contain "signals/สัญญาณ".
- Full list:

```
T1   Likely yes — the signals lean toward an offer.
T2   น่าจะไม่กลับมา เพราะรากฐานเดิมพังไปแล้ว
T3   The likely path: one niche, one steady system.
T4   Likely soon — within the next one to three months
T5   Likely yes — if it's handled fairly and openly.
T6   Likely yes — go, and she likely joins
T7   น่าจะหาย สัญญาณชี้ไปทางการฟื้นตัวชัด
T8   Likely yes — the pay signals look genuinely good.
T9   Likely yes — money improves after a mid-month pinch.
T10  Likely yes — the healing is already underway.
T11  The signals point clearly to 4
T12  The signals point to one chapter closing now
T1L  Likely yes — the signals lean in your favor.
T2L  สัญญาณก้ำกึ่ง มีโอกาสแต่ยังไม่ชัดตอนนี้
T3L  The signals point to structure before scale
T5L  Mixed signals — likely yes if it's fair.
```

The template survives topic changes as extreme as a job offer (T1), a mother's cancer prognosis (T7), and "what is 2+2" (T11), and survives translation into Thai (T7's headline is word-for-word the Group-B English mold).

## 2. Opener-phrase frequency (detailedHtml + interpretation)

Occurrences per file (case-insensitive; `lean*` = lean/leans/leaning):

| File | the signals | the energy | lean* | pattern(s) | พลังงาน | สัญญาณ | แนวโน้ม |
|---|---|---|---|---|---|---|---|
| T1  | 1 | 1 | 2 | 1 | 0 | 0 | 0 |
| T2  | 0 | 0 | 0 | 0 | 1 | 2 | 0 |
| T3  | 1 | 1 | 1 | 1 | 0 | 0 | 0 |
| T4  | 0 | 1 | 1 | 1 | 0 | 0 | 0 |
| T5  | 1 | 1 | 1 | 1 | 0 | 0 | 0 |
| T6  | 2 | 2 | 2 | 1 | 0 | 0 | 0 |
| T7  | 0 | 0 | 0 | 0 | 3 | 1 | 1 |
| T8  | 1 | 1 | 1 | 0 | 0 | 0 | 0 |
| T9  | 1 | 1 | 1 | 1 | 0 | 0 | 0 |
| T10 | 0 | 1 | 2 | 1 | 0 | 0 | 0 |
| T11 | 0 | 1 | 2 | 1 | 0 | 0 | 0 |
| T12 | 0 | 1 | 2 | 1 | 0 | 0 | 0 |
| T1L | 0 | 2 | 2 | 1 | 0 | 0 | 0 |
| T2L | 0 | 0 | 0 | 0 | 1 | 2 | 0 |
| T3L | 0 | 1 | 1 | 1 | 0 | 0 | 0 |
| T5L | 1 | 2 | 1 | 1 | 0 | 0 | 0 |
| **TOTAL** | **8** | **16** | **19** | **12** | **5** | **5** | **1** |

= **66 occurrences of 7 stock phrases** in just two fields across 16 readings. Every English file (13/13) uses "the energy" at least once; every Thai file (3/3) substitutes "พลังงาน". So **16/16 readings invoke the energy-vocabulary**, and 16/16 use at least 2 of the 7 phrases.

Whole-file totals (all fields, includes the duplicated keyMessage/interpretation/conclusion): the signals **20**, the energy **20**, lean* **33**, pattern(s) **14**, พลังงาน **7**, สัญญาณ **18**, แนวโน้ม **2** — **114 total**. Bonus hedges: "tend(s) to" **35**, "likely" **45**, "น่าจะ" **17** (62 combined probability-hedges).

## 3. Structural rhythm — one paragraph skeleton, stamped 16 times

Shape metrics for `detailedHtml`:

- **15/16 have exactly two `<p>` blocks** (T9 has three); 7/16 append a `<ul>` of exactly 3 `<li>` action items.
- Gold highlights: **1–3 per reading, median 2** — never 0, never 4+ (`highlight-gold` counts: 2,2,3,2,2,3,3,2,3,2,2,2,2,2,2,1).
- **16/16 first sentences follow the same mold**: `[The energy | The pattern | The signals | I sense | พลังงาน...] + [leans/points/ชี้/เอียงไปทาง] + [verdict]`. Paragraph 2 is invariably the pivot: "One thread to watch / One thing worth watching / One condition / ที่น่าระวังคือ..." → advice.

Four side-by-side samples (verdict → nuance → advice rhythm):

| | Paragraph 1 opens (VERDICT) | Paragraph 2 opens (NUANCE → ADVICE) |
|---|---|---|
| **T1** | "The pattern here looks genuinely encouraging — ... it **leans toward** closing in your direction." | "**One thread to watch:** the deciding factor tends to be fit... So if you reach out again, lead with collaboration..." |
| **T4** | "The **energy** I'm reading **leans toward** the next one to three months — ..." | "**One condition sits under that timing:** ... a deliberate choice to be available..." |
| **T8** | "I sense a comfortable number here — the **signals lean toward** solid, well-earned pay..." | "**The second thread points to** growth over time: ... it helps to know your numbers: [3-item list]" |
| **T2L** (Thai) | "**พลังงาน**รอบคำถามนี้บอกว่า... (the energy around this question says...)" | "ทิศทางข้างหน้าเลยออกแนวหมอกลงจัด — ... **สิ่งที่สัญญาณเน้นมากที่สุดคือ** (what the signals stress most is)..." |

Same skeleton, same hedged-verdict opener, same "one thing to watch" pivot, same 1–3 gold spans — in both languages.

## 4. nextStep — 16/16 begin with the same imperative

**Try: 13/16. ลอง (Thai "try"): 3/16. Total: 16/16.** Zero "Consider"/"Maybe" variety even where allowed; every reading ends with "Try <gerund>... today/this week" ("Try sending... today", "Try defining... today", "Try checking... today", "ลองเริ่มจด...ตั้งแต่วันนี้"). The forced stem makes all 16 closers rhythmically identical, and 8 additionally end on a "today / this week / วันนี้" time-anchor.

## 5. suggestions — 64 chips, 5 molds, with cross-case near-duplicates

All 64 chips (16×4) fall into five interrogative shapes, none escape:

| Shape | Count |
|---|---|
| `Will/Is ...?` (yes-no) | 20 |
| `What/Which/How/Where ...?` | 13 |
| `When will ...?` | 10 |
| `Should I ...?` | 9 |
| Thai `...ไหม` (yes-no) | 6 |
| Thai other | 6 |

Cross-case duplicates and near-duplicates:

- **Exact duplicate:** "When will I hear back about the offer?" — appears verbatim in **T1 and T1L**.
- **Near-identical triplet across 3 cases:** "Is this job the right move long-term?" (T1) / "Is this job right for me long-term?" (T8) / "Is this company right for me long-term?" (T1L).
- "Should I negotiate the salary?" (T1) vs "Should I negotiate for a higher base?" (T8).
- "When could I realistically hit 100k?" (T3) vs "When will I hit 100k followers?" (T3L).
- Thai: "เขายังคิดถึงฉันอยู่บ้างไหม" (T2) vs "เขายังคิดถึงฉันอยู่ไหม" (T2L) — differ by one particle.
- "Should I post daily or weekly?" (T3) vs "Should I post every single day?" (T3L).

## 6. keyMessage / interpretation / conclusion — 100% verbatim concatenations

Programmatic check across all 16 files:

- `keyMessage === headline + " " + subtitle`: **16/16 true**
- `conclusion === nextStep`: **16/16 true**
- `interpretation === perCard sentences joined by " "`: **16/16 true**

Example 1 — T4 keyMessage is a raw glue-join, complete with the missing-period artifact where headline meets subtitle:

> headline: `"Likely soon — within the next one to three months"`
> subtitle: `"The window tends to open at your next routine or season shift — if you choose to be visible."`
> keyMessage: `"Likely soon — within the next one to three months The window tends to open at your next routine or season shift — if you choose to be visible."`

(Same ungrammatical seam in T6, T11, T12, T3L, e.g. T11: "The signals point clearly to 4 No hidden layers here — ...")

Example 2 — T5 conclusion is a byte-for-byte copy of nextStep:

> nextStep: `"Try writing down exactly what doing it involves today, confirming the key terms in writing with anyone affected, then committing without second-guessing."`
> conclusion: `"Try writing down exactly what doing it involves today, confirming the key terms in writing with anyone affected, then committing without second-guessing."`

So of the 10 text fields per reading, **three carry zero new information** — a user reading any single response twice-over sees the repetition immediately, and across responses the duplicated fields double-expose every template phrase.

## 7. Template score: **9 / 10**

Every reading — regardless of topic, spread size, or language — is stamped from one mold: a "Likely/signals" hedged headline, a 2-paragraph detailedHtml that opens "The energy/pattern/signals lean(s) toward..." and pivots on "one thing to watch," exactly 1–3 gold highlights, a "Try...today" closer duplicated verbatim into conclusion, and follow-up chips so formulaic they collide word-for-word across different cases. It stops short of 10 only because the card-specific content inside the skeleton genuinely varies (perCard sentences, concrete advice details) and minor structural variants exist (one 3-paragraph block, optional `<ul>`).

### Root-cause note (structural, not stylistic)
The three concatenated fields (keyMessage, interpretation, conclusion) are apparently assembled by code or forced by the prompt schema, and the "Try/ลอง" stem is prompt-mandated — meaning part of the "template feel" is baked into the pipeline itself and cannot be fixed by better sampling alone.
