import { z } from "zod"

export const tarotSpreadSchema = z.enum([
    "simple",
    "general",
    "detailed",
    "expanded",
    "celtic",
])

export type TarotSpreadType = z.infer<typeof tarotSpreadSchema>

export const supportTopicSchema = z.enum([
    "pricing",
    "star-packs",
    "contact",
    "help",
    "faq",
    "how-to-play",
    "privacy-redaction",
    "privacy-policy",
    "terms-of-service",
    "refer-a-friend",
    "share-reading",
    "create-content",
    "tarot-card",
    "tarot-cards-index",
    "birth-chart",
    "horoscope",
    "calendar-year",
    "account",
    "settings",
    "about",
    "articles",
    "sign-in",
    "sign-up",
])

export type SupportTopicSchema = z.infer<typeof supportTopicSchema>

export const horoscopeModeSchema = z.enum(["calendar"])
export type HoroscopeMode = z.infer<typeof horoscopeModeSchema>

export const chatDecisionSchema = z.object({
    type: z
        .enum(["chat", "draw", "horoscope", "support", "oracle", "synastry"])
        .describe(
            "Classification: chat (knowledge), draw (tarot), horoscope (astrology/timing), support (website/product info -> inline tool block), oracle (mystical / symbolic / spiritual reflection that doesn't fit tarot, astrology, numerology), synastry (relationship COMPATIBILITY between the asker and ONE other specific person — 'are we compatible', 'will it work with @Name', 'do my partner and I match')",
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
    supportTopic: supportTopicSchema
        .optional()
        .describe(
            "Only for support. Which product topic the inline tool block should render. Required when type === 'support'.",
        ),
    supportCardSlug: z
        .string()
        .optional()
        .describe(
            "Only for support + tarot-card. Canonical kebab-case card slug, e.g. 'seven-of-cups', 'the-fool'. If unsure, omit it; the client will try to detect from the user message.",
        ),
    horoscopeMode: horoscopeModeSchema
        .optional()
        .describe(
            "Only for horoscope. When set to 'calendar', the client renders the interactive calendar tool (date picker + topic chips) instead of streaming an immediate reading. Use for prompts like 'show my calendar / year ahead / 12 months overview'.",
        ),
    horoscopeExplain: z
        .boolean()
        .optional()
        .describe(
            "Only for chat. True when the user is questioning the REASONING behind a previous horoscope/timing recommendation ('why that date?', 'ทำไมไม่ควรลาออกสิ้นเดือน') — the client streams a data-grounded explanation paragraph instead of re-running the reading.",
        ),
    comparisonDateIso: z
        .string()
        .optional()
        .describe(
            "Only when horoscopeExplain. The alternative date/period the user proposes, resolved to YYYY-MM-DD against the current date ('สิ้นเดือน' / 'end of the month' → last day of the current month). Omit when they propose none.",
        ),
    tarotExplain: z
        .boolean()
        .optional()
        .describe(
            "Only for chat. True when the user is questioning the REASONING behind a previous TAROT reading ('why did the cards say that?', 'ทำไมไพ่ถึงบอกแบบนี้', 'how did you conclude that?') — the client streams a paragraph explaining the previous reading from the drawn cards instead of doing a new draw. Not for clarification follow-ups that want more/new info ('who?', 'tell me more') — those stay 'draw'.",
        ),
    conversational: z
        .boolean()
        .optional()
        .describe(
            "Only for chat. True when the user is just TALKING (greeting, venting, 'I want to talk to you', thanks, chit-chat) and is NOT asking for a reading, prediction, interpretation, definition, or product feature. The client answers with a gentle plain-text conversation (no mystical reflection, no support block). False/omit for knowledge questions and anything seeking interpretation.",
        ),
    synastryPersonName: z
        .string()
        .optional()
        .describe(
            "Only for synastry. The other person's name/handle as referenced in the question (e.g. 'Alex', the name inside an @mention). Omit if the other person was given only by birth date with no name.",
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
