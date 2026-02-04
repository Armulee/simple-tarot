import { z } from "zod"

export const chatFollowUpSchema = z.object({
    conclusion: z
        .string()
        .describe(
            "A short, human, calming wrap-up that concludes the reading without sounding like a tagline."
        ),
    suggestions: z
        .array(z.string())
        .min(3)
        .max(5)
        .describe(
            "3-5 concise, specific follow-up questions the user could ask next. Write as user questions."
        ),
})

export type ChatFollowUp = z.infer<typeof chatFollowUpSchema>

