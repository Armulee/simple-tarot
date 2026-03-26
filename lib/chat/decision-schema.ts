import { z } from "zod"

export const chatDecisionSchema = z.object({
    type: z
        .enum(["chat", "draw", "horoscope"])
        .describe(
            "Classification: chat (knowledge), draw (tarot), horoscope (astrology/timing)",
        ),
    assistantText: z
        .string()
        .describe("Bridge response in the SAME language as the user's message"),
    isFollowUp: z
        .boolean()
        .optional()
        .describe(
            "True if the user's question is a follow-up to a previous reading or answer in the session context",
        ),
})

export type ChatDecisionSchema = z.infer<typeof chatDecisionSchema>

export function chooseTarotSpread(question: string) {
    const q = question.trim()
    const wordCount = q.split(/\s+/).length

    if (wordCount <= 6) {
        return { spreadType: "simple" as const, cardCount: 1 }
    }

    if (wordCount <= 15) {
        return { spreadType: "general" as const, cardCount: 3 }
    }

    return { spreadType: "detailed" as const, cardCount: 5 }
}
