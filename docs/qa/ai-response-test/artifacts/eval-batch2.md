# Eval batch 2 — T3 / T3L / T5 / T5L

Rubric: `harness/eval-rubric.md`. Scores 0–2 per axis, 6 axes, max 12.
Both pairs share the same system prompt and instruction tail; the only prompt difference is the head:
- **Chat branch (T3, T5)**: `<user_situation>` + `<reading_direction>` (stage1 planner output) + `<card_energies>`.
- **Legacy branch (T3L, T5L)**: raw codex text (`Card 1 (…): … Yes/No: … Astrology: …`), no reading_direction — so the "CRITICAL NARRATOR RULE" is dormant and the model improvises from the codex + few-shot examples.

---

## T3 — chat flow, "How should I grow my TikTok channel to 100k followers?" (The Emperor)

| Axis | Score | Notes |
|---|---|---|
| Directness | 2 | Headline "The likely path: one niche, one steady system." is the strategic direction, correctly avoids yes/no framing for a how-question. |
| Specificity | 2 | Genuinely content-creator concrete: define niche in one sentence, 30-day content calendar with fixed posting times, remake best-performing video as pilot of a named weekly series, 2–3 repeatable series formats. Caveat: nothing TikTok-*mechanics* specific (no hooks, FYP, watch time, sounds) — it's platform-agnostic creator strategy, but it is real strategy, not mystical filler. All the specificity comes straight from stage1's `reading_direction`. |
| Non-template feel | 1 | Field content is distinct, but the connective tissue is the canned hedge lexicon the rubric flags ("The pattern here leans hard toward…", "the signals point to", "The energy suggests") and the detailedHtml recipe (2 gold spans + a 3-item `<ul>` + "Try…" nextStep) is identical in shape to T5's. |
| Language & register | 2 | Natural conversational English; "leans hard toward predictability over novelty" reads human. |
| Field coherence | 2 | Insight, headline, subtitle, detailedHtml, perCard, nextStep all tell one story (niche + system + double down on winners). Back-compat fields correctly derived. |
| Legacy view quality | 1 | Shared/legacy surface = keywords "structure, consistency, niche authority" + a one-sentence, subjectless main body ("Points to running the channel like…") + conclusion. It conveys the strategy but reads as a fragment, not a page. |

**Total: 10/12**

- **Prompt-caused weakness**: the fragment main body is guaranteed by the back-compat rule "interpretation = perCard[].sentence joined with spaces" combined with per_card_rules "Do NOT include the card name inside the sentence. Do NOT use 'this card' phrasing" — perCard sentences are forced to be subjectless, so the legacy body always opens mid-clause. The hedge phrasing is directly seeded by probabilistic_tone: "PREFER words like: likely, tends to, leans toward, the signals point to, the energy here suggests".
- **Worst visible sentence** (shared reading view main body / perCard chip): "Points to running the channel like a well-managed operation — fixed posting schedule, repeatable series, and authoritative how-to content that turns viewers into followers."
- **Verdict**: Owner's complaint is NOT justified here. This actually answers the how-question with a concrete starter plan; the residual template feel is in the house hedging style, not the substance.

---

## T3L — legacy flow, same question (The Emperor, codex only)

| Axis | Score | Notes |
|---|---|---|
| Directness | 1 | What legacy users see as the main body is one fragment: "Points to building a repeatable posting system and clear niche authority…". It gestures at the strategy but never engages "TikTok" or "100k"; the fuller answer lives in headline/detailedHtml, which the legacy page does not render. |
| Specificity | 1 | Posting schedule / signature format / (in unused detailedHtml) batching content — mild content-domain flavor, but it's the generic "build a system" answer; no niche-definition step, no concrete first action, nothing tied to the 100k goal. |
| Non-template feel | 0 | The headline "The signals point to structure before scale" near-paraphrases the prompt's own few-shot answer for the *same card* ("The energy here points to building a system before you scale" — the side-business example). detailedHtml echoes the codex verbatim ("Predictability builds trust", "visible… results over grand gestures"). Keywords are character-for-character identical to T3's ("structure, consistency, niche authority"). This is assembled from canned prompt material. |
| Language & register | 2 | Fluent, natural English throughout. |
| Coherence | 1 | No contradictions, but keyMessage is a mechanical run-on: "The signals point to structure before scale A steady schedule and one clear niche likely beat chasing every trend." — the join rule `keyMessage = headline + ' ' + subtitle` breaks when the headline has no terminal punctuation. |
| Legacy view quality | 1 | keywords + one fragment sentence + a decent conclusion chip. Thin; the entire "reading" a legacy user gets is ~25 words of body text. |

