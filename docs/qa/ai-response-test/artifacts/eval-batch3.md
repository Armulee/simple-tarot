# Eval batch 3 — T4, T6, T8, T9 (deepseek/deepseek-v4-pro, json mode, temp 0.6)

Rubric: `harness/eval-rubric.md`. Scores 0–2 per axis, 6 axes, /12 total.

---

## T4 — when/timing: "When will I meet my soulmate?" (3 cards, English)

**Focus check — does it give a time frame, and is it grounded?**
Yes, a concrete one: headline "Likely soon — within the next one to three months", reinforced in detailedHtml with a highlighted "the next one to three months". Grounding: the narrator did NOT invent this — it comes verbatim from `<reading_direction>` ("Soon — within the next one to three months... because all three cards point to fast, favorable timing"). So within this stage the answer is fully grounded and faithfully hedged ("likely", "tends to"). Pipeline-level caveat: the 1–3-month window is manufactured precision from the upstream stage. "Soon" has real symbolic footing (Eight of Wands is the classic speed/momentum card, Wheel of Fortune = cycle change), but nothing in tarot data supports "one to three months" specifically. The narrator is not at fault; the fabrication risk lives upstream.

| Axis | Score | Notes |
|---|---|---|
| Directness | 2 | Headline answers WHEN in the first breath, with the mechanism (routine/season shift) right behind it. |
| Specificity | 2 | Soulmate domain throughout: dating profile, one social scene, replying fast, new environments. Not swappable to another question. |
| Non-template feel | 1 | Dense canned tone stack: "The energy I'm reading leans toward", "the pattern points", "the signals suggest". Headline follows the app-wide "Likely X —" formula (all 4 cases in this batch open with "Likely"). |
| Language & register | 2 | Natural conversational English ("the smart play", "quietly hoping"). |
| Field coherence | 2 | Headline / subtitle / detailedHtml / perCard all tell one story (soon + condition of being visible + fast momentum). keyMessage concatenation is ungrammatical ("...months The window...") but keyMessage isn't rendered in either view. |
| Legacy view quality | 1 | **The legacy page never answers "when."** keywords + interpretation + conclusion describe HOW the meeting happens (cycle change, deliberate choice, fast momentum) but the 1–3-month verdict lives only in headline/subtitle, which legacy doesn't show. A WHEN question gets a when-less page. |

**Total: 10/12**

**Prompt constraint that caused a weakness:** back_compat_rules — "interpretation = perCard[].sentence joined with spaces... Do NOT write fresh content into the back-compat fields." Since no perCard sentence carries the time frame (they carry per-card mechanisms, per per_card_rules "not a restatement of the headline"), the composed legacy interpretation structurally cannot contain the timing verdict.

**Worst visible sentence:** "Once contact sparks, momentum builds fast and gathers speed." (cardInsight 3 — says the same thing twice in nine words.)

**Verdict:** Complaint not justified in chat — this is a direct, specific, timed answer. Two real issues: the time frame is upstream-fabricated precision the app presents as read-from-cards, and the legacy view silently drops the "when" entirely.

---

## T6 — multi-part: quit job + move to Japan + will girlfriend come (5 cards, English)

**Focus check — are ALL THREE sub-questions answered, or blurred?**
All three are answered, each with dedicated real estate: quit the job (Ten of Wands perCard: "The current job cycle looks complete; resigning is setting down a finished load"), move to Japan (Fool perCard + detailedHtml paragraph 1), girlfriend joining (headline "she likely joins", Star + King of Cups perCards, detailedHtml paragraph 2 with the condition — her yes depends on a safe concrete plan). The ≤10-word headline manages to hold both verdicts ("Likely yes — go, and she likely joins") because quit+move collapse into one decision. **Latent format risk worth logging:** this only fit because the reading_direction was uniformly positive; a split verdict (yes to Japan, no to girlfriend) would not survive the headline length cap and would blur. Not penalized here — score what's on the page.

