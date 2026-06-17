import { z } from "zod"

/** A life-area panel in the monitor dashboard. The `area` key drives the icon
 * and localized label in the UI; the model fills the score/trend/text. */
export const lifeAreaSchema = z.enum([
    "mood",
    "love",
    "career",
    "money",
    "health",
    "growth",
    "social",
])
export type LifeArea = z.infer<typeof lifeAreaSchema>

export const lifeMonitorSchema = z.object({
    headline: z
        .string()
        .describe(
            "A short 3-6 word vibe for this person's current period, in the user's language.",
        ),
    mood: z
        .enum(["bright", "mixed", "tough"])
        .describe("Overall tone of the current period."),
    overallScore: z
        .number()
        .int()
        .min(0)
        .max(100)
        .describe("Overall life-energy score 0-100 for right now."),
    summary: z
        .string()
        .describe(
            "2-4 sentences on the current cosmic weather for this person (transits vs their natal chart), in the user's language.",
        ),
    panels: z
        .array(
            z.object({
                area: lifeAreaSchema,
                score: z.number().int().min(0).max(100),
                trend: z.enum(["rising", "steady", "dipping"]),
                text: z
                    .string()
                    .describe(
                        "1-2 sentences for this life area in the user's language.",
                    ),
            }),
        )
        .min(3)
        .max(6)
        .describe("3-6 scored life-area panels."),
    supportTip: z
        .string()
        .nullable()
        .optional()
        .describe(
            "ONLY when monitoring someone else: one gentle, caring suggestion for how the asker can support this person right now. Null/omit for self.",
        ),
})

export type LifeMonitorResult = z.infer<typeof lifeMonitorSchema>

export type LifeMonitorPayload = {
    subject: "self" | "character"
    name: string | null
    sunSign: string | null
    /** True when birth time was unknown, so the reading is a broad outlook. */
    approximate: boolean
    result: LifeMonitorResult
}
