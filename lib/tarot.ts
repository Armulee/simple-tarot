import { generateObject } from "ai"
import { TAROT_DECK } from "@/lib/tarot/tarot-deck"
import { TAROT_CARDS } from "@/lib/tarot/cards"
import { tarotInterpretationSchema } from "@/lib/tarot/schema"
import { getTarotReadingPrompt, TAROT_SYSTEM_PROMPT } from "@/lib/prompts"

/**
 * Tarot engine for the MCP server.
 *
 * Reuses the app's shared 78-card Rider–Waite deck (`TAROT_DECK`) and card
 * meanings (`TAROT_CARDS`). Provides shuffle / spread drawing (~30% reversed)
 * and two interpretation paths:
 *  - `generateTarotReading` → structured text (default; the calling Claude
 *     narrates in its own voice).
 *  - `interpretWithAI` → AskingFate's own voice, wired to the existing AI
 *     reading engine (`TAROT_SYSTEM_PROMPT` + `getTarotReadingPrompt`).
 */

export { TAROT_DECK }

export type TarotSpread = "single" | "three_card" | "celtic_cross"

export const SPREAD_SIZE: Record<TarotSpread, number> = {
    single: 1,
    three_card: 3,
    celtic_cross: 10,
}

export const SPREAD_POSITIONS: Record<TarotSpread, string[]> = {
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

/** Probability that any drawn card lands reversed. */
const REVERSED_PROBABILITY = 0.3

const CARD_BY_NAME = new Map(TAROT_CARDS.map((c) => [c.name, c]))

export type DrawnCard = {
    name: string
    reversed: boolean
    /** Position label within the spread (e.g. "Past"). */
    position: string
}

export function shuffle<T>(array: readonly T[]): T[] {
    const copy = [...array]
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
    }
    return copy
}

/** Draw a spread from the deck without replacement; ~30% of cards reversed. */
export function drawSpread(spread: TarotSpread): DrawnCard[] {
    const size = SPREAD_SIZE[spread]
    const positions = SPREAD_POSITIONS[spread]
    const shuffled = shuffle(TAROT_DECK)
    return shuffled.slice(0, size).map((name, i) => ({
        name,
        reversed: Math.random() < REVERSED_PROBABILITY,
        position: positions[i] ?? `Card ${i + 1}`,
    }))
}

/** Attach spread position labels to a caller-supplied set of cards. */
export function withPositions(
    spread: TarotSpread,
    cards: { name: string; reversed: boolean }[],
): DrawnCard[] {
    const positions = SPREAD_POSITIONS[spread]
    return cards.map((c, i) => ({
        ...c,
        position: positions[i] ?? `Card ${i + 1}`,
    }))
}

/** Render the drawn cards + meanings as structured text. */
export function buildReadingText(
    question: string,
    spread: TarotSpread,
    cards: DrawnCard[],
): string {
    const lines = cards.map((card, i) => {
        const meta = CARD_BY_NAME.get(card.name)
        const orientation = card.reversed ? "Reversed" : "Upright"
        const keywords = meta
            ? (card.reversed ? meta.reversedKeywords : meta.uprightKeywords).join(
                  ", ",
              )
            : "—"
        return `${i + 1}. ${card.position}: ${card.name} (${orientation})\n   Keywords: ${keywords}`
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
 * Default reading: draw the spread and return structured text. The caller
 * (Claude) narrates. `userId` is accepted for parity with the brief / future
 * personalisation but isn't required to draw.
 */
export function generateTarotReading(opts: {
    userId?: string
    question: string
    spread: TarotSpread
    /** Optional pre-selected cards (e.g. from the card-picker widget). */
    cards?: { name: string; reversed: boolean }[]
}): { cards: DrawnCard[]; text: string } {
    const cards =
        opts.cards && opts.cards.length > 0
            ? withPositions(opts.spread, opts.cards.slice(0, SPREAD_SIZE[opts.spread]))
            : drawSpread(opts.spread)
    return { cards, text: buildReadingText(opts.question, opts.spread, cards) }
}

const AI_MODEL = "deepseek/deepseek-v3.2"

/**
 * Interpret a spread in AskingFate's own voice using the existing AI reading
 * engine (same model, system prompt and schema as `/api/interpret-cards`).
 * Returns the narrated reading flattened to text.
 */
export async function interpretWithAI(opts: {
    question: string
    cards: DrawnCard[]
    readingType?: string | null
}): Promise<string> {
    const cardList = opts.cards
        .map((c) => `${c.name}${c.reversed ? " (reversed)" : ""}`)
        .join(", ")

    const prompt = getTarotReadingPrompt({
        question: opts.question,
        cards: cardList,
        readingType: opts.readingType ?? null,
        isFollowUp: false,
        previousQuestion: null,
        previousInterpretation: null,
    })

    const { object } = await generateObject({
        model: AI_MODEL,
        schema: tarotInterpretationSchema,
        system: TAROT_SYSTEM_PROMPT,
        prompt,
        temperature: 0.6,
    })

    return [
        object.headline,
        object.subtitle,
        object.interpretation,
        object.nextStep,
    ]
        .filter((s): s is string => Boolean(s && s.trim()))
        .join("\n\n")
}
