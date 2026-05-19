import { z } from "zod"

/**
 * Standalone daily-verdict schema.
 *
 * Used by `/api/horoscope/verdict` (a small, focused LLM call that ONLY needs
 * the personalized transit aspects to produce the verdict hero). Reused here
 * inside `horoscopeInterpretationSchema` as an OPTIONAL field for backwards
 * compatibility — the body route no longer instructs the model to emit it, so
 * in practice the body call leaves it undefined and the verdict route fills
 * it in from a separate, faster request.
 */
export const dailyVerdictSchema = z.object({
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
    moodSubtitle: z
        .string()
        .optional()
        .describe(
            "Short AI-generated tagline (2-6 words) rendered in the verdict's mood pill, directly under the headline. Should evoke the chart's energy for THIS specific question instead of a generic 'Good Day' / 'Rest Day' label. SAME language as the question. Plain language, no astrology jargon, no planet/sign names.",
        ),
    keyMessage: z
        .object({
            headline: z
                .string()
                .describe(
                    "Short key-message line (2-10 words) summarizing the AI's day-answer. SAME language as question. Plain language, no astrology jargon.",
                ),
            subtitle: z
                .string()
                .describe(
                    "One short sentence (~10-18 words) elaborating on the key-message headline. SAME language as question. Plain language.",
                ),
        })
        .optional()
        .describe(
            "Short headline+subtitle summarizing the day's AI answer. Rendered as a key-message box above the detailed HTML block.",
        ),
    detailedHtml: z
        .string()
        .min(1)
        .describe(
            "Short decorated HTML fragment (1-3 paragraphs) that directly answers the user's question for this specific day, grounded in the personalized aspect picture. May open with how the day feels emotionally/energetically, then the concrete answer. ALLOWED TAGS ONLY: <p>, <strong>, <em>, <b>, <i>, <ul>, <ol>, <li>, <br>, and <span class=\"highlight-gold\">. NO headings (<h1>-<h6>) — the verdict headline already plays that role. Use <span class=\"highlight-gold\">…</span> to highlight 1-3 key phrases (a date, a decision, a watch-out). SAME language as the question. Plain language, no astrology jargon, no markdown.",
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
    mode: z
        .enum(["daily", "natal", "timing", "technical"])
        .optional()
        .describe(
            "Which lens produced this verdict. 'daily' = transit-driven single-day verdict (default). 'natal' = self/birth-chart verdict answering a non-date-bound question like 'which career fits me?'. 'timing' = forward-looking search answering a 'when will X happen?' question, with the peak window returned in `timingWindow`. 'technical' = pure ephemeris/astrology-knowledge question about planetary mechanics (exaltation, sign changes, retrogrades) — not anchored to the asker's chart.",
        ),
    timingWindow: z
        .object({
            startDateIso: z
                .string()
                .describe(
                    "ISO date (YYYY-MM-DD) for the start of the peak window. MUST be a date that appears in (or directly bounds) the supplied personalized_transit_aspects window.",
                ),
            endDateIso: z
                .string()
                .describe(
                    "ISO date (YYYY-MM-DD) for the end of the peak window. Equal to startDateIso when the answer is a single calendar day.",
                ),
        })
        .optional()
        .describe(
            "Timing-mode only. The single best date or short date window when the user's chances peak for the outcome they asked about. Rendered in the hero crest as e.g. '1–16 AUG'. Omit entirely for daily / natal verdicts.",
        ),
    relevantPlanets: z
        .array(
            z.object({
                planet: z
                    .string()
                    .describe(
                        "Canonical English planet name as it appears in chartData.charts[0].planets (e.g. 'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu', 'Uranus', 'Neptune', 'Pluto'). Must EXACTLY match one of the supplied natal-placement keys so the UI can look it up.",
                    ),
                reason: z
                    .string()
                    .describe(
                        "One short sentence (plain language, SAME language as the question, no astrology jargon, no planet names, no zodiac signs) explaining why this placement matters for the user's question.",
                    ),
            }),
        )
        .max(5)
        .optional()
        .describe(
            "Natal-mode only. 1-4 birth-chart placements (planets) that most directly answer the user's question. Rendered as a spotlight strip inside the verdict hero. Omit entirely for daily / transit-driven verdicts.",
        ),
})

export type DailyVerdict = z.infer<typeof dailyVerdictSchema>

/**
 * Streaming-friendly version of the verdict schema.
 *
 * `useObject` can surface partial top-level fields earlier when they are not
 * wrapped under another required object and when nested objects can arrive
 * incrementally (for example `keyMessage.headline` before `subtitle`).
 */
export const streamingDailyVerdictSchema = z.object({
    mood: dailyVerdictSchema.shape.mood.optional(),
    headline: dailyVerdictSchema.shape.headline.optional(),
    moodSubtitle: z.string().optional(),
    keyMessage: z
        .object({
            headline: z.string().optional(),
            subtitle: z.string().optional(),
        })
        .optional(),
    detailedHtml: z.string().optional(),
    watchOut: z.string().optional(),
    focusArea: z.string().optional(),
    mode: dailyVerdictSchema.shape.mode.optional(),
    timingWindow: z
        .object({
            startDateIso: z.string().optional(),
            endDateIso: z.string().optional(),
        })
        .optional(),
    relevantPlanets: z
        .array(
            z.object({
                planet: z.string().optional(),
                reason: z.string().optional(),
            }),
        )
        .optional(),
})

/**
 * Top-level response from `/api/horoscope/verdict`. For non-single-day
 * questions the server returns `{ dailyVerdict: null }` so the client can
 * cheaply discriminate without parsing the LLM output.
 */
export const dailyVerdictResponseSchema = z.object({
    dailyVerdict: dailyVerdictSchema.nullable(),
})

export type DailyVerdictResponse = z.infer<typeof dailyVerdictResponseSchema>

/** Schema for horoscope question interpretation (interpretation, conclusion, suggestions; planet/house meanings use static fallbacks) */
export const horoscopeInterpretationSchema = z.object({
    dailyVerdict: dailyVerdictSchema
        .optional()
        .describe(
            "DEPRECATED on this route: `/api/horoscope/question` no longer instructs the model to emit a dailyVerdict — the verdict is generated by the dedicated `/api/horoscope/verdict` route so it can ship to the UI well before the long-form body finishes streaming. Kept optional here for backwards compatibility with cached / older responses.",
        ),
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
        .max(4)
        .default([])
        .describe(
            "3–4 very short, casual follow-up prompts the user might ask next (single line each; conversational, not textbook). Write in the same language as the question.",
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
})

export type HoroscopeInterpretation = z.infer<
    typeof horoscopeInterpretationSchema
>

/**
 * Single slot inside the Prediction Timeline. `slotKey` and `datetimeIso` are
 * provided by the server (the LLM only fills `mood/title/narrative/...`).
 * The LLM is asked to echo the server's values back so the streamed payload
 * is self-describing, but client code should always treat the server's
 * scaffolding as the source of truth for IDs and timestamps.
 */
export const predictionTimelineSlotSchema = z.object({
    slotKey: z
        .string()
        .describe(
            "Stable server-issued slot identifier (e.g. 'hour-09' or 'day-2026-05-19'). Echo back exactly as provided in the prompt scaffolding.",
        ),
    datetimeIso: z
        .string()
        .describe(
            "Server-issued ISO timestamp for the slot. Hourly slots use full ISO ('2026-05-19T09:00:00Z'); daily slots use date-only ('2026-05-19'). Echo back as provided.",
        ),
    label: z
        .string()
        .describe(
            "Short human-readable label for the slot, SAME language as the user's question. E.g. Thai 'ช่วงเช้า 09:00' or English 'Mon · 19 May'. Keep ≤ 6 words.",
        ),
    mood: z
        .enum(["good", "caution", "rest", "mixed"])
        .describe(
            "Overall energy for the slot. 'good' = supportive flow, 'caution' = friction/pressure, 'rest' = low momentum, 'mixed' = both supportive and tense.",
        ),
    title: z
        .string()
        .describe(
            "Punchy headline summarizing the slot in 3-6 words. SAME language as the user's question. No astrology jargon.",
        ),
    narrative: z
        .string()
        .describe(
            "1-2 sentences describing what is realistically likely to unfold in this slot, grounded in the slot's aspect events. SAME language as the user's question. Plain language. No planet names, no zodiac signs.",
        ),
    focusArea: z
        .string()
        .optional()
        .describe(
            "Optional canonical life-area label for the slot (e.g. 'การงาน', 'Career', 'Love'). SAME language as the question.",
        ),
    tags: z
        .array(z.string())
        .max(3)
        .default([])
        .describe(
            "Up to 3 short keyword tags. SAME language as the question. Plain language.",
        ),
})

export type PredictionTimelineSlot = z.infer<
    typeof predictionTimelineSlotSchema
>

export const predictionTimelineSchema = z.object({
    granularity: z
        .enum(["hourly", "daily"])
        .describe(
            "Granularity of the timeline. Echo back the granularity from the prompt scaffolding.",
        ),
    slots: z
        .array(predictionTimelineSlotSchema)
        .min(1)
        .max(21)
        .describe(
            "Ordered list of timeline slots covering the question's resolved time range.",
        ),
})

export type PredictionTimeline = z.infer<typeof predictionTimelineSchema>

export const predictionTimelineResponseSchema = z.object({
    timeline: predictionTimelineSchema.nullable(),
})

export type PredictionTimelineResponse = z.infer<
    typeof predictionTimelineResponseSchema
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
