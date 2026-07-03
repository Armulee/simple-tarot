/**
 * Stage 1: reproduce the EXACT /api/situation prompt for each tarot case.
 * USER_SITUATION_PROMPT, buildGeneralMeaningSummary and buildSituationPrompt
 * are copied verbatim from app/api/situation/route.ts (they are not exported).
 * Codex rows come from the repo's bundled meanings JSON (see codex.mts).
 */
import { getBaseCardName, isReversed, type TarotCodexRow } from "@/lib/tarot/rag"
import { codexMapForCards } from "./codex.mts"
import { TAROT_CASES } from "./cases.mts"
import { writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"

// --- verbatim from app/api/situation/route.ts:10-44 ---
const USER_SITUATION_PROMPT = `
You are a tarot reasoning engine.

CURRENT QUESTION FIRST (highest priority):
- Everything you extract (topic, intent, emotion, focus, questionDomain) and the cardReadingDirection MUST be about the "Current user question" block — the user's LATEST message.
- "Conversation context" and "Previous tarot reading" are BACKGROUND ONLY. Use them to figure out what an ambiguous current question really means (e.g. "who?", "what about him?", "so should I wait?" after a topic) — never as the question itself.
- Never re-answer a previous question from the context. If the current question changes topic, drop the old topic entirely and reason only about the new one.

Your job is to:
1. Extract the user's situation (topic, intent, emotion, focus)
2. Set questionDomain: classify the USER'S QUESTION into exactly one of general | legal | medical | financial (English enum values only).
   - legal: law, contracts, lawsuits, rights, immigration rules, criminal/regulatory matters.
   - medical: physical or mental health care, symptoms, diagnosis, treatment, medication, therapy in a clinical sense.
   - financial: investing, trading, specific tax positions, debt relief strategies, retirement or estate planning that implies licensed financial/tax advice.
   - general: all other topics (love, career vibes, spirituality, tarot itself, creative work, everyday decisions without the above).
   When in doubt between a sensitive label and general, prefer general unless the user clearly seeks actionable professional-domain guidance.
3. Determine WHAT the tarot answer should be (cardReadingDirection)

topic examples: career, relationship, money, project, decision
intent examples: reconciliation, success, change, uncertainty
emotion examples: hope, anxiety, confusion, curiosity

cardReadingDirection rules:
- Write 3-6 sentences in ENGLISH (this is an internal directive for the narrator, never shown to users)
- Detect the question type first:
  A) YES/NO question (e.g. "will I…", "should I…", "is this…") → FIRST SENTENCE must be a clear verdict (yes/no/maybe/warning + one-line reason)
  B) HOW/STRATEGY question (e.g. "how should I…", "what approach…", "ยังไงให้…", "ทำยังไง") → FIRST SENTENCE must be the core strategy or actionable approach, NOT "yes you will succeed"
  C) WHAT/WHO/WHEN question → FIRST SENTENCE must directly answer what/who/when
- NEXT SENTENCES: For EACH card drawn, write one sentence explaining what that specific card means for this question IN THE PRACTICAL DOMAIN of the question. Do NOT just restate the card's textbook meaning — translate the symbolism into concrete, domain-specific advice. Example for a content strategy question: "Card 1 (Justice) = the user should focus on comparison-style or fact-checking content that helps the audience make fair judgments, not generic 'be honest' advice."
- LAST SENTENCE: Give concrete, practical advice the user can act on — specific enough that they could start doing it today
- If conversation context or a previous reading is provided, use it ONLY to disambiguate what the user means (same thread/topic). cardReadingDirection must be justified entirely by the CURRENT cards and the user's current message. Do NOT restate, preserve, or copy the verdict or advice from the previous reading—each sentence must reflect reasoning from THIS spread. Prior text is not evidence; the new cards are.
- Be SPECIFIC and DECISIVE — never say "it depends" or give wishy-washy maybe answers. Pick a side.
- The narrator model is weak at reasoning — your direction IS the answer. If your direction is vague, the final answer will be vague.
- CRITICAL: Never give generic self-help advice like "be honest and transparent". Always tie card meanings to the SPECIFIC domain the user asked about (content strategy, business, relationships, etc.) with actionable details.
`

// --- verbatim from app/api/situation/route.ts:104-120 ---
function buildGeneralMeaningSummary(
    cards: string[],
    codexMap: Map<string, TarotCodexRow>,
): string {
    return cards
        .map((cardDisplay) => {
            const baseName = getBaseCardName(cardDisplay)
            const reversed = isReversed(cardDisplay)
            const row = codexMap.get(baseName)
            if (!row) return `${cardDisplay}: (no codex data)`
            const meaning = reversed
                ? row.reversed_meaning_general
                : row.meaning_general
            return `${cardDisplay}: ${meaning}`
        })
        .join("\n")
}

// --- verbatim from app/api/situation/route.ts:122-151 ---
function buildSituationPrompt({
    question,
    cardSummary,
    conversationContext,
    previousInterpretation,
}: {
    question: string
    cardSummary: string
    conversationContext?: string | null
    previousInterpretation?: string | null
}) {
    const parts: string[] = []

    if (conversationContext) {
        parts.push(
            `Conversation context (background only — for disambiguating the current question, never the question to answer):\n${conversationContext}`,
        )
    }
    if (previousInterpretation) {
        parts.push(
            `Previous tarot reading (background only — not evidence for this draw):\n${previousInterpretation}`,
        )
    }
    if (cardSummary) {
        parts.push(`Cards drawn and their meanings:\n${cardSummary}`)
    }
    parts.push(`Current user question (ANSWER THIS):\n${question}`)

    return parts.join("\n\n")
}

const OUT_DIR = process.argv[2]
if (!OUT_DIR) throw new Error("usage: gen-stage1.mts <out-dir>")
mkdirSync(OUT_DIR, { recursive: true })

const index: Record<string, unknown>[] = []
for (const c of TAROT_CASES.filter((c) => c.branch === "situation")) {
    const codexMap = codexMapForCards(c.cards)
    const cardSummary = buildGeneralMeaningSummary(c.cards, codexMap)
    const prompt = buildSituationPrompt({
        question: c.question,
        cardSummary,
        conversationContext: c.conversationContext ?? null,
        previousInterpretation: c.previousInterpretation ?? null,
    })
    const file = join(OUT_DIR, `${c.id}.stage1.json`)
    writeFileSync(
        file,
        JSON.stringify(
            {
                caseId: c.id, kind: c.kind, model: "deepseek/deepseek-v3.2",
                system: USER_SITUATION_PROMPT, prompt,
            },
            null, 2,
        ),
    )
    index.push({ caseId: c.id, file })
}
writeFileSync(join(OUT_DIR, "stage1-index.json"), JSON.stringify(index, null, 2))
console.log(`wrote ${index.length} stage-1 prompts to ${OUT_DIR}`)
