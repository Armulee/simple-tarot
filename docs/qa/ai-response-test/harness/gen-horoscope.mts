/**
 * Harness: reproduce the EXACT prompts the horoscope endpoints send to their model.
 *
 * Replicates the glue of:
 *   - app/api/horoscope/verdict/route.ts   (daily + timing paths)
 *   - app/api/horoscope/question/route.ts  (long-form interpretation)
 *
 * Fixed "now" = 2026-07-03T12:00:00+07:00 (Bangkok) = 2026-07-03T05:00:00Z.
 * No Supabase env => getCodexTransitWindow returns the swisseph_fallback
 * empty-rows result exactly as in the deployed-without-codex configuration.
 *
 * For each case we ALSO compute a "simulatedCodex" variant where the
 * ephemeris_codex rows are synthesized locally with the same Swiss Ephemeris
 * WASM the production codex table is generated from (sampled 00:00 UT/day).
 * That variant is clearly marked — it shows what the prompt looks like when
 * the codex is populated (i.e. real computed transit events).
 */

import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

// ---- repo imports (absolute paths; repo-internal "@/" resolves via tsconfig) ----
import { buildChartData } from "/home/user/simple-tarot/lib/astrology/build-chart-data"
import {
    getDailyVerdictPrompt,
    getTimingVerdictPrompt,
    getHoroscopeInterpretationPrompt,
    type NatalPlacementForPrompt,
} from "/home/user/simple-tarot/lib/prompts/index"
import { deepseekThinking } from "/home/user/simple-tarot/lib/chat/model-options"
import { resolveResponseLanguage } from "/home/user/simple-tarot/lib/i18n/ai-language"
import {
    resolveQuestionTimeRange,
    type QuestionTimeRange,
} from "/home/user/simple-tarot/lib/astrology/question-time-range"
import {
    isDateBoundedQuestionRange,
    isNatalQuestionRange,
    isSingleDayQuestionRange,
    looksLikeTimingQuestion,
} from "/home/user/simple-tarot/lib/astrology/single-day"
import {
    getCodexTransitWindow,
    type EphemerisCodexRow,
} from "/home/user/simple-tarot/lib/astrology/ephemeris-codex"
import {
    classifyQuestionTopic,
    detectPredictiveIntent,
    detectCalendarRecommendationIntent,
    isBirthChartSuitabilityQuestion,
    isNatalChartReferenceQuestion,
} from "/home/user/simple-tarot/lib/astrology/question-intent"
import {
    buildNatalLongitudes,
    buildPersonalizedTransitAspects,
    buildTransitLongitudesFromSwissPlanets,
    type PersonalizedTransitAspectsResult,
} from "/home/user/simple-tarot/lib/astrology/transit-aspects"
import { resolveBirthTime } from "/home/user/simple-tarot/lib/astrology/intake"
import {
    buildMyCalendarDaySnapshotForHoroscope,
    resolveSessionPrimaryChartSystem,
} from "/home/user/simple-tarot/lib/calendar/my-calendar-day-snapshot"
import type { SwissEphChart, AstrologyPoint } from "/home/user/simple-tarot/lib/astrology/types"

// swisseph-wasm directly (for the simulated codex rows only)
// @ts-ignore
import SwissEph from "/home/user/simple-tarot/node_modules/swisseph-wasm/src/swisseph.js"

// ---------------------------------------------------------------------------
const SP = "/tmp/claude-0/-home-user-simple-tarot/7d1b6962-2970-5a7a-81a0-15dcf3b6f016/scratchpad"
const OUT_DIR = path.join(SP, "out")
mkdirSync(OUT_DIR, { recursive: true })

const FIXED_NOW = new Date("2026-07-03T05:00:00.000Z") // 2026-07-03 12:00 Bangkok (+07)
const MODEL = "deepseek/deepseek-v4-pro"
const DAY_MS = 24 * 60 * 60 * 1000
const ASPECT_PADDING_DAYS = 90
const MIN_FILTERED_EVENTS = 3
const TIMING_SEARCH_DAYS = 365

const BIRTH = {
    day: 23,
    month: 8,
    year: 1995,
    hour: 14,
    minute: 30,
    timeHint: "unknown" as const,
    timezone: 7,
    lat: 13.7563,
    lng: 100.5018,
    country: "Thailand",
    state: null as string | null,
    usedLocationFallback: false,
}
const SYSTEM = "western_tropical" as const

// ---- verbatim route glue --------------------------------------------------
function addUtcDays(date: Date, days: number) {
    return new Date(date.getTime() + days * DAY_MS)
}
function toIsoDate(date: Date) {
    return date.toISOString().slice(0, 10)
}

