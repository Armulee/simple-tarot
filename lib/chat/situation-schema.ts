import { z } from "zod"

export const situationSchema = z.object({
    topic: z.string().describe("e.g. career, relationship, money, project, decision"),
    intent: z.string().describe("e.g. reconciliation, success, change, uncertainty"),
    emotion: z.string().describe("e.g. hope, anxiety, confusion, curiosity"),
    focus: z.string().describe("The specific focus or concern of the user"),
    cardReadingDirection: z
        .string()
        .describe(
            "2-4 sentences: what should the tarot answer BE? Synthesize the card meanings against the user's question and context. State the verdict, the reasoning from each card, and the key advice. This is a directive for the narrator, not user-facing text.",
        ),
})

export type SituationExtract = z.infer<typeof situationSchema>
