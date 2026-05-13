import { z } from "zod"

export const tarotSpreadSchema = z.enum([
    "simple",
    "general",
    "detailed",
    "expanded",
    "celtic",
])

export type TarotSpreadType = z.infer<typeof tarotSpreadSchema>

export const chatDecisionSchema = z.object({
    type: z
        .enum(["chat", "draw", "horoscope"])
        .describe(
            "Classification: chat (knowledge), draw (tarot), horoscope (astrology/timing)",
        ),
    isFollowUp: z
        .boolean()
        .optional()
        .describe(
            "True if the user's question is a follow-up to a previous reading or answer in the session context",
        ),
    spreadType: tarotSpreadSchema
        .optional()
        .describe(
            "Only for draw. Choose the tarot spread that best fits the user's question: simple (1), general (3), detailed (5), expanded (7), or celtic (10).",
        ),
    spreadReason: z
        .string()
        .optional()
        .describe(
            "Only for draw. One short sentence explaining why the chosen spread fits the user's question.",
        ),
})

export type ChatDecisionSchema = z.infer<typeof chatDecisionSchema>

const TAROT_SPREAD_CARD_COUNTS: Record<TarotSpreadType, number> = {
    simple: 1,
    general: 3,
    detailed: 5,
    expanded: 7,
    celtic: 10,
}

export function getTarotCardCount(spreadType?: string): number {
    if (!spreadType || !(spreadType in TAROT_SPREAD_CARD_COUNTS)) {
        return TAROT_SPREAD_CARD_COUNTS.simple
    }

    return TAROT_SPREAD_CARD_COUNTS[spreadType as TarotSpreadType]
}