function filterAspectsByRelevantPlanets(
    aspects: PersonalizedTransitAspectsResult,
    relevantPlanets: readonly string[],
): PersonalizedTransitAspectsResult {
    const planetSet = new Set(relevantPlanets)
    const filteredExact = aspects.exact
        ? {
              ...aspects.exact,
              events: aspects.exact.events.filter((e) => planetSet.has(e.transitPlanet)),
          }
        : null
    const filteredRange = aspects.range
        ? {
              ...aspects.range,
              events: aspects.range.events.filter((e) => planetSet.has(e.transitPlanet)),
          }
        : null
    const exactTooFew =
        filteredExact &&
        filteredExact.events.length < MIN_FILTERED_EVENTS &&
        (aspects.exact?.events.length ?? 0) >= MIN_FILTERED_EVENTS
    const rangeTooFew =
        filteredRange &&
        filteredRange.events.length < MIN_FILTERED_EVENTS &&
        (aspects.range?.events.length ?? 0) >= MIN_FILTERED_EVENTS
    return {
        ...aspects,
        exact: exactTooFew ? aspects.exact : filteredExact,
        range: rangeTooFew ? aspects.range : filteredRange,
    }
}

const NATAL_VERDICT_PLANETS: ReadonlyArray<string> = [
    "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn",
    "Rahu", "Ketu", "Uranus", "Neptune", "Pluto",
]

function buildHouseIndex(chart: SwissEphChart) {
    const cusps: Array<{ num: number; lng: number }> = []
    for (let i = 1; i <= 12; i++) {
        const h = chart.houses[String(i)]
        if (h && Number.isFinite(h.longitude)) {
            cusps.push({ num: i, lng: ((h.longitude % 360) + 360) % 360 })
        }
    }
    if (cusps.length !== 12) return { find: () => null as number | null }
    return {
        find: (longitude: number) => {
            const norm = ((longitude % 360) + 360) % 360
            for (let i = 0; i < 12; i++) {
                const start = cusps[i].lng
                const end = cusps[(i + 1) % 12].lng
                if (start === end) continue
                if (start < end) {
                    if (norm >= start && norm < end) return cusps[i].num
                } else if (norm >= start || norm < end) {
                    return cusps[i].num
                }
            }
            return null
        },
    }
}

function buildNatalPlacementsForPrompt(chart: SwissEphChart | undefined): NatalPlacementForPrompt[] {
    if (!chart) return []
    const placements: NatalPlacementForPrompt[] = []
    const houseIndex = buildHouseIndex(chart)
    for (const planet of NATAL_VERDICT_PLANETS) {
        const point = chart.planets[planet] as AstrologyPoint | undefined
        if (!point) continue
        if (!Number.isFinite(point.longitude)) continue
        placements.push({
            planet,
            sign: point.sign,
            degree: point.degree,
            house: houseIndex.find(point.longitude),
            retrograde: !!point.retrograde,
        })
    }
    return placements
}

function pickReplyStrategy(question: string, questionRange: QuestionTimeRange) {
    if (looksLikeTimingQuestion(question)) return "timing"
    const singleDay = isSingleDayQuestionRange({
        durationDays: questionRange.durationDays,
        source: questionRange.source,
    })
    const natalMode = isNatalQuestionRange({
        durationDays: questionRange.durationDays,
        source: questionRange.source,
    })
    if (natalMode) return "natal"
    if (!singleDay) return "general"
    if (detectPredictiveIntent(question)) return "timeline"
    return "daily"
}

function currentDateTimeString() {
    // Route: now.toLocaleString("en-CA", { dateStyle: "full", timeStyle: "long", timeZone: "UTC" })
    return FIXED_NOW.toLocaleString("en-CA", {
        dateStyle: "full",
        timeStyle: "long",
        timeZone: "UTC",
    })
}

function countEvents(a: PersonalizedTransitAspectsResult | null) {
    return {
        exact: a?.exact?.events.length ?? 0,
        range: a?.range?.events.length ?? 0,
        exactPresent: !!a?.exact,
        rangePresent: !!a?.range,
        rangeSampledDays: a?.range?.sampledDays ?? null,
    }
}

// ---- simulated ephemeris codex rows (Swiss Ephemeris, 00:00 UT sampling) ----
const SIM_BODIES: Array<{ key: string; retro: string; id: number }> = [
    { key: "sun_long", retro: "sun", id: 0 },
    { key: "moon_long", retro: "moon", id: 1 },
    { key: "mercury_long", retro: "mercury", id: 2 },
    { key: "venus_long", retro: "venus", id: 3 },
    { key: "mars_long", retro: "mars", id: 4 },
    { key: "jupiter_long", retro: "jupiter", id: 5 },
    { key: "saturn_long", retro: "saturn", id: 6 },
    { key: "uranus_long", retro: "uranus", id: 7 },
    { key: "neptune_long", retro: "neptune", id: 8 },
    { key: "pluto_long", retro: "pluto", id: 9 },
    { key: "true_node_long", retro: "true_node", id: 11 },
]

