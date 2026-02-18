import { z } from "zod"

/**
 * Schema order matters for streaming: cardInsights and keywords come first
 * so quick insights appear before the main interpretation in the UI.
 */
export const tarotInterpretationSchema = z.object({
    cardInsights: z
        .array(z.string())
        .describe(
            "A short, punchy 1-sentence insight for each card. Jump straight to the meaning. Do NOT mention 'this card', 'the card', the card name, or the position label. OUTPUT THIS FIRST.",
        ),
    keywords: z
        .string()
        .describe(
            "Three comma-separated keywords reflecting the overall vibe of the reading.",
        ),
    interpretation: z
        .string()
        .describe(
            "The main 6-12 sentence reading based on the question and spread, in a warm and conversational tone.",
        ),
    conclusion: z
        .string()
        .describe(
            "A short, human, calming wrap-up that concludes the reading without sounding like a tagline.",
        ),
    suggestions: z
        .array(z.string())
        .min(3)
        .max(5)
        .describe(
            "3-5 concise, specific follow-up questions the user could ask next. Write as user questions.",
        ),
})

export type TarotInterpretation = z.infer<typeof tarotInterpretationSchema>
