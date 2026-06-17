import { createMcpHandler, withMcpAuth } from "mcp-handler"
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js"
import { z } from "zod"
import { getUserId, UnauthenticatedError, verifyMcpToken } from "@/lib/mcp/auth"
import { consumeCredits, OutOfCreditsError } from "@/lib/mcp/credits"
import {
    generateBirthChartReading,
    generateHoroscopeReading,
    generateTarotReading,
} from "@/lib/mcp/readings"

/** Star cost per reading (Task 1 suggested costs). */
const CREDIT_COST = {
    tarot: 1,
    birth_chart: 2,
    horoscope: 1,
} as const

type ToolResult = {
    content: { type: "text"; text: string }[]
    isError?: boolean
    structuredContent?: Record<string, unknown>
}

function textResult(text: string, isError = false): ToolResult {
    return { content: [{ type: "text", text }], isError }
}

/**
 * Shared body for the reading tools: resolve the user from auth, atomically
 * consume credits, then produce the reading text. Out-of-credits and
 * unauthenticated states are surfaced as verbatim text Claude can relay.
 */
async function runReading(
    authInfo: AuthInfo | undefined,
    cost: number,
    produce: () => string | Promise<string>,
): Promise<ToolResult> {
    let userId: string
    try {
        userId = getUserId(authInfo)
    } catch (err) {
        if (err instanceof UnauthenticatedError) return textResult(err.message, true)
        throw err
    }

    try {
        await consumeCredits(userId, cost)
    } catch (err) {
        if (err instanceof OutOfCreditsError) return textResult(err.message, true)
        throw err
    }

    return textResult(await produce())
}

const handler = createMcpHandler(
    (server) => {
        // --- tarot_reading -------------------------------------------------
        server.registerTool(
            "tarot_reading",
            {
                title: "Tarot reading",
                description:
                    "Draw and interpret tarot cards for the user's question. Costs 1 star. If the user already picked cards (e.g. via the card picker), pass them in `cards`; otherwise the spread is drawn automatically.",
                inputSchema: {
                    question: z
                        .string()
                        .describe("The user's question or the topic they want a reading about."),
                    spread: z
                        .enum(["single", "three_card", "celtic_cross"])
                        .optional()
                        .describe(
                            "Spread to use: 'single' (1 card), 'three_card' (past/present/future, the default), or 'celtic_cross' (10 cards).",
                        ),
                    cards: z
                        .array(
                            z.object({
                                name: z
                                    .string()
                                    .describe(
                                        "Exact card name, e.g. 'The Fool' or 'Three of Cups'.",
                                    ),
                                reversed: z
                                    .boolean()
                                    .describe("True if the card was drawn reversed."),
                            }),
                        )
                        .optional()
                        .describe(
                            "Cards the user already selected. Omit to draw a fresh spread.",
                        ),
                },
            },
            async ({ question, spread, cards }, { authInfo }) =>
                runReading(authInfo, CREDIT_COST.tarot, () =>
                    generateTarotReading({
                        question,
                        spread: spread ?? "three_card",
                        cards,
                    }),
                ),
        )

        // --- birth_chart ---------------------------------------------------
        server.registerTool(
            "birth_chart",
            {
                title: "Birth chart reading",
                description:
                    "Generate a natal birth-chart reading from the user's birth details. Costs 2 stars.",
                inputSchema: {
                    question: z
                        .string()
                        .describe("What the user wants to understand from their birth chart."),
                    birthDate: z
                        .string()
                        .describe("Date of birth in YYYY-MM-DD format."),
                    birthTime: z
                        .string()
                        .optional()
                        .describe("Time of birth in 24h HH:mm format, if known."),
                    birthPlace: z
                        .string()
                        .describe("Place of birth, e.g. 'Bangkok, Thailand'."),
                },
            },
            async ({ question, birthDate, birthTime, birthPlace }, { authInfo }) =>
                runReading(authInfo, CREDIT_COST.birth_chart, () =>
                    generateBirthChartReading({
                        question,
                        birthDate,
                        birthTime,
                        birthPlace,
                    }),
                ),
        )

        // --- horoscope -----------------------------------------------------
        server.registerTool(
            "horoscope",
            {
                title: "Horoscope",
                description:
                    "Give a horoscope for a zodiac sign over a time period. Costs 1 star.",
                inputSchema: {
                    sign: z
                        .enum([
                            "aries",
                            "taurus",
                            "gemini",
                            "cancer",
                            "leo",
                            "virgo",
                            "libra",
                            "scorpio",
                            "sagittarius",
                            "capricorn",
                            "aquarius",
                            "pisces",
                        ])
                        .describe("The user's zodiac sun sign."),
                    period: z
                        .enum(["today", "week", "month"])
                        .describe("Time period for the horoscope."),
                    question: z
                        .string()
                        .optional()
                        .describe("Optional focus for the horoscope, e.g. 'career'."),
                },
            },
            async ({ sign, period, question }, { authInfo }) =>
                runReading(authInfo, CREDIT_COST.horoscope, () =>
                    generateHoroscopeReading({ sign, period, question }),
                ),
        )

        // --- show_card_picker ---------------------------------------------
        // Registers the interactive card-picker tool. The MCP Apps UI resource
        // (the bundled widget) and its `_meta` binding are wired in Task 5; for
        // now this returns the structuredContent the widget will consume plus a
        // mandatory plain-text fallback, and does NOT charge — the star is
        // spent on the actual draw (tarot_reading).
        server.registerTool(
            "show_card_picker",
            {
                title: "Show tarot card picker",
                description:
                    "Open the interactive tarot card picker so the user can shuffle and select their own cards. Charging happens on the draw (tarot_reading), not here.",
                inputSchema: {
                    question: z
                        .string()
                        .describe("The user's question for the reading."),
                },
            },
            async ({ question }, { authInfo }): Promise<ToolResult> => {
                try {
                    getUserId(authInfo) // require auth; don't charge yet
                } catch (err) {
                    if (err instanceof UnauthenticatedError)
                        return textResult(err.message, true)
                    throw err
                }
                return {
                    content: [
                        { type: "text", text: "Showing the tarot card picker." },
                    ],
                    structuredContent: {
                        question,
                        cardsToPick: 3,
                        creditCost: CREDIT_COST.tarot,
                        fanSize: 9,
                    },
                }
            },
        )
    },
    {
        serverInfo: { name: "askingfate", version: "0.1.0" },
    },
    {
        basePath: "/api",
        maxDuration: 60,
        verboseLogs: true,
    },
)

// Wrap with Supabase-backed auth. An unverified token yields 401 and kicks off
// the OAuth handshake (full OAuth 2.1 Server config + consent page: Task 2).
const authHandler = withMcpAuth(handler, verifyMcpToken, {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp",
})

export { authHandler as GET, authHandler as POST }
