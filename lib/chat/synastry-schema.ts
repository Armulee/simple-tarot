import { z } from "zod"

/**
 * Structured synastry (relationship compatibility) reading produced by the LLM
 * from two people's astrology placements. All prose fields are written in the
 * user's language.
 */
export const synastrySchema = z.object({
    personA: z.object({
        headline: z
            .string()
            .describe(
                "A 2-5 word personality vibe for person A (the asker), in the user's language.",
            ),
        summary: z
            .string()
            .describe(
                "2-3 sentences on what person A is like in love/relationships, grounded in their placements. User's language.",
            ),
    }),
    personB: z.object({
        headline: z.string(),
        summary: z.string(),
    }),
    compatibilityScore: z
        .number()
        .int()
        .min(0)
        .max(100)
        .describe("Overall compatibility from 0 to 100."),
    dimensions: z
        .array(
            z.object({
                label: z
                    .string()
                    .describe(
                        "Short label for a compatibility dimension (e.g. Love, Communication, Trust, Passion) in the user's language.",
                    ),
                score: z.number().int().min(0).max(100),
            }),
        )
        .min(2)
        .max(4)
        .describe("2-4 scored compatibility dimensions."),
    comparison: z
        .string()
        .describe(
            "3-5 sentences comparing the two people's dynamic — strengths and friction. User's language.",
        ),
    interpretation: z
        .string()
        .describe(
            "Directly answer the user's question in 3-6 sentences, grounded in the comparison. User's language.",
        ),
})

export type SynastryResult = z.infer<typeof synastrySchema>

export type SynastryPersonInfo = {
    name: string | null
    sunSign: string | null
    ascendant: string | null
}

/** Birth data for one person, sent to POST /api/synastry. */
export type SynastryPersonBirth = {
    name?: string | null
    day: number
    month: number
    year: number
    hour?: number | null
    minute?: number | null
    country?: string | null
    state?: string | null
    lat?: number | null
    lng?: number | null
    timezone?: number | null
}

/** Payload stored on an assistant ChatMessage and rendered as the result card. */
export type SynastryReadingPayload = {
    personA: SynastryPersonInfo
    personB: SynastryPersonInfo
    result: SynastryResult
}
