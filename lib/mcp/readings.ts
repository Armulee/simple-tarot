import {
    generateTarotReading as engineGenerateTarotReading,
    interpretWithAI,
    type DrawnCard,
    type TarotSpread,
} from "@/lib/tarot"

/**
 * Reading generators for the MCP tools.
 *
 * Tarot delegates to the canonical engine in `lib/tarot.ts` (Task 3).
 * Default behaviour: return drawn cards + meanings as structured text and let
 * the *calling* Claude narrate. Pass `narrate: true` to use AskingFate's own
 * voice via `interpretWithAI()`.
 */

export type { TarotSpread } from "@/lib/tarot"
export const TAROT_SPREADS: TarotSpread[] = ["single", "three_card", "celtic_cross"]

export async function generateTarotReading(opts: {
    userId?: string
    question: string
    spread: TarotSpread
    cards?: { name: string; reversed: boolean }[]
    narrate?: boolean
}): Promise<string> {
    const { cards, text } = engineGenerateTarotReading(opts)
    if (!opts.narrate) return text

    try {
        const narrated = await interpretWithAI({
            question: opts.question,
            cards: cards as DrawnCard[],
        })
        return narrated || text
    } catch {
        // Fall back to structured text if the AI engine is unavailable.
        return text
    }
}

/**
 * Birth-chart reading (cost 2). Returns structured text from the supplied birth
 * data. Task 3 wires this to the existing Swiss Ephemeris engine
 * (`calculateSwissEphChart`) for full natal positions.
 */
export function generateBirthChartReading(opts: {
    question: string
    birthDate: string
    birthTime?: string
    birthPlace: string
}): string {
    const { question, birthDate, birthTime, birthPlace } = opts
    return [
        "Birth-chart reading",
        `Question: ${question}`,
        `Birth date: ${birthDate}`,
        `Birth time: ${birthTime ?? "unknown"}`,
        `Birth place: ${birthPlace}`,
        "",
        "Interpret the natal chart for the user's question, covering the Sun, Moon and Ascendant themes and the most relevant planetary placements.",
    ].join("\n")
}

/**
 * Horoscope reading (cost 1). Returns structured text. Task 3 can wire this to
 * the existing horoscope/transit engine for personalised timing.
 */
export function generateHoroscopeReading(opts: {
    sign: string
    period: "today" | "week" | "month"
    question?: string
}): string {
    const { sign, period, question } = opts
    return [
        `Horoscope — ${sign}, ${period}`,
        question ? `Question: ${question}` : "",
        "",
        `Give a ${period} horoscope for ${sign}, covering love, work and wellbeing in a warm, probabilistic tone.`,
    ]
        .filter(Boolean)
        .join("\n")
}