| Axis | Score | Notes |
|---|---|---|
| Directness | 2 | Both decisions + the relationship question all get explicit verdicts; the girlfriend answer even carries its own condition (emotional safety + joint plan). |
| Specificity | 2 | Target departure date, work-visa research, her career options, housing, budget — concrete to Japan relocation, not generic leap-of-faith talk. |
| Non-template feel | 1 | Four canned tone phrases in one detailedHtml ("The signals here lean", "the energy reads like", "the pattern points to", "the signals suggest"); headline reuses the batch-wide "Likely yes —" rhythm; "Likely yes... she likely joins" doubles "likely" in 8 words. |
| Language & register | 2 | Warm and natural; "turn *my move* into *our plan*" is a genuinely good beat. |
| Field coherence | 2 | Five perCard sentences map cleanly onto the three sub-questions with no contradictions; cardInsights match their cards; suggestions extend the same storyline (visa/work, telling the boss, adjusting). |
| Legacy view quality | 2 | The concatenated interpretation happens to read as a complete five-sentence answer covering all three sub-questions in order, and the conclusion is a real next action. Best legacy composition in the batch. |

**Total: 11/12**

**Prompt constraint that caused a weakness:** headline_rules "Length: ≤10 Thai words, or the equivalent terse length... (~8 English words)" + direct_answer_first forces multi-part verdicts into one compressed clause — it worked here only because both answers pointed the same way.

**Worst visible sentence:** "The timing favors the leap, but her yes leans on a calm, concrete plan you build together." (subtitle — "her yes leans on" is contorted phrasing to satisfy the tone-word list.)

**Verdict:** Complaint not justified — all three sub-questions get distinct, specific answers; this is the strongest case in the batch. The format survived only because the verdict was uniformly positive.

---

## T8 — follow-up, same topic: "What about the salary — will it be good?" (2 cards, English)

**Focus check — salary answered specifically, or job question re-answered?**
Salary, specifically and only. Headline: "Likely yes — the pay signals look genuinely good." Every field is compensation-domain: base vs total package, workload attached to the number, market-range research, target and walk-away figures, one prepared ask (base bump / remote days / 6-month review). Zero recycling of the previous interpretation ("skills and momentum lining up", "past disappointment" — none of it reappears), no "last time" meta-callbacks. The follow-up plumbing worked as designed.

| Axis | Score | Notes |
|---|---|---|
| Directness | 2 | First visible verdict is about pay, with the honest caveat (tied to heavy workload) immediately attached. |
| Specificity | 2 | Negotiation-grade detail: market range for the exact role/seniority, walk-away number, review-at-6-months ask. This could not be pasted under a different question. |
| Non-template feel | 1 | "the signals lean toward", "the energy ties", "The second thread points to" — the rubric's flagged canned phrases; fourth consecutive "Likely yes/soon —" headline in this batch. |
| Language & register | 2 | "I sense a comfortable number here" — natural, on-persona, casual without being sloppy. |
| Field coherence | 2 | Headline (good pay) / subtitle (workload + grows over time) / perCard / detailedHtml all consistent; suggestions stay in the offer-negotiation orbit. |
| Legacy view quality | 1 | interpretation is two **headless fragments**: "Points to pay that's solid and truly earned..." / "Suggests compensation that grows steadily..." — subjectless sentences that read like card-note soup as a standalone page body, even though the content is right. |
| |

**Total: 10/12**

**Prompt constraint that caused a weakness:** per_card_rules "Do NOT include the card name inside the sentence text. Do NOT use 'this card' / 'the card' phrasing" pushes the model into verb-first subjectless sentences ("Points to...", "Suggests..."), and back_compat_rules then concatenates those fragments verbatim into the legacy interpretation.

**Worst visible sentence:** "Points to pay that's solid and truly earned, but tied to a demanding scope — worth pinning down exactly what the salary covers." (legacy interpretation opener — no subject; grammatical orphan on the page.)

**Verdict:** Complaint not justified — the salary question is answered head-on with unusually practical detail and no bleed from the prior job reading. Only the legacy page's fragment grammar betrays the template machinery.

---

