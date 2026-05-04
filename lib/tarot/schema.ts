import { z } from "zod"

/**
 * Schema order matters for streaming: cardInsights first (per-card strip), then
 * keyMessage (short summary) before keywords and the long interpretation body.
 */
export const tarotInterpretationSchema = z.object({
    cardInsights: z
        .array(z.string())
        .describe(
            "A short 1-sentence meaning for each card in the context of the user's question. Focus on what that specific card contributes to the reading, not the overall answer. Mainly describe the card's meaning as it relates to the question in an impersonal, objective way. Do NOT make it sound like the keyMessage or a summary of the whole reading. Do NOT address the user directly or mention the user as an entity. Do NOT use wording like 'you', 'yourself', 'คุณ', 'ตัวเอง', or similar forms. Do NOT open with hedging feeling phrases like 'may feel', 'might feel', 'อาจจะรู้สึกว่า', or similar soft-openers. Do NOT mention 'this card', 'the card', the card name, or the position label. OUTPUT THIS FIRST. Write in the SAME language as the user's question — never English unless the question is English.",
        ),
    keyMessage: z
        .string()
        .describe(
            "A short 1-sentence summary of the reading's most important takeaway. Optionally use 2 very short sentences only if needed. This must feel like a concise summary, not a restatement of the full interpretation. OUTPUT IMMEDIATELY AFTER cardInsights so it can stream before keywords and interpretation.",
        ),
    keywords: z
        .string()
        .describe(
            "Three comma-separated keywords reflecting the overall vibe of the reading.",
        ),
    interpretation: z
        .string()
        .describe(
            "The main detailed body of the reading in 1-2 sentences, in a warm and conversational tone. Expand on the keyMessage with supporting detail and practical guidance. Do not repeat the keyMessage verbatim, and do not restate the user's question.",
        ),
    conclusion: z
        .string()
        .describe(
            "A short, human, calming wrap-up that concludes the reading without sounding like a tagline.",
        ),
    suggestions: z
        .array(z.string())
        .min(3)
        .max(4)
        .describe(
            "3-4 concise follow-up questions the user could naturally ask next in real life. Keep them generic and user-relatable. Do NOT make them depend on the exact wording of the generated interpretation, keyMessage, or conclusion. Write as user questions.",
        ),
})

export type TarotInterpretation = z.infer<typeof tarotInterpretationSchema>