async function buildSimCodexRows(startIso: string, endIso: string): Promise<EphemerisCodexRow[]> {
    const swe: any = new (SwissEph as any)()
    await swe.initSwissEph()
    const rows: EphemerisCodexRow[] = []
    try {
        const flag = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED
        let t = Date.parse(`${startIso}T00:00:00.000Z`)
        const end = Date.parse(`${endIso}T00:00:00.000Z`)
        for (; t <= end; t += DAY_MS) {
            const d = new Date(t)
            const jd = swe.julday(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 0)
            const row: Record<string, unknown> = {
                date: toIsoDate(d),
                ayanamsa_lahiri: null,
                chiron_long: null,
                lilith_long: null,
                selena_long: null,
                ceres_long: null,
                pallas_long: null,
                juno_long: null,
                vesta_long: null,
            }
            const retro: Record<string, boolean> = {}
            for (const body of SIM_BODIES) {
                const res = swe.calc_ut(jd, body.id, flag) as Float64Array
                const lng = ((res[0] % 360) + 360) % 360
                row[body.key] = Number(lng.toFixed(6))
                retro[body.retro] = res[3] < 0
            }
            row.is_retrograde = retro
            rows.push(row as unknown as EphemerisCodexRow)
        }
    } finally {
        swe.close()
    }
    return rows
}

function simRowsBetween(rows: EphemerisCodexRow[], startIso: string, endIso: string) {
    return rows.filter((r) => r.date >= startIso && r.date <= endIso)
}

// ---------------------------------------------------------------------------
type CaseOutput = Record<string, unknown>

function writeCase(fileName: string, data: CaseOutput) {
    const file = path.join(OUT_DIR, fileName)
    writeFileSync(file, JSON.stringify(data, null, 2), "utf8")
    return file
}

