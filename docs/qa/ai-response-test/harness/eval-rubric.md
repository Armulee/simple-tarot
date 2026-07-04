# Evaluation rubric — AskingFate tarot response QA

You are evaluating a simulated production response against the exact prompt that produced it.
The owner's complaint: "AI response is not answering the question and looks like a template."

## What the user actually SEES

**Chat UI (new)**, top to bottom:
1. `cardInsights[i]` — italic quote under each card image
2. `headline` — biggest text (the verdict)
3. `subtitle` — under headline
4. `detailedHtml` — decorated "Detailed" block
5. `perCard[].sentence` — chip list per card
6. `suggestions` — follow-up chips
(`nextStep` shows only as a fallback; `keyMessage`/`keywords`/`interpretation`/`conclusion` are NOT shown in chat.)

**Legacy /tarot page + shared reading view**:
- `keywords` (chips), `interpretation` (main body!), `conclusion`
- NOTE: by schema instruction, `interpretation` = perCard sentences concatenated, `conclusion` = nextStep verbatim. Judge whether that composition reads as a real answer to the question.

## Score each (0–2, 2 = good)

1. **Directness** — does the headline (chat) / interpretation (legacy) directly answer the actual question asked (its specific sub-parts too, for multi-part questions)?
2. **Specificity** — content tied to the question's concrete domain (salary, TikTok, Japan, cancer, 2+2...) vs generic "trust the process" filler that would fit any question.
3. **Non-template feel** — would three different readings from this app feel distinct? Flag canned phrases ("the signals lean", "the energy points to", "พลังงานช่วงนี้"), fixed rhythm, formulaic structure.
4. **Language & register** — right language; natural native phrasing (Thai must read like casual texting per the prompt, not translated Thai).
5. **Field coherence** — headline vs detailedHtml vs perCard consistent? Any contradictions (e.g. verdict says no, card chips sound positive)?
6. **Legacy view quality** — read keywords+interpretation+conclusion alone as a page: is it an answer, or fragment soup?

## Also report
- Whether any prompt constraint directly CAUSED a weakness (cite the constraint text from the prompt file).
- The single worst sentence a user would see, verbatim.
- 1-2 sentence overall verdict: would the owner's complaint ("template, not answering") be justified for this case?
