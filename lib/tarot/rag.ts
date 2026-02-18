import { supabaseAdmin } from "@/lib/supabase"

export type TarotCodexRow = {
    id: number
    card_name: string
    meaning_general: string
    reversed_meaning_general: string
    meaning_love: string | null
    reversed_meaning_love: string | null
    meaning_career: string | null
    reversed_meaning_career: string | null
    meaning_financial: string | null
    reversed_meaning_financial: string | null
    advice: string | null
    astrology: string | null
    timing: string | null
    yes_no: string | null
}

export type QuestionTopic =
    | "general"
    | "love"
    | "career"
    | "financial"
    | "yes_no"
    | "timing"
    | "advice"

const LOVE_KEYWORDS = [
    "love",
    "relationship",
    "partner",
    "dating",
    "romance",
    "marriage",
    "boyfriend",
    "girlfriend",
    "spouse",
    "ex",
    "crush",
    "compatibility",
    "heart",
]
const CAREER_KEYWORDS = [
    "job",
    "work",
    "career",
    "promotion",
    "boss",
    "colleague",
    "business",
    "interview",
    "salary",
    "profession",
]
const FINANCIAL_KEYWORDS = [
    "money",
    "finance",
    "financial",
    "wealth",
    "budget",
    "investment",
    "debt",
    "income",
    "savings",
]
const YES_NO_KEYWORDS = [
    "will i",
    "can i",
    "should i",
    "is it",
    "yes or no",
    "will he",
    "will she",
    "will we",
    "does he",
    "does she",
]
const TIMING_KEYWORDS = [
    "when",
    "how long",
    "timeframe",
    "soon",
    "timing",
    "date",
    "period",
]
const ADVICE_KEYWORDS = [
    "how",
    "what should",
    "advice",
    "guidance",
    "recommend",
    "suggest",
]

export function extractTopicsFromQuestion(question: string): QuestionTopic[] {
    const q = question.toLowerCase().trim()
    const topics: QuestionTopic[] = ["general"]

    if (LOVE_KEYWORDS.some((kw) => q.includes(kw))) topics.push("love")
    if (CAREER_KEYWORDS.some((kw) => q.includes(kw))) topics.push("career")
    if (FINANCIAL_KEYWORDS.some((kw) => q.includes(kw)))
        topics.push("financial")
    if (YES_NO_KEYWORDS.some((kw) => q.includes(kw))) topics.push("yes_no")
    if (TIMING_KEYWORDS.some((kw) => q.includes(kw))) topics.push("timing")
    if (ADVICE_KEYWORDS.some((kw) => q.includes(kw))) topics.push("advice")

    return [...new Set(topics)]
}

export function getBaseCardName(cardDisplay: string): string {
    return cardDisplay
        .replace(/\s*\(reversed\)/gi, "")
        .replace(/\s*reversed/gi, "")
        .trim()
}

export function isReversed(cardDisplay: string): boolean {
    const lower = cardDisplay.toLowerCase()
    return lower.includes("(reversed)") || lower.includes("reversed")
}

export async function fetchTarotCodexForCards(
    cardDisplays: string[]
): Promise<Map<string, TarotCodexRow>> {
    if (!supabaseAdmin) return new Map()

    const baseNames = [...new Set(cardDisplays.map(getBaseCardName))]
    if (baseNames.length === 0) return new Map()

    const { data, error } = await supabaseAdmin
        .from("tarot_codex")
        .select("*")
        .in("card_name", baseNames)

    if (error) {
        console.error("[tarot-rag] fetch error:", error)
        return new Map()
    }

    const map = new Map<string, TarotCodexRow>()
    for (const row of data ?? []) {
        map.set(row.card_name, row as TarotCodexRow)
    }
    return map
}

export function buildRagContext(
    cardDisplays: string[],
    codexMap: Map<string, TarotCodexRow>,
    topics: QuestionTopic[]
): string {
    const parts: string[] = []

    for (let i = 0; i < cardDisplays.length; i++) {
        const display = cardDisplays[i]
        const baseName = getBaseCardName(display)
        const reversed = isReversed(display)
        const row = codexMap.get(baseName)
        if (!row) continue

        const cardParts: string[] = []
        cardParts.push(
            reversed ? row.reversed_meaning_general : row.meaning_general
        )

        if (topics.includes("love")) {
            const val = reversed ? row.reversed_meaning_love : row.meaning_love
            if (val) cardParts.push(`Love: ${val}`)
        }
        if (topics.includes("career")) {
            const val = reversed ? row.reversed_meaning_career : row.meaning_career
            if (val) cardParts.push(`Career: ${val}`)
        }
        if (topics.includes("financial")) {
            const val = reversed
                ? row.reversed_meaning_financial
                : row.meaning_financial
            if (val) cardParts.push(`Financial: ${val}`)
        }
        if (topics.includes("advice") && row.advice) {
            cardParts.push(`Advice: ${row.advice}`)
        }
        if (topics.includes("timing") && row.timing) {
            cardParts.push(`Timing: ${row.timing}`)
        }
        if (topics.includes("yes_no") && row.yes_no) {
            cardParts.push(`Yes/No: ${row.yes_no}`)
        }
        if (row.astrology) {
            cardParts.push(`Astrology: ${row.astrology}`)
        }

        parts.push(
            `Card ${i + 1} (${display}):\n${cardParts.join("\n")}`
        )
    }

    if (parts.length === 0) return ""
    return `Reference meanings from tarot codex:\n\n${parts.join("\n\n")}`
}
