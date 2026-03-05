import { z } from "zod"

export const userSituationSchema = z.object({
    topic: z.string().describe("Main topic of the user's situation"),
    intent: z.string().describe("What the user seeks or intends"),
    emotion: z.string().describe("Emotional state or tone"),
})

export type UserSituation = z.infer<typeof userSituationSchema>