**Total: 6/12**

- **Prompt-caused weaknesses**: (a) few-shot leakage — the HOW/STRATEGY English example in the prompt uses The Emperor, so with no `reading_direction` to displace it, the model reproduces the example's answer; (b) same fragment-body and hedge-lexicon causes as T3; (c) `keyMessage = headline + ' ' + subtitle` produces the run-on.
- **Worst visible sentence** (entire legacy main body): "Points to building a repeatable posting system and clear niche authority, letting steady visible results compound instead of scattered trend-chasing."
- **Verdict**: Complaint largely justified. Direction is fine, but the visible page is a one-fragment body stitched from the prompt's own example and codex boilerplate — three Emperor readings from this branch would be near-identical.

---

## T5 — chat flow, vague "Should I do it?" (Justice)

Context: stage1's `reading_direction` already committed hard — "Yes — do it… spell out the terms, responsibilities, and consequences with anyone involved… confirm the key terms in writing with the other people affected." Stage2 faithfully renders that invention.

| Axis | Score | Notes |
|---|---|---|
| Directness | 2 | "Likely yes — if it's handled fairly and openly." commits to a direction with a clear condition. Formally a direct answer to "Should I do it?". |
| Specificity | 1 | The steps sound concrete (write down what it involves, confirm key terms in writing, commit) but they are specific to a *fabricated* multi-party deal/contract scenario the user never described. If "it" is "text my ex" or "quit smoking", "confirm the key terms in writing with anyone affected" misfires. The headline condition ("if fair and open") would fit literally any question. No clarification is sought and none of the suggestion chips ask what "it" is — one ("Will the people involved cooperate?") doubles down on the invented scenario. |
| Non-template feel | 1 | "Yes, if you're honest about it" is the universal fortune-cookie answer to any vague question, delivered through the same canned hedges ("The energy here leans toward", "the signals favor") and the exact same detailedHtml recipe as T3 (gold spans + 3-item `<ul>` + "Try…"). Side by side with T3, the skeleton is visibly one mold. |
| Language & register | 2 | Natural, warm, casual English. |
| Field coherence | 2 | All fields consistently say conditional-yes; insight, perCard, nextStep aligned; back-compat fields correctly derived. |
| Legacy view quality | 1 | keywords "fairness, clear agreements, accountability, steady momentum, honesty" — fairness/honesty/accountability restate one concept, violating the system's own casual_tone rule ("NEVER repeat the same abstract concept multiple times with different words (e.g. saying 'honesty', 'transparency', 'fairness', 'integrity'…)"). Main body again a subjectless fragment ("Points to a fair, defensible choice — …"). |

**Total: 9/12**

- **Prompt-caused weaknesses**: (a) no clarification path exists — instructions force "Detect question type FIRST: YES/NO (will I, should I, is this) → Open with the leaning", and the narrator rule adds "You MUST follow it as your answer skeleton" and "do NOT become wishy-washy or noncommittal", so a confident answer to an unknown "it" is mandated; (b) the fabricated written-contract detail is copied from stage1's reading_direction, which stage2 is forbidden to override.
- **Worst visible sentence** (nextStep/conclusion): "Try writing down exactly what doing it involves today, confirming the key terms in writing with anyone affected, then committing without second-guessing." — invents "anyone affected" and written terms for an unspecified "it".
- **Verdict**: Complaint justified in spirit even though the craft is good: the app confidently answers an unanswerable question with a universal "yes if it's fair" template dressed up in fabricated concreteness. The right product behavior (a clarifying beat) is structurally impossible under the current prompt.

