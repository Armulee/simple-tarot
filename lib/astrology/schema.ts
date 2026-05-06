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
                impact: z
                    .string()
                    .describe(
                        "Life-area label for this aspect, e.g. 'Career', 'Finance', 'Relationship', 'Health', 'Family', 'Personal Growth', 'Education', 'Travel'. MUST be in the SAME language as the user's question (Thai question = Thai label such as 'การงาน', 'การเงิน', 'ความรัก').",
                    ),
                intensity: z
                    .enum(["low", "medium", "high"])
                    .describe(
                        "How strongly this aspect affects the user right now: 'high' = major life impact, 'medium' = noticeable influence, 'low' = subtle background energy.",
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
            "Main 4-8 sentence horoscope reading. Answer the user's question directly using chart data. When timing is mentioned, use exact date/date-range wording (no vague timing phrases).",
        ),
    conclusion: z
        .string()
        .describe(
            "A short, calming wrap-up that concludes the reading without sounding like a tagline. Keep timing language concrete when present.",
        ),
    suggestions: z
        .array(z.string())
        .max(5)
        .default([])
        .describe(
            "Up to 5 concise, specific follow-up questions the user could ask next. Write as user questions.",
        ),
    relevance: z
        .array(
            z.object({
                label: z
                    .string()
                    .describe(
                        "Life-area label, SAME language as the question. Use one of the canonical domains: Career, Finance, Love, Family, Health, Relationships, Education, Travel, Luck, Spirituality, Reputation, Caution (Thai equivalents allowed when the question is Thai, e.g. 'การงาน', 'การเงิน', 'ความรัก').",
                    ),
                pct: z
                    .number()
                    .min(0)
                    .max(100)
                    .describe(
                        "Integer percentage 0-100 representing how much this life-area dominates the reading. Pcts across the array MUST sum to 100.",
                    ),
            }),
        )
        .max(5)
        .default([])
        .describe(
            "Up to 5 dominant life-areas for this reading, used to render a proportional relevance bar. Sorted descending by pct.",
        ),
    dailyVerdict: z
        .object({
            mood: z
                .enum(["good", "caution", "rest"])
                .describe(
                    "Overall day energy. 'good' = supportive flow, take action. 'caution' = high-friction or pressured, slow down. 'rest' = low momentum, recharge instead of pushing.",
                ),
            headline: z
                .string()
                .describe(
                    "Short, punchy verdict line (2-8 words). MUST be in the SAME language as the user's question. No astrology jargon.",
                ),
            subtext: z
                .string()
                .describe(
                    "1-2 sentence atmospheric description of how the day feels. SAME language as question. No planet/sign names.",
                ),
            actions: z
                .array(z.string())
                .min(1)
                .max(3)
                .describe(
                    "1-3 concrete things the user can do that specific day. These are imperative actions ('Have the difficult conversation in the morning'), NOT user follow-up questions. SAME language as question.",
                ),
            watchOut: z
                .string()
                .optional()
                .describe(
                    "Optional single sentence cautioning what to avoid that day. SAME language as question. Only include when there is a meaningful caution.",
                ),
            focusArea: z
                .string()
                .optional()
                .describe(
                    "Optional single canonical life-area label that best summarizes the day's focus. MUST match the relevance.label canonical set in the same language.",
                ),
        })
        .optional()
        .describe(
            "Populated ONLY when the question references exactly one calendar day (single-day verdict). MUST be omitted entirely for multi-day, weekly, monthly, or vague timeframes.",
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
