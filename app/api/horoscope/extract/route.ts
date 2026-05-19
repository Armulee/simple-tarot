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

const PAID_TIERS = new Set(["basic", "pro"])

const classificationSchema = z.object({
    replyStrategy: z.enum(REPLY_STRATEGY_VALUES),
    questionTopic: z.enum(TOPIC_VALUES),
    predictiveIntent: z.boolean(),
    naturalNatalReference: z.boolean(),
    birthChartSuitability: z.boolean(),
    calendarRecommendationIntent: z.enum(CALENDAR_INTENT_VALUES),
    timeRangeDaysHint: z.number().int().min(1).max(730),
})

/**
 * Detection schema for "is the user asking about someone else?". We pull
 * any name / birth fact mentioned in the message so the server can
 * compare against the asker's profile. The LLM also gives its own
 * yes/no read — both sources combine on the server.
 */
const mentionedPersonSchema = z
    .object({
        namePresent: z.boolean(),
        name: z.string().nullable(),
        relationshipHint: z.string().nullable(),
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
            })
            .nullable(),
        birthPlace: z
            .object({
                country: z.string().trim().min(1).nullable(),
                state: z.string().trim().min(1).nullable(),
            })
            .nullable(),
        isOtherPerson: z.boolean(),
    })
    .nullable()

