import { z } from "zod"

export const situationSchema = z.object({
    topic: z.string().describe("e.g. career, relationship, money, project, decision"),
    intent: z.string().describe("e.g. reconciliation, success, change, uncertainty"),
    emotion: z.string().describe("e.g. hope, anxiety, confusion, curiosity"),
    focus: z.string().describe("The specific focus or concern of the user"),
})

export type SituationExtract = z.infer<typeof situationSchema>
