import { generateObject } from "ai"
import { z } from "zod"
import { getDefaultAstrologySystem } from "@/lib/astrology/intake"
import { selectTransitDateFromSources } from "@/lib/astrology/transit-date-extract"
import { resolveLocationFromCountryState } from "@/lib/location"
import {
    getRelevantPlanetsForTopic,
    type QuestionClassification,
    type QuestionTopic,
    type ReplyStrategy,
} from "@/lib/astrology/question-intent"
import {
    resolveQuestionTimeRangeWithHint,
    type QuestionTimeRangePayload,
} from "@/lib/astrology/question-time-range"

const MODEL = "deepseek/deepseek-v3.2"

function normalizeCalendarYear(year: number | null | undefined): number | null {
    if (!Number.isFinite(year as number)) return null
    const numericYear = Number(year)
    if (numericYear >= 2400 && numericYear <= 2800) {
        return numericYear - 543
    }
    return numericYear
}

const TOPIC_VALUES = [
    "career",
    "love",
    "money",
    "health",
    "travel",
    "education",
    "family",
    "general",
] as const satisfies readonly QuestionTopic[]

const REPLY_STRATEGY_VALUES = [
    "daily",
    "timing",
    "natal",
    "timeline",
    "general",
] as const satisfies readonly ReplyStrategy[]

const CALENDAR_INTENT_VALUES = [
    "resignation",
    "job_change",
    "contract_sign",
    "marriage",
    "travel_long",
    "major_purchase",
    "none",
] as const

const classificationSchema = z.object({
    replyStrategy: z
        .enum(REPLY_STRATEGY_VALUES)
        .describe(
            "Which downstream verdict flavor best fits the question: 'daily' (single-day or short-range transit reading), 'timing' (when will X happen / which day is best), 'natal' (open-ended self / personality question with no date), 'timeline' (predictive 'what will happen' over a multi-day window), or 'general' (no verdict hero — plain interpretation).",
        ),
    questionTopic: z
        .enum(TOPIC_VALUES)
        .describe(
            "Primary life domain of the question. Use 'general' when none of the specific topics apply.",
        ),
    predictiveIntent: z
        .boolean()
        .describe(
            "True when the user is asking a 'what will happen' / 'how will X go' style predictive question.",
        ),
    naturalNatalReference: z
        .boolean()
        .describe(
            "True when the user explicitly references their own natal placements ('my Saturn', 'my Sun sign', 'ดวงของฉัน', 'ราศีของฉัน', etc.).",
        ),
    birthChartSuitability: z
        .boolean()
        .describe(
            "True when the user asks what their birth chart is suitable for (career path, life purpose, talents, 'เหมาะกับ', 'พรสวรรค์').",
        ),
    calendarRecommendationIntent: z
        .enum(CALENDAR_INTENT_VALUES)
        .describe(
            "When the user asks for the best day for a life action, classify which action. 'none' for non-calendar questions.",
        ),
    timeRangeDaysHint: z
        .number()
        .int()
        .min(1)
        .max(730)
        .describe(
            "How many days of transit data the question needs. 1 for today/tonight; 30 for short-term or vague; 90-180 for this year; 180-365 for long-term timing; 365-730 for life-long questions.",
        ),
})

const extractSchema = z.object({
    birthDate: z
        .object({
            day: z.number().int().min(1).max(31).nullable(),
            month: z.number().int().min(1).max(12).nullable(),
            year: z.number().int().min(1857).max(2800).nullable(),
        })
        .nullable(),
    birthTime: z
        .object({
            hour: z.number().int().min(0).max(23).nullable(),
            minute: z.number().int().min(0).max(59).nullable(),
            timeHint: z.enum(["day", "night", "unknown"]).default("unknown"),
            isExact: z.boolean().default(false),
        })
        .nullable(),
    location: z
        .object({
            country: z.string().trim().min(1).nullable(),
            state: z.string().trim().min(1).nullable(),
        })
        .nullable(),
    systemPreference: z
        .enum(["western_tropical", "vedic_sidereal", "both", "unknown"])
        .default("unknown"),
    transitDate: z
        .object({
            mentioned: z.boolean().default(false),
            day: z.number().int().min(1).max(31).nullable(),
            month: z.number().int().min(1).max(12).nullable(),
            year: z.number().int().min(1857).max(2800).nullable(),
        })
        .nullable(),
    classification: classificationSchema,
})

const requestSchema = z.object({
    message: z.string().trim().min(1),
    locale: z.string().optional(),
    currentLocation: z
        .object({
            country: z.string().optional(),
            state: z.string().optional(),
            lat: z.number().optional(),
            lng: z.number().optional(),
            timezone: z.number().optional(),
        })
        .optional(),
})