const extractSchema = z.object({
    mentionedPerson: mentionedPersonSchema,
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

const profileSchema = z
    .object({
        name: z.string().nullable().optional(),
        birthDate: z
            .object({
                day: z.number().int().min(1).max(31).nullable().optional(),
                month: z.number().int().min(1).max(12).nullable().optional(),
                year: z
                    .number()
                    .int()
                    .min(1857)
                    .max(2800)
                    .nullable()
                    .optional(),
            })
            .nullable()
            .optional(),
        birthPlace: z
            .object({
                country: z.string().nullable().optional(),
                state: z.string().nullable().optional(),
            })
            .nullable()
            .optional(),
    })
    .nullable()
    .optional()

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
    profile: profileSchema,
    planTier: z.enum(["free", "basic", "pro"]).optional(),
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

function normalizeNameForCompare(name: string | null | undefined): string {
    if (!name) return ""
    return name.toLowerCase().replace(/[\s.\-']/g, "").trim()
}

type ProfileForCompare = z.infer<typeof profileSchema>
type MentionedPerson = z.infer<typeof mentionedPersonSchema>

/**
 * Combine the LLM's `isOtherPerson` call with a deterministic server
 * comparison against the asker's profile. Either signal alone is enough
 * to flip the gate so a forgotten model call doesn't silently bypass
 * the paywall, and a sloppy AI match doesn't lock the asker out of
 * their own reading.
 */
function detectOtherPersonIntent(
    mention: MentionedPerson,
    profile: ProfileForCompare,
): boolean {
    if (!mention) return false
    if (mention.isOtherPerson) return true
    if (!profile) return mention.namePresent && Boolean(mention.name)

    const mentionName = normalizeNameForCompare(mention.name)
    const profileName = normalizeNameForCompare(profile.name ?? null)
    if (mentionName && profileName && !mentionName.includes(profileName) && !profileName.includes(mentionName)) {
        return true
    }
    if (mentionName && !profileName) {
        // Name in message but no profile name to compare against — trust the
        // AI's read; if it said this person isn't the asker we already returned.
        return false
    }

    const mb = mention.birthDate
    const pb = profile.birthDate
    if (mb?.day && mb.month && mb.year && pb?.day && pb.month && pb.year) {
        const normalizedMentionYear = normalizeCalendarYear(mb.year)
        if (
            mb.day !== pb.day ||
            mb.month !== pb.month ||
            normalizedMentionYear !== pb.year
        ) {
            return true
        }
    }

    return false
}

export async function POST(req: Request) {
    try {
        const payload = requestSchema.parse(await req.json())
        const locale = payload.locale || "en"
        const planTier = payload.planTier ?? "free"

        const fallbackExtracted: z.infer<typeof extractSchema> = {
            mentionedPerson: null,
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
                system: `Extract OTHER-PERSON references, transit date, and classify the question for the horoscope reply strategy.

The asker is signed in and their own birth data is already on file. Your job is NOT to re-extract the asker's own details. Your job is to detect when the question targets a DIFFERENT person and to classify the question.

Mentioned-person extraction rules (fill mentionedPerson, or set it to null):
- Set mentionedPerson when the message contains ANY of: a personal name, a relationship word (boyfriend, girlfriend, husband, wife, mom, dad, son, daughter, friend, แฟน, สามี, ภรรยา, พ่อ, แม่, ลูก, เพื่อน, ແຟນ, etc.), a third-party birth fact ("my friend was born on…"), or pronouns clearly pointing at a third party (he, she, they, เขา, เธอ).
- namePresent: true if a proper name appears in the message. name: the exact name as written; null when only a relationship word is used.
- relationshipHint: the relationship word if any ("boyfriend", "mom", "แฟน"). null otherwise.
- birthDate / birthTime / birthPlace: fill ONLY when the message explicitly attaches these facts to the third party. Leave null when the asker is talking about themself.
- isOtherPerson: your call after reading the whole message. true when the question is asking about the chart, fortune, fate, compatibility, or future of someone other than the asker. false when the question is about the asker. false for compatibility questions phrased as "my partner and I…" only if there is no separately identifiable third party to read on; true when the asker wants a reading of a specific named person.
- Self-references ("am I", "will I", "ดวงของฉัน", "ดวงกู") with no other person referenced → mentionedPerson = null.

Transit / classification rules unchanged — follow the previous spec:
- transitDate.mentioned=true ONLY when a single concrete calendar day for transit/forecast is resolvable.
- systemPreference: western_tropical / vedic_sidereal / both / unknown.
- classification.replyStrategy priority order: timing → timeline → daily → natal → general. Any date or window in the question rules out "natal".
- timing: WHEN questions ("when will…", "เมื่อไหร่…", "วันไหน…", "ฤกษ์…").
- timeline: predictive phrasing ("จะเป็นยังไง / what will happen / how will it go") + a multi-day window (range, "this month", "within 7 days", explicit "daily/รายวัน" cue, or an explicit date range — even abbreviated Thai/Lao months count as a window).
- daily: a date anchor for one day (or short relative window) with no "when" intent and no multi-day predictive cue.
- natal: NO time anchor at all, asking about enduring nature, suitability, talents, placements ("ดวงของฉันเป็นยังไง" without a date, "which career fits me", "ราศีของฉัน").
- general: small talk / clarification.
- questionTopic: pick the strongest life domain or "general".
- predictiveIntent: true for predictive phrasings. Should be true whenever replyStrategy="timeline".
- naturalNatalReference: true when the user references their own placements ("my Saturn", "ลัคนาของฉัน").
- birthChartSuitability: true for "what am I suited for" / "พรสวรรค์" / "เหมาะกับ".
- calendarRecommendationIntent: classify the action for "best day to…" questions, else "none".
- timeRangeDaysHint: 1 for today/tonight; 30 for vague short-term; 90-180 for "this year/next few months"; 180-365 for long-term timing; 365-730 for lifetime. Match explicit timeframes.`,
                prompt: `User locale: ${locale}
Current date: ${new Date().toISOString().slice(0, 10)}
${payload.profile?.name ? `Asker's name: ${payload.profile.name}` : "Asker's name: (not provided)"}
Message:
${payload.message}`,
            })
            extracted = extraction.object
        } catch {
            extracted = fallbackExtracted
        }

        const otherPerson = detectOtherPersonIntent(
            extracted.mentionedPerson,
            payload.profile ?? null,
        )

        if (otherPerson && !PAID_TIERS.has(planTier)) {
            return Response.json({
                paywall: {
                    reason: "other_person",
                    requiredTier: "basic",
                },
                mentionedPerson: extracted.mentionedPerson,
            })
        }

        const normalizedTransitYear = normalizeCalendarYear(
            extracted.transitDate?.year ?? null,
        )

        let country = payload.currentLocation?.country?.trim() || ""
        let state = payload.currentLocation?.state?.trim() || ""
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
            paywall: null,
            mentionedPerson: extracted.mentionedPerson,
            systemPreference,
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
