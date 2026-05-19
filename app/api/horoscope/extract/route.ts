import { generateObject } from "ai"
import { z } from "zod"
import {
    getRelevantPlanetsForTopic,
    type QuestionClassification,
    type QuestionTopic,
} from "@/lib/astrology/question-intent"
import type { QuestionTimeRangePayload } from "@/lib/astrology/question-time-range"

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

// LLM is constrained to the five "active" strategies. The server promotes to
// "rejected" when the question turns out to be about another person and the
// asker is on the free tier; that's not a decision for the AI to make.
const LLM_STRATEGY_VALUES = [
    "daily",
    "timing",
    "natal",
    "timeline",
    "general",
] as const

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

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const llmQuestionRangeSchema = z
    .object({
        startDateIso: z.string().regex(ISO_DATE_RE),
        endDateIso: z.string().regex(ISO_DATE_RE),
        durationDays: z.number().int().min(1).max(730),
        granularity: z.enum(["hourly", "daily"]),
    })
    .nullable()

const classificationSchema = z.object({
    replyStrategy: z.enum(LLM_STRATEGY_VALUES),
    questionTopic: z.enum(TOPIC_VALUES),
    predictiveIntent: z.boolean(),
    naturalNatalReference: z.boolean(),
    birthChartSuitability: z.boolean(),
    calendarRecommendationIntent: z.enum(CALENDAR_INTENT_VALUES),
    questionRange: llmQuestionRangeSchema,
})

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
    questionRange: null,
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

