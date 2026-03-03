import { z } from "zod"

export const chatDecisionSchema = z.object({
    type: z
        .enum(["chat", "draw", "horoscope"])
        .describe("Classification: chat (knowledge), draw (tarot), horoscope (astrology/timing)"),
    spreadType: z
        .enum(["simple", "general", "detailed", "expanded", "celtic"])
        .nullable()
        .describe("Tarot spread type; null for chat/horoscope"),
    cardCount: z
        .number()
        .int()
        .min(0)
        .max(10)
        .describe("Number of cards; 0 for chat/horoscope"),
    assistantText: z
        .string()
        .describe("Bridge response in the SAME language as the user's message"),
    isFollowUp: z
        .boolean()
        .describe("True if the user's message is directly related to the last message"),
})

export type ChatDecisionSchema = z.infer<typeof chatDecisionSchema>