## T9 — follow-up, topic switch: "Forget that — will my finances improve this month?" (3 cards, English)

**Focus check — any love-context bleed? Suggestions on finance?**
Zero bleed. Not one field references the ex, texting, silence, reunion, or any relationship concept; the prior reading's vocabulary ("emotional door", "pull backward") is completely absent. All four suggestions are finance ("Which income source should I focus on?", "Should I take on extra work this month?", "Is a big purchase okay right now?", "When will my savings really grow?"). The topic-switch guard ("ON CONFLICT, CURRENT WINS") held perfectly.

| Axis | Score | Notes |
|---|---|---|
| Directness | 2 | "Likely yes — money improves after a mid-month pinch" answers the yes/no AND the within-this-month timing in one line. |
| Specificity | 2 | Gig/sale/invoice openings, extension or payment plan for the shortfall, routing gains to household/long-standing-client income, buffer set aside now — concrete money mechanics. |
| Non-template feel | 1 | "I sense the signals leaning toward", "the energy favors", "the pattern here says", "the direction is toward" — one canned tone phrase per paragraph; same "Likely yes —" headline mold. "climbs in a zigzag, not a straight line" is a genuinely fresh image, though. |
| Language & register | 2 | Casual, vivid English ("something shinier", "name it out loud fast"). |
| Field coherence | 2 | Early opening → mid-month squeeze → month-end stability arc is identical across cardInsights, headline/subtitle, detailedHtml, and perCard; no contradictions. Minor redundancy: subtitle re-states the mid-month squeeze the headline already announced, thinning its "adds real information" duty. |
| Legacy view quality | 2 | Concatenated interpretation reads as a complete month-arc narrative with full sentences; keywords ("fresh opportunity, mid-month squeeze, lasting stability") actually summarize; conclusion is actionable. |

**Total: 11/12**

**Prompt constraint that caused a weakness:** none materially — the subtitle redundancy brushes against subtitle_rules ("Must NOT repeat the headline verbatim. Must add real information"), a soft violation in spirit, not letter.

**Worst visible sentence:** "The climb isn't smooth — expect a squeeze mid-month before things settle into something steadier." (subtitle — the user has already read "after a mid-month pinch" one line up; two of the first two lines say the same thing.)

**Verdict:** Complaint not justified — clean, total topic switch with a specific, structured finance answer and finance-only follow-up chips. The best follow-up-handling behavior one could ask of this pipeline.

---

## Batch-level pattern (for the owner)

1. **The "Likely X —" headline mold is universal.** All four headlines in this batch open with "Likely". Cause: direct_answer_first + the TONE WORDS PREFER list ("likely, tends to, leans toward, the signals point to, the energy here suggests") — the model treats the allow-list as a mandatory vocabulary, so every reading shares the same first word and the same hedging phrases. This is the single biggest driver of the "looks like a template" complaint, even when the content underneath is genuinely question-specific (as it was in all four cases here).
2. **Legacy composition is structurally lossy.** Because interpretation must equal joined perCard sentences and the verdict may only live in headline/subtitle, WHEN/YES-NO verdicts can vanish from the legacy page entirely (T4) or arrive as subjectless fragments (T8).
3. **Grounding note:** timing precision (T4's "one to three months") is authored by the upstream reading_direction stage, not by cards or the narrator. If the owner is worried about fabricated specificity, the audit target is the stage that writes reading_direction.
4. **Multi-part headroom:** T6 fit three answers into the fixed format only because all five cards pointed the same way. A split verdict would not fit ≤8–10 headline words; consider allowing the subtitle to carry the second verdict explicitly.

| Case | Score | Verdict |
|---|---|---|
| T4 | 10/12 | Direct timed answer; timing is upstream-invented precision; legacy page drops the "when" |
| T6 | 11/12 | All three sub-questions answered distinctly; format survived thanks to a uniform verdict |
| T8 | 10/12 | Salary answered specifically, no re-answer of the job question; legacy reads as fragments |
| T9 | 11/12 | Perfect topic switch, zero love bleed, finance-only suggestions |
