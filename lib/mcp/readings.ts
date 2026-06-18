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

export type TarotReadingResult = {
    text: string
    cards: DrawnCard[]
}

export async function generateTarotReading(opts: {
    userId?: string
    question: string
    spread: TarotSpread
    cards?: { name: string; reversed: boolean }[]
    narrate?: boolean
}): Promise<TarotReadingResult> {
    const { cards, text } = engineGenerateTarotReading(opts)
    if (!opts.narrate) return { text, cards }

    try {
        const narrated = await interpretWithAI({ question: opts.question, cards })
        return { text: narrated || text, cards }
    } catch {
        // Fall back to structured text if the AI engine is unavailable.
        return { text, cards }
    }
}

/** Decks available on the site. Extend as deck art is added under /decks. */
export const TAROT_DECKS = [
    {
        id: "default",
        name: "AskingFate Classic",
        description:
            "The default Rider–Waite deck — deep-purple backs with a gold 8-point star.",
        backImage: "https://askingfate.com/decks/default/back.png",
    },
] as const

export function listDecksText(): string {
    return [
        "Available decks:",
        ...TAROT_DECKS.map((d) => `- ${d.name} (${d.id}): ${d.description}`),
    ].join("\n")
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
