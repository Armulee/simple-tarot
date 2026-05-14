import { generateObject } from "ai"

import { situationSchema } from "@/lib/chat/situation-schema"
import { supabaseAdmin } from "@/lib/supabase"
import type { TarotCodexRow } from "@/lib/tarot/rag"
import { getBaseCardName, isReversed } from "@/lib/tarot/rag"

const MODEL = "deepseek/deepseek-v3.2"

const USER_SITUATION_PROMPT = `
You are a tarot reasoning engine. Your job is to:
1. Extract the user's situation (topic, intent, emotion, focus)
2. Determine WHAT the tarot answer should be (cardReadingDirection)

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

const LOVE_TOPICS = [
    "relationship",
    "love",
    "dating",
    "romance",
    "marriage",
    "partner",
    "ex",
]
const CAREER_TOPICS = [
    "career",
    "job",
    "work",
    "project",
    "business",
    "promotion",
]
const FINANCIAL_TOPICS = [
    "money",
    "financial",
    "finance",
    "wealth",
    "investment",
    "debt",
]

function pickMeaning(
    row: TarotCodexRow,
    topic: string,
    reversed: boolean,
): string {
    const t = topic.toLowerCase()

    if (LOVE_TOPICS.some((kw) => t.includes(kw))) {
        const val = reversed ? row.reversed_meaning_love : row.meaning_love
        if (val) return val
    }
    if (CAREER_TOPICS.some((kw) => t.includes(kw))) {
        const val = reversed ? row.reversed_meaning_career : row.meaning_career
        if (val) return val
    }
    if (FINANCIAL_TOPICS.some((kw) => t.includes(kw))) {
        const val = reversed
            ? row.reversed_meaning_financial
            : row.meaning_financial
        if (val) return val
    }

    return reversed ? row.reversed_meaning_general : row.meaning_general
}

function splitIntoSentences(text: string): string[] {
    return text
        .split(".")
        .map((s) => s.trim())
        .filter(Boolean)
}

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
        parts.push(`Conversation context:\n${conversationContext}`)
    }
    if (previousInterpretation) {
        parts.push(`Previous tarot reading:\n${previousInterpretation}`)
    }
    if (cardSummary) {
        parts.push(`Cards drawn and their meanings:\n${cardSummary}`)
    }
    parts.push(`User message:\n${question}`)

    return parts.join("\n\n")
}

export async function POST(req: Request) {
    try {
        let body: {
            question?: string
            cards?: string[]
            conversationContext?: string | null
            previousInterpretation?: string | null
        }
        try {
            body = await req.json()
        } catch {
            return new Response("Invalid or empty request body", {
                status: 400,
            })
        }

        const { question, cards, conversationContext, previousInterpretation } =
            body ?? {}
        if (!question) {
            return new Response("Question is required", { status: 400 })
        }

        const codexMap = new Map<string, TarotCodexRow>()
        if (cards && cards.length > 0 && supabaseAdmin) {
            const baseNames = [...new Set(cards.map(getBaseCardName))]
            const { data, error } = await supabaseAdmin
                .from("tarot_codex")
                .select("*")
                .in("card_name", baseNames)

            if (error) {
                console.error("[situation] tarot_codex fetch error:", error)
            }

            for (const row of data ?? []) {
                codexMap.set(row.card_name, row as TarotCodexRow)
            }
        }

        const cardSummary =
            cards && cards.length > 0
                ? buildGeneralMeaningSummary(cards, codexMap)
                : ""

        const prompt = buildSituationPrompt({
            question,
            cardSummary,
            conversationContext,
            previousInterpretation,
        })

        const { object: situation } = await generateObject({
            model: MODEL,
            schema: situationSchema,
            system: USER_SITUATION_PROMPT,
            prompt,
        })

        let cardMeanings: string[][] = []
        if (cards && cards.length > 0) {
            cardMeanings = cards.map((cardDisplay) => {
                const baseName = getBaseCardName(cardDisplay)
                const reversed = isReversed(cardDisplay)
                const row = codexMap.get(baseName)
                if (!row) return []
                const meaning = pickMeaning(row, situation.topic, reversed)
                return splitIntoSentences(meaning)
            })
        }

        return Response.json({ ...situation, cardMeanings })
    } catch (error) {
        console.error("Error extracting situation:", error)
        return new Response("Failed to extract situation", { status: 500 })
    }
}