function detectOtherPersonIntent(
    mention: MentionedPerson,
    profile: ProfileForCompare,
): boolean {
    if (!mention) return false
    if (mention.isOtherPerson) return true
    if (!profile) return mention.namePresent && Boolean(mention.name)

    const mentionName = normalizeNameForCompare(mention.name)
    const profileName = normalizeNameForCompare(profile.name ?? null)
    if (
        mentionName &&
        profileName &&
        !mentionName.includes(profileName) &&
        !profileName.includes(mentionName)
    ) {
        return true
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

/**
 * Build a transit "moment" hint from the resolved questionRange. Downstream
 * routes still accept a `transit` payload for backwards compat with users who
 * want to "view the chart for this date" — we derive it deterministically
 * from the start of the range, rather than re-running a separate date regex.
 */
function transitFromRange(
    range: z.infer<typeof llmQuestionRangeSchema>,
): {
    day: number
    month: number
    year: number
    hour: number | null
    minute: number | null
} | null {
    if (!range) return null
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(range.startDateIso)
    if (!match) return null
    return {
        year: Number.parseInt(match[1], 10),
        month: Number.parseInt(match[2], 10),
        day: Number.parseInt(match[3], 10),
        hour: null,
        minute: null,
    }
}

export async function POST(req: Request) {
    try {
        const payload = requestSchema.parse(await req.json())
        const locale = payload.locale || "en"
        const planTier = payload.planTier ?? "free"
        const currentDateIso = new Date().toISOString().slice(0, 10)

        const fallbackExtracted: z.infer<typeof extractSchema> = {
            mentionedPerson: null,
            systemPreference: "unknown",
            classification: FALLBACK_CLASSIFICATION,
        }

        let extracted: z.infer<typeof extractSchema> = fallbackExtracted
        try {
            const extraction = await generateObject({
                model: MODEL,
                schema: extractSchema,
                temperature: 0,
                system: `You are the routing brain for an astrology chat. The asker is signed in and their own birth data is already on file — do NOT try to re-extract it. You make TWO decisions: who the question is about, and what reply strategy fits it.

=============================
DECISION 1 — Other-person extraction (fill mentionedPerson, else null)
=============================
Set mentionedPerson when the message references a third party in any of these ways:
- A proper name ("Will Sarah and I get along?").
- A relationship word (boyfriend, girlfriend, husband, wife, mom, dad, son, daughter, friend, แฟน, สามี, ภรรยา, พ่อ, แม่, ลูก, เพื่อน, ແຟນ, etc.).
- A third-party birth fact ("my friend was born on 1990-04-12").
- Pronouns that clearly point at a third party (he, she, they, เขา, เธอ) — only when the surrounding sentence is about that person, not the asker.

Fields:
- namePresent: true if a proper name appears; name: the exact name (null if only a relationship word was used).
- relationshipHint: the relationship word, else null.
- birthDate / birthTime / birthPlace: only when the message explicitly attaches those facts to the third party. Leave null when the asker is talking about themself.
- isOtherPerson: your final read. true when the question is asking about the chart / fortune / future / compatibility of someone other than the asker; false when it's a self question.

Self-references ("am I", "will I", "ดวงของฉัน", "ดวงกู", "my Saturn", "ลัคนาของฉัน") with no other person referenced → mentionedPerson = null.

=============================
DECISION 2 — replyStrategy and questionRange
=============================
Pick ONE strategy. Definitions are MUTUALLY EXCLUSIVE — for daily vs timeline the key signal is HOW MANY DAYS the question covers:

- "timing"   → the user is asking FOR a date or range as the ANSWER. Triggers: "when will…", "เมื่อไหร่…", "วันไหน…", "ฤกษ์…", "by when", "how soon", "best day to…". Even if a search window is given.
- "timeline" → MULTI-DAY range (2 or more days) anchored in the question. Whenever the question covers more than one day AND has any predictive / "what will it be" phrasing, choose timeline — regardless of word order, regardless of whether the user said "รายวัน". Phrasings that count as predictive include: "what will happen", "how will it go", "what's it like", "จะเป็นยังไง", "จะเป็นยังไงบ้าง", "จะเปนยังไงบ้าง", "อะไรจะเกิด", "เป็นยังไงบ้าง", "ดวงเป็นยังไง". Multi-day windows: explicit date ranges ("19-25 พค", "March to May"), week / month / quarter / year windows, "within N days", "for the next N days/weeks/months/years", etc. Two semantically equivalent multi-day predictive questions must always classify the same way no matter where the pronoun sits.
- "daily"    → SINGLE-DAY anchor (exactly one calendar day). Use only when the resolved range is one day total: a specific date, "today / tonight / วันนี้", "tomorrow / พรุ่งนี้", "yesterday / เมื่อวาน", or a single named day. Never use daily for a date RANGE or a calendar window that spans more than one day.
- "natal"    → NO time anchor at all, asker asks about their enduring self / nature / suitability / placements. Triggers: "which career fits me", "what is my purpose", "ดวงของฉันเป็นยังไง" without a date, "my Saturn means", "ราศีของฉัน", "ลัคนาของฉัน", birth-chart suitability. If even one date or window word is present, this is NOT natal.
- "general"  → small talk, clarification, or anything that doesn't fit the four above.

Priority order when multiple could fit: timing → timeline → daily → natal → general. (Timing always wins because the user is asking for a date, not for content. Timeline beats daily whenever the range spans more than one day.)

=============================
What counts as a "time anchor" in the question
=============================
Any of these put the question into the daily/timing/timeline bucket and out of natal:
- Explicit dates: "2025-03-12", "12/03/2025", "March 12 2025", "12 มีนาคม 2568", "12 มีค", abbreviated months in any language.
- Explicit ranges: "19-23 May", "19-23 พค", "March to May", "next week through Friday".
- Single-day relatives: "today", "tonight", "tomorrow", "yesterday", "วันนี้", "พรุ่งนี้", "เมื่อวาน", "คืนนี้", "ມື້ນີ້", "ມື້ອື່ນ".
- Calendar windows: "this/next/last week|month|quarter|year", "สัปดาห์นี้/หน้า", "เดือนนี้/หน้า", "ปีนี้/หน้า", "ອາທິດນີ້/ໜ້າ", "ເດືອນນີ້/ໜ້າ".
- Duration phrases: "within/in/for/next N days|weeks|months|years", "ในอีก/ภายใน/อีก N วัน/สัปดาห์/เดือน/ปี".

=============================
DECISION 2b — questionRange (set for daily/timing/timeline, null for natal/general)
=============================
Resolve the date(s) the question is bound to. Today is ${currentDateIso} (UTC).

- Single explicit date  → start = end = that date, durationDays = 1, granularity = "hourly".
- Explicit date range   → start = first day, end = last day (inclusive), durationDays = days between, granularity = "daily".
- "today" / "tonight" / "วันนี้" / "ມື້ນີ້" → today, 1 day, hourly.
- "tomorrow" / "พรุ่งนี้" / "ມື້ອື່ນ" → tomorrow, 1 day, hourly.
- "this week" / "สัปดาห์นี้" / "ອາທິດນີ້" → today through the end of this calendar week (Sunday), daily.
- "next week" / "สัปดาห์หน้า" / "ອາທິດໜ້າ" → next Monday → following Sunday, daily.
- "this month" / "เดือนนี้" / "ເດືອນນີ້" → today through last day of this month, daily.
- "next month" / "เดือนหน้า" / "ເດືອນໜ້າ" → first → last day of next month, daily.
- "this year" / "ปีนี้" / "ປີນີ້" → today through Dec 31 of this year, daily.
- "next year" / "ปีหน้า" / "ປີໜ້າ" → Jan 1 → Dec 31 of next year, daily.
- "within / in / for / next N days|weeks|months|years", "ในอีก/ภายใน/อีก N วัน/สัปดาห์/เดือน/ปี" → today + N units, daily.
- TIMING with no explicit window: start = today, end = today + 365, durationDays = 365, granularity = "daily". (Pure "when will I be rich?" → forward search for a year.)
- Single-day question with an explicit "by the hour / hourly / รายชั่วโมง / ໂມງໃດ" cue: keep duration = 1 but granularity = "hourly".
- Multi-day window with a "by the hour" cue: still daily.

Set questionRange = null ONLY when replyStrategy is "natal" or "general". For daily/timing/timeline you MUST return a concrete questionRange.

If the user wrote a Buddhist Era year (e.g. 2568), convert to Gregorian (2025) before returning.

=============================
DECISION 2c — Topic and signals
=============================
- questionTopic: pick the strongest life domain present. "general" if none clearly apply.
- predictiveIntent: true for predictive phrasings. Should be true whenever replyStrategy = "timeline".
- naturalNatalReference: true when the user references their own placements ("my Saturn", "ลัคนาของฉัน").
- birthChartSuitability: true for "what am I suited for" / "พรสวรรค์" / "เหมาะกับ".
- calendarRecommendationIntent: pick the matching action for "best day to…" questions, else "none". (Map "resign / ลาออก" → resignation, "change/new job / เปลี่ยนงาน / สมัครงาน" → job_change, "sign contract / เซ็นสัญญา" → contract_sign, "marry / wedding / แต่งงาน / หมั้น" → marriage, "travel / fly / move abroad / เดินทาง / ย้ายประเทศ" → travel_long, "buy car/house / ซื้อรถ / ซื้อบ้าน" → major_purchase.)

=============================
systemPreference
=============================
western_tropical / vedic_sidereal / both when stated, else "unknown".

=============================
Worked examples
=============================
- "19-23 พค ดวงกูจะเป็นยังไง รายวัน" → timeline (multi-day window + รายวัน cue).
- "วันที่ 19-25 พค จะเปนยังไงบ้าง กู" → timeline (multi-day window + predictive). Word order does NOT change the classification.
- "วันที่ 19-25 พค กูจะเปนยังไงบ้าง" → timeline. Same question as above with the pronoun moved — same classification.
- "next month จะเป็นยังไง" / "เดือนหน้าดวงฉันเป็นยังไง" → timeline (multi-day window + predictive).
- "this week ฉันจะเป็นยังไง" / "อาทิตย์นี้ดวงเป็นยังไง" → timeline (multi-day window + predictive).
- "พรุ่งนี้ฉันจะมีโชคไหม" → daily (single-day relative).
- "วันนี้ดวงเป็นยังไง" → daily (single day).
- "วันที่ 19 พค ดวงกูเป็นยังไง" → daily (single explicit date, NOT a range).
- "เมื่อไหร่ฉันจะรวย" → timing.
- "ดวงของฉันเป็นยังไง" alone → natal.
- "which career fits me" → natal.
- "Best day to resign next month" → timing.`,
                prompt: `User locale: ${locale}
Current date (UTC): ${currentDateIso}
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
                classification: {
                    ...toQuestionClassification(extracted.classification),
                    replyStrategy: "rejected" as const,
                },
            })
        }

        const defaultSystem = locale.startsWith("th") || locale.startsWith("lo")
            ? "vedic_sidereal"
            : "western_tropical"
        const systemPreference =
            extracted.systemPreference === "unknown"
                ? defaultSystem
                : extracted.systemPreference

        const transit = transitFromRange(extracted.classification.questionRange)
        const classification = toQuestionClassification(extracted.classification)

        const range = extracted.classification.questionRange
        const questionRangePayload: QuestionTimeRangePayload | null = range
            ? {
                  startDateIso: range.startDateIso,
                  endDateIso: range.endDateIso,
                  durationDays: range.durationDays,
                  source: "ai_inferred",
                  granularity: range.granularity,
              }
            : null

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
