import { pickRandomCards } from "@/lib/tarot/pick-random-cards"
import { TAROT_CARDS } from "@/lib/tarot/cards"

/**
 * Reading generators for the MCP tools.
 *
 * Default behaviour (per the brief, Task 3): return the drawn cards together
 * with their meanings as structured text and let the *calling* Claude narrate
 * in its own voice. `lib/tarot.ts`'s `interpretWithAI()` / the existing
 * `/api/interpret-cards` engine can be wired in later for AskingFate's own
 * voice — that deepening lands in Task 3.
 */

export type TarotSpread = "single" | "three_card" | "celtic_cross"

export const TAROT_SPREADS: TarotSpread[] = [
    "single",
    "three_card",
    "celtic_cross",
]

const SPREAD_SIZE: Record<TarotSpread, number> = {
    single: 1,
    three_card: 3,
    celtic_cross: 10,
}

const SPREAD_POSITIONS: Record<TarotSpread, string[]> = {
    single: ["Focus"],
    three_card: ["Past", "Present", "Future"],
    celtic_cross: [
        "The Present",
        "The Challenge",
        "The Past",
        "The Future",
        "Above (Goal)",
        "Below (Subconscious)",
        "Advice",
        "External Influences",
        "Hopes & Fears",
        "Outcome",
    ],
}

const CARD_BY_NAME = new Map(TAROT_CARDS.map((c) => [c.name, c]))

export type DrawnCard = { name: string; reversed: boolean }

/**
 * Build a structured-text tarot reading. If `cards` are supplied (e.g. posted
 * back from the card-picker widget) they are used as-is; otherwise the spread
 * is drawn from the shared 78-card deck.
 */
export function generateTarotReading(opts: {
    question: string
    spread: TarotSpread
    cards?: DrawnCard[]
}): string {
    const { question, spread } = opts
    const positions = SPREAD_POSITIONS[spread]
    const size = SPREAD_SIZE[spread]

    const drawn: DrawnCard[] =
        opts.cards && opts.cards.length > 0
            ? opts.cards.slice(0, size)
            : pickRandomCards(size).map((c) => ({
                  name: c.name,
                  reversed: c.isReversed,
              }))

    const lines = drawn.map((card, i) => {
        const meta = CARD_BY_NAME.get(card.name)
        const position = positions[i] ?? `Card ${i + 1}`
        const orientation = card.reversed ? "Reversed" : "Upright"
        const keywords = meta
            ? (card.reversed
                  ? meta.reversedKeywords
                  : meta.uprightKeywords
              ).join(", ")
            : "—"
        return `${i + 1}. ${position}: ${card.name} (${orientation})\n   Keywords: ${keywords}`
    })

    return [
        `Tarot reading — ${spread.replace("_", " ")} spread`,
        `Question: ${question}`,
        "",
        "Cards drawn:",
        ...lines,
        "",
        "Use these cards, their positions and keywords to narrate a cohesive reading for the user's question.",
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