---

## T5L — legacy flow, same vague question (Justice, codex says "Yes/No: Maybe")

| Axis | Score | Notes |
|---|---|---|
| Directness | 1 | Visible main body ("Brings the energy of fair dealing and accountability — if the move holds up under honest scrutiny, momentum tends to build steadily.") answers nothing directly; the conditional-yes verdict only surfaces in the conclusion chip. The headline itself is self-muddled: "Mixed signals — likely yes if it's fair." (mixed *and* likely yes in the same breath). |
| Specificity | 1 | "Weigh it like a contract — who gains, who pays, can it all be said out loud" is at least a usable decision heuristic for an unknown "it" (and honestly a saner response to vagueness than T5's fabrication), but every visible sentence would fit any question ever asked. |
| Non-template feel | 1 | One genuinely fresh image ("reads like a set of scales waiting to settle" — a nice unnamed Justice nod), but wrapped in stock hedges and a verbatim codex echo ("visible, well-paced results over grand gestures"). Keywords are again a synonym cluster (fairness, honesty, accountability, balanced decision). |
| Language & register | 2 | Natural English, good rhythm. |
| Coherence | 1 | The "Mixed signals" opener sits awkwardly against every other field, which confidently says conditional-yes; a user reading headline then detailedHtml gets two different confidence levels. (Driven by codex "Yes/No: Maybe" colliding with the direct_answer_first rule.) |
| Legacy view quality | 1 | Synonym-soup keywords + one abstract fragment body + a conclusion that does carry the real answer. The only visible field doing any work is the conclusion. |

**Total: 7/12**

- **Prompt-caused weaknesses**: same no-clarification-path and fragment-body causes as above; additionally the codex line "Yes/No: Maybe" pushed the hedged "Mixed signals" opener that then conflicts with the rest of the reading.
- **Worst visible sentence** (entire legacy main body): "Brings the energy of fair dealing and accountability — if the move holds up under honest scrutiny, momentum tends to build steadily."
- **Verdict**: Complaint justified: the visible legacy page is hedge-speak fragments that fit any question, and its one direct answer is buried in the conclusion chip.

---

## Chat vs legacy branch consistency

**T3 vs T3L (TikTok)** — *Direction-consistent, quality-divergent.* Both land on "one niche + steady posting system", so no contradiction a user could catch. But the chat branch carries stage1's concrete plan (30-day calendar, named weekly series, remake best video), while the legacy branch, lacking `reading_direction`, regresses to the prompt's own Emperor few-shot answer and codex phrasing — same verdict, half the substance. Telling detail: both branches emit the *identical* keywords string ("structure, consistency, niche authority"), which is exactly the deterministic-template smell the owner complains about.

**T5 vs T5L (vague "Should I do it?")** — *Verdict-confidence diverges.* Chat says "Likely yes — go ahead today" with fabricated written-contract specifics (stage1 decided "Yes — do it"); legacy says "Mixed signals — likely yes if it's fair" and stays abstract (codex "Yes/No: Maybe"). Same "fair = yes" theme, but a user asking the identical question in the two flows gets different certainty levels, and only the chat flow invents other people and paperwork. Neither branch can ask what "it" is — the shared instruction tail forces a committed leaning on every should-question.

**Systemic pattern across all four**: the legacy-visible `interpretation` is always a subjectless fragment ("Points to…", "Brings the energy of…") because the back-compat join rule collides with the no-card-name rule in perCard sentences; and the PREFER-word list in `probabilistic_tone` guarantees every reading opens with "the signals/energy lean(s)/point(s) to", which is the single biggest contributor to the "template" feel.
