import { z } from "zod"

/** Schema for horoscope question interpretation (interpretation, conclusion, suggestions; planet/house meanings use static fallbacks) */
export const horoscopeInterpretationSchema = z.object({
    aspectInsights: z
        .array(
            z.object({
                aspectKey: z
                    .string()
                    .describe(
                        "Unique aspect key provided in personalized_transit_aspects.",
                    ),
                keyword: z
                    .string()
                    .describe(
                        "One short keyword or compact phrase that summarizes this specific aspect's impact. MUST be in the SAME language as the user's question (Thai question = Thai keyword).",
                    ),
                sentiment: z
                    .enum(["good", "bad", "neutral"])
                    .describe(
                        "Impact tone for this aspect keyword: good, bad, or neutral.",
                    ),
                insight: z
                    .string()
                    .describe(
                        "One short sentence explaining how this aspect affects the user relative to natal baseline. MUST be in the SAME language as the user's question.",
                    ),
            }),
        )
        .default([])
        .describe(
            "Array of per-aspect quick insights mapped to personalized aspect keys.",
        ),
    interpretation: z
        .string()
        .describe(
            "Main 4-8 sentence horoscope reading. Answer the user's question using the chart data.",
        ),
    conclusion: z
        .string()
        .describe(
            "A short, calming wrap-up that concludes the reading without sounding like a tagline.",
        ),
    suggestions: z
        .array(z.string())
        .min(3)
        .max(5)
        .describe(
            "3-5 concise, specific follow-up questions the user could ask next. Write as user questions.",
        ),
})

export type HoroscopeInterpretation = z.infer<
    typeof horoscopeInterpretationSchema
>

export const astrologySummarySchema = z.object({
    transits: z
        .array(
            z.object({
                planet: z
                    .string()
                    .describe("The planet name, e.g., 'Sun', 'Mars'."),
                house: z
                    .string()
                    .describe("The house number as a string, e.g., '1', '7'."),
            }),
        )
        .describe(
            "The top 3 most significant transit-to-natal house influences.",
        ),
    vibeIcon: z
        .string()
        .describe(
            "The Lucide icon name that best represents the overall vibe (e.g., 'Heart', 'Zap', 'Sparkles').",
        ),
    interpretation: z
        .string()
        .describe(
            "The main horoscope reading for the transit day. Focus on feelings and impact, avoid jargon.",
        ),
})

export type AstrologySummary = z.infer<typeof astrologySummarySchema>