const FALLBACK_CLASSIFICATION: z.infer<typeof classificationSchema> = {
    replyStrategy: "general",
    questionTopic: "general",
    predictiveIntent: false,
    naturalNatalReference: false,
    birthChartSuitability: false,
    calendarRecommendationIntent: "none",
    timeRangeDaysHint: 30,
}

function toQuestionClassification(
    raw: z.infer<typeof classificationSchema>,
): QuestionClassification {
    return {
        replyStrategy: raw.replyStrategy,
        questionTopic: {
            topic: raw.questionTopic,
            relevantPlanets: [...getRelevantPlanetsForTopic(raw.questionTopic)],
        },
        predictiveIntent: raw.predictiveIntent,
        naturalNatalReference: raw.naturalNatalReference,
        birthChartSuitability: raw.birthChartSuitability,
        calendarRecommendationIntent:
            raw.calendarRecommendationIntent === "none"
                ? null
                : { intent: raw.calendarRecommendationIntent },
    }
}

export async function POST(req: Request) {
    try {
        const payload = requestSchema.parse(await req.json())
        const locale = payload.locale || "en"

        const fallbackExtracted: z.infer<typeof extractSchema> = {
            birthDate: null,
            birthTime: {
                hour: null,
                minute: null,
                timeHint: "unknown",
                isExact: false,
            },
            location: null,
            systemPreference: "unknown",
            transitDate: null,
            classification: FALLBACK_CLASSIFICATION,
        }

        let extracted: z.infer<typeof extractSchema> = fallbackExtracted
        try {
            const extraction = await generateObject({
                model: MODEL,
                schema: extractSchema,
                temperature: 0,
                system: `Extract birth data, transit date, AND classify the user's question for the horoscope reply strategy.

Birth / transit extraction rules:
- Do not invent values.
- Support varied birth date formats, including dd/mm/yyyy, mm-dd-yyyy, yyyy-mm-dd, textual month formats, and dates written with A.D./AD/CE or B.E./BE year notation.
- Convert Buddhist Era (B.E.) years to Gregorian years before returning them when possible.
- If exact time isn't present, default hour=0 and minute=0.
- If text says daytime/morning/afternoon -> day.
- If text says nighttime/evening/midnight -> night.
- If no clue -> unknown.
- If astrology system not specified, return "unknown".
- Transit precision:
  1) Exact full date has highest priority.
  2) Relative day words (today/tomorrow) are second.
  3) Day-only phrases (on 20 / วันที่ 20 / date 15) are third and should use current month/year.
  4) Otherwise no transit date.
- Transit: Set transitDate.mentioned=true ONLY when you can resolve a concrete calendar day/month/year for transit/forecast timing.
- Transit examples:
  - "today"/"วันนี้"/"this day" -> current date
  - "tomorrow"/"พรุ่งนี้" -> tomorrow
  - "วันที่ 20"/"on 20"/"date 15" -> that day in current month/year
  - "15 Jan 2025"/"March 3" -> parse date
- Transit negative rules:
  - If message only says broad periods like "this month", "next year", "soon", "ช่วงนี้", "เดือนหน้า" with no specific day, set mentioned=false.
  - If date is ambiguous and cannot be resolved to a single day/month/year, set mentioned=false.
  - Do not use birth date as transitDate unless user clearly asks forecast/transit for that same date.

Classification rules (replyStrategy — pick ONE):
- "timing": user asks WHEN something will happen or which day is best. Examples: "when will I get married", "เมื่อไหร่จะรวย", "best day to resign", "วันไหนดี", "how soon will I…".
- "timeline": user asks WHAT WILL HAPPEN over a future window with no single date. Examples: "what will happen this month", "อะไรจะเกิดขึ้นในเดือนหน้า", "what is the next quarter like for me". Requires a multi-day window in the question — if no time window is present, prefer "natal" or "daily" instead.
- "natal": open-ended self / personality question with NO date or window. Examples: "which career fits me", "am I lucky in love", "what is my life purpose", "ดวงของฉันเป็นยังไง", anything asking about birth-chart suitability.
- "daily": short-range or single-day reading anchored to today / tomorrow / a specific date or a short relative window (this week, in 7 days). Use when the user wants a focused transit reading for a known day or short window.
- "general": small talk, clarification, or anything that doesn't fit the four above. The verdict hero will not render.

Topic, intent, and hint rules:
- questionTopic: pick the strongest life domain present in the question. "general" if none clearly apply.
- predictiveIntent: true for "what will happen / how will X go / อะไรจะเกิดขึ้น / จะเป็นยังไง". Should be true whenever replyStrategy="timeline".
- naturalNatalReference: true when the user explicitly references their own placements ("my Saturn", "my Sun sign", "ดวงของฉัน", "ราศีของฉัน", "ลัคนาของฉัน").
- birthChartSuitability: true when the user asks what they're suited for ("birth chart suitable for", "life purpose", "career path", "เหมาะกับ", "พรสวรรค์", "ดวงกำเนิด").
- calendarRecommendationIntent: when the user asks for the BEST day for an action, classify the action. Otherwise "none".
- timeRangeDaysHint: how many days of transit data should answer the question. "today" or "tonight" -> 1; short-term / vague -> 30; "this year" / "next few months" -> 90-180; long-term WHEN questions (career change, marriage, moving) -> 180-365; lifetime questions -> 365-730. Match explicit timeframes when given.`,
                prompt: `User locale: ${locale}
Current date: ${new Date().toISOString().slice(0, 10)}
Message:
${payload.message}`,
            })
            extracted = extraction.object
        } catch {
            // Fail-soft: keep request flowing with deterministic fallbacks instead of 400.
            // This allows /api/horoscope/question to apply default timeframe fallback.
            extracted = fallbackExtracted
        }

        const normalizedBirthYear = normalizeCalendarYear(
            extracted.birthDate?.year ?? null,
        )
        const normalizedTransitYear = normalizeCalendarYear(
            extracted.transitDate?.year ?? null,
        )
        const normalizedBirthTime = {
            hour: extracted.birthTime?.hour ?? 0,
            minute: extracted.birthTime?.minute ?? 0,
            timeHint: extracted.birthTime?.timeHint ?? "unknown",
            isExact: Boolean(
                extracted.birthTime?.isExact &&
                    extracted.birthTime?.hour != null &&
                    extracted.birthTime?.minute != null,
            ),
        }

        const hasDate = Boolean(
            extracted.birthDate?.day &&
                extracted.birthDate?.month &&
                normalizedBirthYear,
        )

        const hasTime = true

        let country =
            extracted.location?.country?.trim() ||
            payload.currentLocation?.country?.trim() ||
            ""
        let state =
            extracted.location?.state?.trim() ||
            payload.currentLocation?.state?.trim() ||
            ""

        let lat =
            typeof payload.currentLocation?.lat === "number"
                ? payload.currentLocation.lat
                : null
        let lng =
            typeof payload.currentLocation?.lng === "number"
                ? payload.currentLocation.lng
                : null
        let timezone =
            typeof payload.currentLocation?.timezone === "number"
                ? payload.currentLocation.timezone
                : null

        if (country && (lat == null || lng == null || timezone == null)) {
            const resolved = resolveLocationFromCountryState(
                country,
                state || undefined,
            )
            if (resolved) {
                country = resolved.countryName
                state = resolved.stateName || state
                lat = resolved.latitude
                lng = resolved.longitude
                timezone = resolved.timezone
            }
        }

        const usedLocationFallback =
            !extracted.location?.country && Boolean(country)
        const defaultSystem = getDefaultAstrologySystem(
            locale,
            country || undefined,
        )
        const systemPreference =
            extracted.systemPreference === "unknown"
                ? defaultSystem
                : extracted.systemPreference

        const transit = selectTransitDateFromSources({
            message: payload.message,
            extractedTransit: extracted.transitDate
                ? {
                      ...extracted.transitDate,
                      year: normalizedTransitYear,
                  }
                : null,
        })
        const missingFields: string[] = []
        if (!hasDate) missingFields.push("birthDate")
        if (!(country && lat != null && lng != null && timezone != null)) {
            missingFields.push("birthLocation")
        }

        const classification = toQuestionClassification(extracted.classification)
        const questionRange = resolveQuestionTimeRangeWithHint(
            payload.message,
            extracted.classification.timeRangeDaysHint,
            {
                hintedTransitDate: transit
                    ? {
                          day: transit.day ?? null,
                          month: transit.month ?? null,
                          year: transit.year ?? null,
                      }
                    : null,
            },
        )
        const questionRangePayload: QuestionTimeRangePayload = {
            startDateIso: questionRange.startDateIso,
            endDateIso: questionRange.endDateIso,
            durationDays: questionRange.durationDays,
            source: questionRange.source,
            granularity: questionRange.granularity,
        }

        return Response.json({
            birthDate: extracted.birthDate
                ? {
                      ...extracted.birthDate,
                      year: normalizedBirthYear,
                  }
                : null,
            birthTime: {
                hour: normalizedBirthTime.hour,
                minute: normalizedBirthTime.minute,
                timeHint: normalizedBirthTime.timeHint,
                isExact: normalizedBirthTime.isExact,
            },
            location: {
                country: country || null,
                state: state || null,
                lat,
                lng,
                timezone,
                usedLocationFallback,
            },
            systemPreference,
            readiness: {
                hasDate,
                hasTime,
                hasLocation: Boolean(country && lat != null && lng != null),
                readyForCalculation:
                    hasDate &&
                    Boolean(
                        country &&
                            lat != null &&
                            lng != null &&
                            timezone != null,
                    ),
                missingFields,
            },
            transit,
            classification,
            questionRange: questionRangePayload,
        })
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "EXTRACT_FAILED"
        return Response.json({ error: message }, { status: 400 })
    }
}