async function main() {
    const currentDateTime = currentDateTimeString()
    const summaries: string[] = []

    // Pre-compute simulated codex rows for the union of all windows we need:
    // H1 aspect range (2026-04-05 → 2026-10-03) and timing search (2026-07-03 → 2027-07-03).
    const simRows = await buildSimCodexRows("2026-04-05", "2027-07-03")
    console.log(`[sim] synthesized ${simRows.length} codex rows (2026-04-05 → 2027-07-03, 00:00 UT sampling)`)

    // =========================================================================
    // H1 — DAILY: "Is tomorrow a good day to sign my job contract?" (en)
    // =========================================================================
    {
        const question = "Is tomorrow a good day to sign my job contract?"
        const locale = "en"

        // Route: resolveQuestionTimeRangeAsync — regex resolver finds "tomorrow"
        // (source !== default_30d) so NO AI round-trip happens. Sync call is exact.
        const questionRange = resolveQuestionTimeRange(question, { now: FIXED_NOW })
        const strategy = pickReplyStrategy(question, questionRange)
        const topic = classifyQuestionTopic(question)
        const questionLanguage = resolveResponseLanguage(locale, question)
        const chartLocale = questionLanguage === "Thai" || questionLanguage === "Lao" ? "th" : "en"

        const aspectRange = {
            ...questionRange,
            startDate: addUtcDays(questionRange.startDate, -ASPECT_PADDING_DAYS),
            endDate: addUtcDays(questionRange.endDate, ASPECT_PADDING_DAYS),
            startDateIso: toIsoDate(addUtcDays(questionRange.startDate, -ASPECT_PADDING_DAYS)),
            endDateIso: toIsoDate(addUtcDays(questionRange.endDate, ASPECT_PADDING_DAYS)),
            durationDays: questionRange.durationDays + ASPECT_PADDING_DAYS * 2,
        }

        const codexTransit = await getCodexTransitWindow(questionRange)
        const aspectCodexTransit = await getCodexTransitWindow(aspectRange)

        const chartDataResult = await buildChartData(
            {
                birth: BIRTH,
                system: SYSTEM,
                transit: undefined,
                questionRange,
                transitDataSource: codexTransit.source,
                codexTransitSummary: codexTransit.summary,
            },
            chartLocale,
        )
        const primaryBirthChart = chartDataResult.charts?.[0]
        const primaryTransitChart = chartDataResult.transit?.charts?.[0]
        const natalLongitudes = buildNatalLongitudes(primaryBirthChart?.planets ?? {})
        const fallbackExactTransitLongitudes = buildTransitLongitudesFromSwissPlanets(
            primaryTransitChart?.planets ?? {},
        )
        const rawTransitAspects = buildPersonalizedTransitAspects({
            questionRange: {
                source: questionRange.source,
                startDateIso: questionRange.startDateIso,
                endDateIso: questionRange.endDateIso,
            },
            natalLongitudes,
            codexRows: aspectCodexTransit.rows,
            fallbackExactTransitLongitudes,
        })
        const questionTopic = { topic: topic.topic, relevantPlanets: [...topic.relevantPlanets] }
        const personalizedTransitAspects =
            questionTopic.topic !== "general"
                ? filterAspectsByRelevantPlanets(rawTransitAspects, questionTopic.relevantPlanets)
                : rawTransitAspects

        const sessionPrimarySystem = resolveSessionPrimaryChartSystem(locale, BIRTH.country, SYSTEM)
        const myCalendarDay = primaryBirthChart?.planets
            ? await buildMyCalendarDaySnapshotForHoroscope({
                  birth: BIRTH,
                  isoDate: questionRange.startDateIso,
                  codexRows: codexTransit.rows,
                  textLocale: locale,
                  sessionChartSystem: sessionPrimarySystem,
                  sessionNatalPlanets: primaryBirthChart.planets as Record<string, unknown>,
              })
            : null

        // ---- H1.verdict (daily path of /api/horoscope/verdict) ----
        const verdictPrompt = getDailyVerdictPrompt({
            question,
            currentDateTime,
            questionRange: {
                startDateIso: questionRange.startDateIso,
                endDateIso: questionRange.endDateIso,
                durationDays: questionRange.durationDays,
                source: questionRange.source,
            },
            personalizedTransitAspects,
            questionLanguage,
            userMainPoint: "",
            myCalendarDay,
        })
        const verdictBaseSystem = `You are Astra, a female oracle. Produce ONLY the daily verdict JSON. Plain language, no astrology jargon, no planet names. Output language: ${questionLanguage}. Always set mode to "daily".`
        const verdictSystem = `${verdictBaseSystem}

Return ONLY the verdict JSON object itself. Do NOT wrap it in another key like "dailyVerdict".`

        // ---- simulatedCodex variant (marked) ----
        const simAspectRows = simRowsBetween(simRows, aspectRange.startDateIso, aspectRange.endDateIso)
        const simQrRows = simRowsBetween(simRows, questionRange.startDateIso, questionRange.endDateIso)
        const rawSim = buildPersonalizedTransitAspects({
            questionRange: {
                source: questionRange.source,
                startDateIso: questionRange.startDateIso,
                endDateIso: questionRange.endDateIso,
            },
            natalLongitudes,
            codexRows: simAspectRows,
            fallbackExactTransitLongitudes,
        })
        const filteredSim =
            questionTopic.topic !== "general"
                ? filterAspectsByRelevantPlanets(rawSim, questionTopic.relevantPlanets)
                : rawSim
        const myCalendarDaySim = primaryBirthChart?.planets
            ? await buildMyCalendarDaySnapshotForHoroscope({
                  birth: BIRTH,
                  isoDate: questionRange.startDateIso,
                  codexRows: simQrRows,
                  textLocale: locale,
                  sessionChartSystem: sessionPrimarySystem,
                  sessionNatalPlanets: primaryBirthChart.planets as Record<string, unknown>,
              })
            : null
        const verdictPromptSim = getDailyVerdictPrompt({
            question,
            currentDateTime,
            questionRange: {
                startDateIso: questionRange.startDateIso,
                endDateIso: questionRange.endDateIso,
                durationDays: questionRange.durationDays,
                source: questionRange.source,
            },
            personalizedTransitAspects: filteredSim,
            questionLanguage,
            userMainPoint: "",
            myCalendarDay: myCalendarDaySim,
        })

        const f1 = writeCase("H1.verdict.json", {
            caseId: "H1.verdict",
            endpoint: "/api/horoscope/verdict (strategy=daily, streamDailyVerdictResponse)",
            model: MODEL,
            params: {
                api: "streamObject",
                mode: "json",
                temperature: 0.55,
                providerOptions: deepseekThinking(false),
                schema: "streamingDailyVerdictSchema (lib/astrology/schema.ts)",
                streaming: true,
            },
            system: verdictSystem,
            prompt: verdictPrompt,
            topicDetected: questionTopic,
            replyStrategy: strategy,
            resolvedLanguage: questionLanguage,
            questionRange: {
                startDateIso: questionRange.startDateIso,
                endDateIso: questionRange.endDateIso,
                durationDays: questionRange.durationDays,
                source: questionRange.source,
                granularity: questionRange.granularity,
            },
            aspectEventCounts: {
                beforeFilter: countEvents(rawTransitAspects),
                afterFilter: countEvents(personalizedTransitAspects),
            },
            myCalendarDay,
            notes: [
                `questionRange.source is "${questionRange.source}" (NOT "explicit"): "tomorrow" matches BOTH parseRelativeSingleDayDate and parseRelativeRange, and the relativeRange branch wins, setting source="relative". granularity="${questionRange.granularity}".`,
                `No Supabase env => getCodexTransitWindow returns source="swisseph_fallback", reason="SUPABASE_ADMIN_UNAVAILABLE", rows=[], coverage={expectedDays:${codexTransit.coverage.expectedDays}, actualDays:0, ratio:0, isComplete:false}, summary=null.`,
                `With rows=[] the aspect builder returns range={sampledDays:0, events:[]} and exact=null (exact is only computed when source==="explicit"; here source="relative", so the swisseph fallback transit longitudes for 2026-07-04 are NEVER used). The daily verdict prompt therefore ships an EMPTY aspect block while its rules still tell the model to derive mood from "the dominant sentiments + intensities of the personalized transit aspects".`,
                `myCalendarDay is null in the no-codex path (snapshot requires a codex row for the day), so no LOCKED MOOD line appears.`,
                `simulatedCodex variant below: codex rows synthesized locally via Swiss Ephemeris (00:00 UT daily sampling, same engine production codex rows come from). Clearly a substitute for the Supabase table; production sampling time is unknown so orb values may differ by up to the day's planetary motion.`,
            ],
            simulatedCodex: {
                marked: "SUBSTITUTE — swisseph-synthesized codex rows, NOT the production Supabase table",
                aspectEventCounts: {
                    beforeFilter: countEvents(rawSim),
                    afterFilter: countEvents(filteredSim),
                },
                myCalendarDay: myCalendarDaySim,
                prompt: verdictPromptSim,
            },
        })
        summaries.push(
            `H1.verdict: topic=${questionTopic.topic} planets=[${questionTopic.relevantPlanets.join(",")}] lang=${questionLanguage} strategy=${strategy} range=${questionRange.startDateIso}→${questionRange.endDateIso} (${questionRange.source}/${questionRange.granularity}) events before/after=${countEvents(rawTransitAspects).range}/${countEvents(personalizedTransitAspects).range} (exact ${countEvents(rawTransitAspects).exact}/${countEvents(personalizedTransitAspects).exact}) promptLen=${verdictPrompt.length} simRange=${countEvents(rawSim).range}→${countEvents(filteredSim).range} simPromptLen=${verdictPromptSim.length} file=${f1}`,
        )

        // ---- H1.question (/api/horoscope/question) ----
        const naturalNatalReference = isNatalChartReferenceQuestion(question)
        const suitabilityQuestion = isBirthChartSuitabilityQuestion(question)
        const calendarIntent = detectCalendarRecommendationIntent(question)
        const resolvedTime = resolveBirthTime({
            hour: BIRTH.hour,
            minute: BIRTH.minute,
            timeHint: BIRTH.timeHint,
        })
        const chartDataForPrompt = { ...chartDataResult, personalizedTransitAspects: undefined }
        const chartData = JSON.stringify(chartDataForPrompt)

        const questionPrompt = getHoroscopeInterpretationPrompt({
            question,
            systemMode: SYSTEM,
            chartData,
            isApproximateTime: resolvedTime.isApproximate,
            usedLocationFallback: Boolean(BIRTH.usedLocationFallback),
            currentDateTime,
            questionRange: {
                startDateIso: questionRange.startDateIso,
                endDateIso: questionRange.endDateIso,
                durationDays: questionRange.durationDays,
                source: questionRange.source,
            },
            transitDataSource: codexTransit.source,
            codexTransitSummary: codexTransit.summary,
            codexCoverage: codexTransit.coverage,
            personalizedTransitAspects,
            isBirthChartSuitabilityQuestion: suitabilityQuestion,
            conversationContextText: "",
            userMainPoint: "",
            questionTopic,
            questionLanguage,
            storedBirthChart: null,
            isNatalChartReferenceQuestion: naturalNatalReference,
            calendarRecommendation: null,
            myCalendarDay,
        })

        const terminologySystemRule = `ABSOLUTELY FORBIDDEN in interpretation text: planet names (Saturn, Jupiter, Mars, Venus, Rahu, ดาวเสาร์, ดาวพฤหัส, ดาวอังคาร, ดาวศุกร์, ราหู, จันทร์, etc.), zodiac sign names (Aries, Pisces, ราศีเมษ, ราศีมีน, etc.), and astrology terms (conjunction, opposition, square, trine, sextile, orb, transit, เล็ง, ตรีโกณ, จตุโกณ, ร่วม, etc.). Translate all astrological meaning into life impact — emotions, energy, timing, advice.`
        const questionSystem = `You are an expert astrologer who writes for a general audience with ZERO astrology knowledge.
You respond as a female. Astra is a female oracle. Use feminine voice and perspective in all responses.
Be clear, kind, and practical. Never claim fixed destiny.
Write like a caring friend giving life advice — warm, conversational, and in plain everyday language. Write the way a native speaker would text a close friend. NEVER sound like an astrology textbook.

${terminologySystemRule}

LANGUAGE DETECTION RESULT: The user's question is in ${questionLanguage}.
CRITICAL: You MUST write your ENTIRE response (interpretation, conclusion, suggestions, aspectInsights) in ${questionLanguage}. Do NOT use any other language. If the question is in English, every single word of your output must be in English. If in Thai, every word in Thai. Ignore the language of any chart data or internal context — ONLY the user's question language matters.

CRITICAL: When citing time periods, use dates in the SAME language as your output. Thai output = Thai month names (กุมภาพันธ์, มีนาคม, etc.). English output = English month names (February, March, etc.). Example: Thai "22 กุมภาพันธ์ 2026 ถึง 22 กุมภาพันธ์ 2028"; English "February 22, 2026 to February 22, 2028". Do NOT use ISO format (YYYY-MM-DD). Never mix languages (e.g. Thai text with "February").

If the prompt includes a <calendar_recommendation> block, that block is the source of truth for any recommended single day. Follow its topCandidate date exactly and use the transit data only to explain why that day stands out.

Output structure: Provide interpretation (main reading), conclusion (short calming wrap-up), and suggestions (EXACTLY 3–4 follow-up QUESTIONS the user would tap to ask next — written in the user's own voice and ending like a question, e.g. "...ไหม" / "...เมื่อไหร่" / "...?"). suggestions are NOT advice or to-do items and NOT a restatement of the conclusion; never tell the user what to do — ask what they'd want to know next. Single line each, casual, all differing in angle.`

        const questionPromptSim = getHoroscopeInterpretationPrompt({
            question,
            systemMode: SYSTEM,
            chartData,
            isApproximateTime: resolvedTime.isApproximate,
            usedLocationFallback: Boolean(BIRTH.usedLocationFallback),
            currentDateTime,
            questionRange: {
                startDateIso: questionRange.startDateIso,
                endDateIso: questionRange.endDateIso,
                durationDays: questionRange.durationDays,
                source: questionRange.source,
            },
            transitDataSource: codexTransit.source,
            codexTransitSummary: codexTransit.summary,
            codexCoverage: codexTransit.coverage,
            personalizedTransitAspects: filteredSim,
            isBirthChartSuitabilityQuestion: suitabilityQuestion,
            conversationContextText: "",
            userMainPoint: "",
            questionTopic,
            questionLanguage,
            storedBirthChart: null,
            isNatalChartReferenceQuestion: naturalNatalReference,
            calendarRecommendation: null,
            myCalendarDay: myCalendarDaySim,
        })

        const f2 = writeCase("H1.question.json", {
            caseId: "H1.question",
            endpoint: "/api/horoscope/question",
            model: MODEL,
            params: {
                api: "streamObject",
                mode: "json",
                temperature: 0.6,
                providerOptions: deepseekThinking(false),
                schema: "horoscopeInterpretationSchema (lib/astrology/schema.ts)",
                streaming: true,
            },
            system: questionSystem,
            prompt: questionPrompt,
            topicDetected: questionTopic,
            resolvedLanguage: questionLanguage,
            classification: {
                naturalNatalReference,
                birthChartSuitability: suitabilityQuestion,
                calendarRecommendationIntent: calendarIntent,
            },
            questionRange: {
                startDateIso: questionRange.startDateIso,
                endDateIso: questionRange.endDateIso,
                durationDays: questionRange.durationDays,
                source: questionRange.source,
                granularity: questionRange.granularity,
            },
            aspectEventCounts: {
                beforeFilter: countEvents(rawTransitAspects),
                afterFilter: countEvents(personalizedTransitAspects),
            },
            notes: [
                `system prompt is rebuilt verbatim from the route template (allowNatalReferences=false since storedBirthChart is null); the terminology rule shown is the FORBIDDEN variant the route selects.`,
                `Codex no-data values embedded in prompt: transitDataSource="${codexTransit.source}", codexTransitSummary=null, codexCoverage={expectedDays:${codexTransit.coverage.expectedDays}, actualDays:0, ratio:0, isComplete:false}.`,
                `calendarRecommendationIntent=${JSON.stringify(calendarIntent)} — the question DOES hit the "good day to" trigger regex, but no action rule matches ("sign my job contract" does not match /sign (?:the )?contract/ because of the words in between), so calendarRecommendation stays null and queryCalendarDates is never called.`,
                `personalized_transit_aspects block in prompt: range present with sampledDays:0, events:[] and NO exact block — yet instruction #4/#6 still demand citing exact start/end dates "from the aspect window data"; instruction #13 is the only escape hatch (fall back to questionRange boundaries).`,
                `chartData embedded in <astrology_data> is REAL swisseph output: natal chart 1995-08-23 14:30 +07 Bangkok (western_tropical, Placidus) + transit chart for 2026-07-04 12:00 +07.`,
                `simulatedCodex variant: only personalizedTransitAspects + myCalendarDay swapped for swisseph-synthesized codex data; transitDataSource/summary/coverage left at the no-codex values (in full production-with-codex they would read "codex"/non-null/complete).`,
            ],
            simulatedCodex: {
                marked: "SUBSTITUTE — swisseph-synthesized codex rows, NOT the production Supabase table",
                aspectEventCounts: {
                    beforeFilter: countEvents(rawSim),
                    afterFilter: countEvents(filteredSim),
                },
                prompt: questionPromptSim,
            },
        })
        summaries.push(
            `H1.question: topic=${questionTopic.topic} lang=${questionLanguage} events before/after=${countEvents(rawTransitAspects).range}/${countEvents(personalizedTransitAspects).range} promptLen=${questionPrompt.length} simPromptLen=${questionPromptSim.length} file=${f2}`,
        )
    }

    // =========================================================================
    // H2 / H3 — TIMING path of /api/horoscope/verdict
    // =========================================================================
    const timingCases = [
        {
            caseId: "H2",
            file: "H2.verdict.json",
            question: "When will my career finally take off?",
            locale: "en",
        },
        {
            caseId: "H3",
            file: "H3.verdict.json",
            question: "จะได้เจอเนื้อคู่เมื่อไหร่",
            locale: "th",
        },
    ]

    for (const tc of timingCases) {
        const { question, locale } = tc
        const questionRange = resolveQuestionTimeRange(question, { now: FIXED_NOW })
        // Route: resolveQuestionTimeRangeAsync would additionally call
        // resolveTimeRangeDaysWithAI (model deepseek/deepseek-v3.2) because the
        // regex resolver returned default_30d. Offline that call fails and falls
        // back to 30 days, keeping source="default_30d". We replicate that
        // (AI-failure) branch deterministically. NOTE the fidelity gap: with the
        // AI reachable, a long-term "when" question likely returns 180-365 days,
        // flipping source to "ai_inferred" which IS date-bounded — the timing
        // search would then use that AI window instead of today+365d.
        const strategy = pickReplyStrategy(question, questionRange)
        const topic = classifyQuestionTopic(question)
        const questionLanguage = resolveResponseLanguage(locale, question)
        const chartLocale = questionLanguage === "Thai" || questionLanguage === "Lao" ? "th" : "en"

        const todayUtc = new Date(
            Date.UTC(FIXED_NOW.getUTCFullYear(), FIXED_NOW.getUTCMonth(), FIXED_NOW.getUTCDate()),
        )
        const useBoundedSearch = isDateBoundedQuestionRange(questionRange)
        const searchStart = useBoundedSearch ? questionRange.startDate : todayUtc
        const searchEnd = useBoundedSearch ? questionRange.endDate : addUtcDays(searchStart, TIMING_SEARCH_DAYS)
        const searchRange: QuestionTimeRange = {
            startDate: searchStart,
            endDate: searchEnd,
            startDateIso: useBoundedSearch ? questionRange.startDateIso : toIsoDate(searchStart),
            endDateIso: useBoundedSearch ? questionRange.endDateIso : toIsoDate(searchEnd),
            durationDays: useBoundedSearch ? questionRange.durationDays : TIMING_SEARCH_DAYS,
            source: useBoundedSearch ? questionRange.source : "explicit",
            granularity: "daily",
        }

        const codexResult = await getCodexTransitWindow(searchRange)
        const chartDataResult = await buildChartData({ birth: BIRTH, system: SYSTEM }, chartLocale)

        const primaryBirthChart = chartDataResult.charts?.[0]
        const natalLongitudes = buildNatalLongitudes(primaryBirthChart?.planets ?? {})
        const fallbackExactTransitLongitudes = buildTransitLongitudesFromSwissPlanets({})
        const rawTransitAspects = buildPersonalizedTransitAspects({
            questionRange: {
                source: "explicit",
                startDateIso: searchRange.startDateIso,
                endDateIso: searchRange.endDateIso,
            },
            natalLongitudes,
            codexRows: codexResult.rows,
            fallbackExactTransitLongitudes,
        })
        const questionTopic = { topic: topic.topic, relevantPlanets: [...topic.relevantPlanets] }
        const filteredAspects =
            questionTopic.topic !== "general"
                ? filterAspectsByRelevantPlanets(rawTransitAspects, questionTopic.relevantPlanets)
                : rawTransitAspects

        const natalPlacements = buildNatalPlacementsForPrompt(primaryBirthChart)
        const routeShortCircuits =
            !natalPlacements.length ||
            ((filteredAspects.exact?.events.length ?? 0) === 0 &&
                (filteredAspects.range?.events.length ?? 0) === 0)

        const prompt = getTimingVerdictPrompt({
            question,
            currentDateTime,
            searchWindow: {
                startDateIso: searchRange.startDateIso,
                endDateIso: searchRange.endDateIso,
                durationDays: searchRange.durationDays,
            },
            personalizedTransitAspects: filteredAspects,
            natalPlacements,
            questionTopic,
            questionLanguage,
            userMainPoint: "",
        })
        const system = `You are Astra, a female oracle. Produce ONLY the daily verdict JSON for a TIMING question, including timingWindow.startDateIso and timingWindow.endDateIso. Plain language, no astrology jargon, no planet names in user-facing strings. Output language: ${questionLanguage}.`

        // ---- simulatedCodex variant ----
        const simWindowRows = simRowsBetween(simRows, searchRange.startDateIso, searchRange.endDateIso)
        const rawSim = buildPersonalizedTransitAspects({
            questionRange: {
                source: "explicit",
                startDateIso: searchRange.startDateIso,
                endDateIso: searchRange.endDateIso,
            },
            natalLongitudes,
            codexRows: simWindowRows,
            fallbackExactTransitLongitudes,
        })
        const filteredSim =
            questionTopic.topic !== "general"
                ? filterAspectsByRelevantPlanets(rawSim, questionTopic.relevantPlanets)
                : rawSim
        const promptSim = getTimingVerdictPrompt({
            question,
            currentDateTime,
            searchWindow: {
                startDateIso: searchRange.startDateIso,
                endDateIso: searchRange.endDateIso,
                durationDays: searchRange.durationDays,
            },
            personalizedTransitAspects: filteredSim,
            natalPlacements,
            questionTopic,
            questionLanguage,
            userMainPoint: "",
        })
        const rangeFilterFellBack =
            (filteredSim.range?.events.length ?? 0) === (rawSim.range?.events.length ?? 0) &&
            (rawSim.range?.events.length ?? 0) > 0 &&
            questionTopic.relevantPlanets.length < 11

        const f = writeCase(tc.file, {
            caseId: `${tc.caseId}.verdict`,
            endpoint: "/api/horoscope/verdict (strategy=timing, handleTimingVerdict)",
            model: MODEL,
            params: {
                api: "generateObject",
                temperature: 0.45,
                providerOptions: deepseekThinking(false),
                schema: "dailyVerdictSchema (lib/astrology/schema.ts)",
                streaming: false,
            },
            system,
            prompt,
            topicDetected: questionTopic,
            replyStrategy: strategy,
            resolvedLanguage: questionLanguage,
            questionRange: {
                startDateIso: questionRange.startDateIso,
                endDateIso: questionRange.endDateIso,
                durationDays: questionRange.durationDays,
                source: questionRange.source,
                granularity: questionRange.granularity,
            },
            searchWindow: {
                startDateIso: searchRange.startDateIso,
                endDateIso: searchRange.endDateIso,
                durationDays: searchRange.durationDays,
                bounded: useBoundedSearch,
            },
            natalPlacements,
            aspectEventCounts: {
                beforeFilter: countEvents(rawTransitAspects),
                afterFilter: countEvents(filteredAspects),
            },
            routeShortCircuits,
            notes: [
                `Route replication gap: resolveQuestionTimeRangeAsync makes an AI call (deepseek/deepseek-v3.2) for open-ended questions; we replicate its FAILURE fallback (30d => source stays "default_30d"). With the AI reachable this question would likely become source="ai_inferred" (180-365d), which counts as date-BOUNDED and would replace the default today+365d search window.`,
                `Search window derivation (unbounded default): todayUtc(${toIsoDate(todayUtc)}) → +${TIMING_SEARCH_DAYS}d = ${searchRange.endDateIso}; source forced to "explicit", granularity "daily".`,
                `CRITICAL no-codex finding: with Supabase absent, codex rows=[] so exact=null and range={sampledDays:0,events:[]}. handleTimingVerdict then hits its guard (natalPlacements empty OR zero exact+range events) and returns Response.json({}) — the model is NEVER called and this prompt is never sent. routeShortCircuits=${routeShortCircuits}. The prompt below is what getTimingVerdictPrompt WOULD produce at that point in the code, for inspection.`,
                `In the no-codex prompt, <personalized_transit_aspects> reads {"orbDegrees":5,"range":{...,"sampledDays":0,"events":[]}} while the rules still require timingWindow dates to "line up with the personalized aspect events listed above".`,
                `natalPlacements contain only Sun..Saturn + Rahu + Ketu: calculateSwissEphChart never computes Uranus/Neptune/Pluto, even though NATAL_VERDICT_PLANETS lists them and the topic filter references them as focus planets. Natal aspect TARGETS are likewise limited to Sun..Saturn+Rahu (Ketu is not an aspect target).`,
                `simulatedCodex variant: swisseph-synthesized rows (00:00 UT daily) — the production codex table is generated from the same Swiss Ephemeris, so these events should match production closely. With rows present the route would NOT short-circuit.`,
            ],
            simulatedCodex: {
                marked: "SUBSTITUTE — swisseph-synthesized codex rows, NOT the production Supabase table",
                aspectEventCounts: {
                    beforeFilter: countEvents(rawSim),
                    afterFilter: countEvents(filteredSim),
                },
                minFilteredEventsFallbackTriggered: rangeFilterFellBack,
                routeWouldShortCircuit:
                    !natalPlacements.length ||
                    ((filteredSim.exact?.events.length ?? 0) === 0 &&
                        (filteredSim.range?.events.length ?? 0) === 0),
                prompt: promptSim,
            },
        })
        summaries.push(
            `${tc.caseId}.verdict: topic=${questionTopic.topic} planets=[${questionTopic.relevantPlanets.join(",")}] lang=${questionLanguage} strategy=${strategy} search=${searchRange.startDateIso}→${searchRange.endDateIso} shortCircuits=${routeShortCircuits} events before/after=${countEvents(rawTransitAspects).range}/${countEvents(filteredAspects).range} promptLen=${prompt.length} simEvents before/after=${countEvents(rawSim).range}/${countEvents(filteredSim).range} simPromptLen=${promptSim.length} file=${f}`,
        )
    }

    console.log("\n=== SUMMARY ===")
    for (const s of summaries) console.log(s)
}

main().catch((err) => {
    console.error("HARNESS FAILED:", err)
    process.exit(1)
})
