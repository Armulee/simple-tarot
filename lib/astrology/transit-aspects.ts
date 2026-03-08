import type { EphemerisCodexRow } from "@/lib/astrology/ephemeris-codex"

const ORB_DEGREES = 5

const MAJOR_ASPECTS = [
    { type: "conjunction", angle: 0 },
    { type: "sextile", angle: 60 },
    { type: "square", angle: 90 },
    { type: "trine", angle: 120 },
    { type: "opposition", angle: 180 },
] as const

const PLANET_TO_CODEX_KEY = {
    Sun: "sun_long",
    Moon: "moon_long",
    Mercury: "mercury_long",
    Venus: "venus_long",
    Mars: "mars_long",
    Jupiter: "jupiter_long",
    Saturn: "saturn_long",
    Rahu: "true_node_long",
    Uranus: "uranus_long",
    Neptune: "neptune_long",
    Pluto: "pluto_long",
} as const

type MajorAspectType = (typeof MAJOR_ASPECTS)[number]["type"]
type InsightSentiment = "good" | "bad" | "neutral"
type EventTier = "main" | "minor"

const SIGN_INDEX_MAP: Record<string, number> = {
    Aries: 0,
    Taurus: 1,
    Gemini: 2,
    Cancer: 3,
    Leo: 4,
    Virgo: 5,
    Libra: 6,
    Scorpio: 7,
    Sagittarius: 8,
    Capricorn: 9,
    Aquarius: 10,
    Pisces: 11,
}

const SIGN_ALIAS_MAP: Record<string, string> = {
    เมษ: "Aries",
    พฤษภ: "Taurus",
    เมถุน: "Gemini",
    กรกฎ: "Cancer",
    สิงห์: "Leo",
    กันย์: "Virgo",
    ตุลย์: "Libra",
    พิจิก: "Scorpio",
    ธนู: "Sagittarius",
    มังกร: "Capricorn",
    กุมภ์: "Aquarius",
    มีน: "Pisces",
}

const SIGN_BY_INDEX = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
] as const

export type PersonalizedTransitAspectExact = {
    aspectKey: string
    transitPlanet: keyof typeof PLANET_TO_CODEX_KEY
    natalPlanet: keyof typeof PLANET_TO_CODEX_KEY
    aspectType: MajorAspectType
    aspectAngle: number
    separation: number
    orb: number
    dateIso: string
    keyword?: string
    sentiment?: InsightSentiment
    insight?: string
    tier: EventTier
    priorityScore: number
    zodiacSign: string
    transitPositionText: string
    natalPositionText: string
    transitAbsoluteLongitude: number
    natalAbsoluteLongitude: number
}

export type PersonalizedTransitAspectWindow = {
    aspectKey: string
    transitPlanet: keyof typeof PLANET_TO_CODEX_KEY
    natalPlanet: keyof typeof PLANET_TO_CODEX_KEY
    aspectType: MajorAspectType
    aspectAngle: number
    startDateIso: string
    peakDateIso: string
    endDateIso: string
    peakSeparation: number
    minOrb: number
    hitDays: number
    keyword?: string
    sentiment?: InsightSentiment
    insight?: string
    tier: EventTier
    priorityScore: number
    zodiacSign: string
    transitPositionText: string
    natalPositionText: string
    transitAbsoluteLongitude: number
    natalAbsoluteLongitude: number
}

export type AspectKeywordItem = {
    aspectKey: string
    keyword: string
    sentiment: InsightSentiment
    insight?: string
}

export type PersonalizedTransitAspectsResult = {
    orbDegrees: number
    aspects: Array<{ type: MajorAspectType; angle: number }>
    exact: {
        dateIso: string
        events: PersonalizedTransitAspectExact[]
    } | null
    range: {
        startDateIso: string
        endDateIso: string
        sampledDays: number
        events: PersonalizedTransitAspectWindow[]
    } | null
}

type MajorPlanetName = keyof typeof PLANET_TO_CODEX_KEY

const MAIN_EVENT_PLANETS = new Set<MajorPlanetName>([
    "Jupiter",
    "Saturn",
    "Rahu",
    "Uranus",
    "Neptune",
    "Pluto",
])

const PLANET_PRIORITY: Record<MajorPlanetName, number> = {
    Pluto: 1,
    Neptune: 2,
    Uranus: 3,
    Rahu: 4,
    Saturn: 5,
    Jupiter: 6,
    Mars: 7,
    Venus: 8,
    Mercury: 9,
    Sun: 10,
    Moon: 11,
}

type ActiveWindow = {
    event: PersonalizedTransitAspectWindow
    lastDateIso: string
}

function normalizeLongitude(value: number) {
    const normalized = value % 360
    return normalized < 0 ? normalized + 360 : normalized
}

function normalizeSignName(value: string) {
    const trimmed = value.trim()
    return SIGN_ALIAS_MAP[trimmed] ?? trimmed
}

function parseAbsoluteLongitudeFromSignDegree(sign: unknown, degree: unknown) {
    if (typeof sign !== "string" || typeof degree !== "number") return null
    if (!Number.isFinite(degree)) return null
    const normalizedSign = normalizeSignName(sign)
    const signIndex = SIGN_INDEX_MAP[normalizedSign]
    if (typeof signIndex !== "number") return null
    return normalizeLongitude(signIndex * 30 + degree)
}

function normalizeAngleDelta(from: number, to: number) {
    const raw =
        Math.abs(normalizeLongitude(to) - normalizeLongitude(from)) % 360
    return raw > 180 ? 360 - raw : raw
}

function getZodiacSignFromAbsoluteLongitude(longitude: number) {
    const normalized = normalizeLongitude(longitude)
    const signIndex = Math.floor(normalized / 30)
    return SIGN_BY_INDEX[signIndex] ?? "Aries"
}

function formatPositionTextFromAbsoluteLongitude(longitude: number) {
    const normalized = normalizeLongitude(longitude)
    const signIndex = Math.floor(normalized / 30)
    const sign = SIGN_BY_INDEX[signIndex] ?? "Aries"
    const degree = normalized - signIndex * 30
    return `${sign} · ${degree.toFixed(1)}°`
}

function getEventTier(planet: MajorPlanetName): EventTier {
    return MAIN_EVENT_PLANETS.has(planet) ? "main" : "minor"
}

function getPriorityScore(planet: MajorPlanetName, orb: number) {
    return PLANET_PRIORITY[planet] * 100 + orb
}

function toComparableDateValue(dateIso: string) {
    return Date.parse(`${dateIso}T00:00:00.000Z`)
}

function isNextUtcDay(previousDateIso: string, nextDateIso: string) {
    const dayMs = 24 * 60 * 60 * 1000
    return (
        toComparableDateValue(nextDateIso) -
            toComparableDateValue(previousDateIso) ===
        dayMs
    )
}

function resolveMajorAspect(separation: number) {
    let best: {
        type: MajorAspectType
        angle: number
        orb: number
    } | null = null

    for (const aspect of MAJOR_ASPECTS) {
        const orb = Math.abs(separation - aspect.angle)
        if (orb > ORB_DEGREES) continue
        if (!best || orb < best.orb) {
            best = { type: aspect.type, angle: aspect.angle, orb }
        }
    }

    return best
}

function buildTransitLongitudesByPlanet(row: EphemerisCodexRow) {
    const transit: Partial<Record<MajorPlanetName, number>> = {}
    for (const [planet, codexKey] of Object.entries(
        PLANET_TO_CODEX_KEY,
    ) as Array<
        [MajorPlanetName, (typeof PLANET_TO_CODEX_KEY)[MajorPlanetName]]
    >) {
        const value = row[codexKey]
        if (typeof value === "number" && Number.isFinite(value)) {
            transit[planet] = normalizeLongitude(value)
        }
    }
    return transit
}

type SwissPlanetPoint = {
    sign?: unknown
    degree?: unknown
    longitude?: unknown
}

function absoluteLongitudeFromSwissPoint(point: SwissPlanetPoint | undefined) {
    const fromSignDegree = parseAbsoluteLongitudeFromSignDegree(
        point?.sign,
        point?.degree,
    )
    if (typeof fromSignDegree === "number") return fromSignDegree
    if (
        typeof point?.longitude === "number" &&
        Number.isFinite(point.longitude)
    ) {
        return normalizeLongitude(point.longitude)
    }
    return null
}

export function buildAspectEventKey(input: {
    transitPlanet: MajorPlanetName
    natalPlanet: MajorPlanetName
    aspectType: MajorAspectType
    dateIso?: string
    startDateIso?: string
    peakDateIso?: string
}) {
    const tail =
        input.dateIso ??
        `${input.startDateIso ?? "na"}:${input.peakDateIso ?? "na"}`
    return `${input.transitPlanet}|${input.aspectType}|${input.natalPlanet}|${tail}`
}

function computeDailyExactHits(
    dateIso: string,
    natalLongitudes: Record<MajorPlanetName, number>,
    transitLongitudes: Partial<Record<MajorPlanetName, number>>,
) {
    const events: PersonalizedTransitAspectExact[] = []

    for (const [transitPlanet, transitLongitude] of Object.entries(
        transitLongitudes,
    ) as Array<[MajorPlanetName, number]>) {
        for (const [natalPlanet, natalLongitude] of Object.entries(
            natalLongitudes,
        ) as Array<[MajorPlanetName, number]>) {
            const separation = normalizeAngleDelta(
                transitLongitude,
                natalLongitude,
            )
            const aspect = resolveMajorAspect(separation)
            if (!aspect) continue
            events.push({
                aspectKey: buildAspectEventKey({
                    transitPlanet,
                    natalPlanet,
                    aspectType: aspect.type,
                    dateIso,
                }),
                transitPlanet,
                natalPlanet,
                aspectType: aspect.type,
                aspectAngle: aspect.angle,
                separation: Number(separation.toFixed(3)),
                orb: Number(aspect.orb.toFixed(3)),
                dateIso,
                tier: getEventTier(transitPlanet),
                priorityScore: Number(
                    getPriorityScore(transitPlanet, aspect.orb).toFixed(3),
                ),
                zodiacSign:
                    getZodiacSignFromAbsoluteLongitude(transitLongitude),
                transitPositionText:
                    formatPositionTextFromAbsoluteLongitude(transitLongitude),
                natalPositionText:
                    formatPositionTextFromAbsoluteLongitude(natalLongitude),
                transitAbsoluteLongitude: Number(
                    normalizeLongitude(transitLongitude).toFixed(3),
                ),
                natalAbsoluteLongitude: Number(
                    normalizeLongitude(natalLongitude).toFixed(3),
                ),
            })
        }
    }

    return events.sort(
        (a, b) =>
            a.priorityScore - b.priorityScore ||
            a.orb - b.orb ||
            a.transitPlanet.localeCompare(b.transitPlanet),
    )
}

function toWindowKey(event: PersonalizedTransitAspectExact) {
    return `${event.transitPlanet}|${event.natalPlanet}|${event.aspectType}`
}

function isDateWithinInclusive(
    targetDateIso: string,
    startDateIso: string,
    endDateIso: string
) {
    const target = toComparableDateValue(targetDateIso)
    const start = toComparableDateValue(startDateIso)
    const end = toComparableDateValue(endDateIso)
    return target >= start && target <= end
}

function doRangesOverlap(
    aStart: string,
    aEnd: string,
    bStart: string,
    bEnd: string,
) {
    return (
        toComparableDateValue(aStart) <= toComparableDateValue(bEnd) &&
        toComparableDateValue(aEnd) >= toComparableDateValue(bStart)
    )
}

function finalizeActiveWindows(activeByKey: Map<string, ActiveWindow>) {
    const finalized: PersonalizedTransitAspectWindow[] = []
    for (const active of activeByKey.values()) {
        finalized.push(active.event)
    }
    activeByKey.clear()
    return finalized
}

export function getDefaultTransitAspectPlanets() {
    return Object.keys(PLANET_TO_CODEX_KEY) as MajorPlanetName[]
}

export function buildNatalLongitudes(
    planets: Record<string, SwissPlanetPoint | undefined>,
) {
    const natal: Partial<Record<MajorPlanetName, number>> = {}
    for (const [planet, codexKey] of Object.entries(
        PLANET_TO_CODEX_KEY,
    ) as Array<
        [MajorPlanetName, (typeof PLANET_TO_CODEX_KEY)[MajorPlanetName]]
    >) {
        const point = planets[planet]
        const value = absoluteLongitudeFromSwissPoint(point)
        if (typeof value === "number") {
            natal[planet] = value
            continue
        }
        const fallback = absoluteLongitudeFromSwissPoint(
            planets[codexKey.replace("_long", "")],
        )
        if (typeof fallback === "number") {
            natal[planet] = fallback
        }
    }
    return natal as Partial<Record<MajorPlanetName, number>>
}

export function computeExactTransitAspects({
    dateIso,
    natalLongitudes,
    codexRow,
    fallbackTransitLongitudes,
}: {
    dateIso: string
    natalLongitudes: Partial<Record<MajorPlanetName, number>>
    codexRow: EphemerisCodexRow | null
    fallbackTransitLongitudes?: Partial<Record<MajorPlanetName, number>>
}): PersonalizedTransitAspectsResult["exact"] {
    const completeNatal = Object.fromEntries(
        Object.entries(natalLongitudes).filter(
            (entry): entry is [MajorPlanetName, number] =>
                typeof entry[1] === "number" && Number.isFinite(entry[1]),
        ),
    ) as Record<MajorPlanetName, number>
    if (Object.keys(completeNatal).length === 0) return null

    const completeFallbackTransit = Object.fromEntries(
        Object.entries(fallbackTransitLongitudes ?? {}).filter(
            (entry): entry is [MajorPlanetName, number] =>
                typeof entry[1] === "number" && Number.isFinite(entry[1]),
        ),
    ) as Record<MajorPlanetName, number>
    const transitLongitudes = codexRow
        ? buildTransitLongitudesByPlanet(codexRow)
        : completeFallbackTransit
    if (Object.keys(transitLongitudes).length === 0) return null

    return {
        dateIso,
        events: computeDailyExactHits(
            dateIso,
            completeNatal,
            transitLongitudes,
        ),
    }
}

export function computeRangeTransitAspects({
    startDateIso,
    endDateIso,
    natalLongitudes,
    codexRows,
}: {
    startDateIso: string
    endDateIso: string
    natalLongitudes: Partial<Record<MajorPlanetName, number>>
    codexRows: EphemerisCodexRow[]
}): PersonalizedTransitAspectsResult["range"] {
    const completeNatal = Object.fromEntries(
        Object.entries(natalLongitudes).filter(
            (entry): entry is [MajorPlanetName, number] =>
                typeof entry[1] === "number" && Number.isFinite(entry[1]),
        ),
    ) as Record<MajorPlanetName, number>
    if (Object.keys(completeNatal).length === 0) return null
    if (codexRows.length === 0) {
        return {
            startDateIso,
            endDateIso,
            sampledDays: 0,
            events: [],
        }
    }

    const finalized: PersonalizedTransitAspectWindow[] = []
    const activeByKey = new Map<string, ActiveWindow>()

    for (const row of codexRows) {
        const transitLongitudes = buildTransitLongitudesByPlanet(row)
        const todayHits = computeDailyExactHits(
            row.date,
            completeNatal,
            transitLongitudes,
        )
        const seenKeys = new Set<string>()

        for (const hit of todayHits) {
            const key = toWindowKey(hit)
            seenKeys.add(key)
            const active = activeByKey.get(key)

            if (!active) {
                activeByKey.set(key, {
                    event: {
                        aspectKey: buildAspectEventKey({
                            transitPlanet: hit.transitPlanet,
                            natalPlanet: hit.natalPlanet,
                            aspectType: hit.aspectType,
                            startDateIso: hit.dateIso,
                            peakDateIso: hit.dateIso,
                        }),
                        transitPlanet: hit.transitPlanet,
                        natalPlanet: hit.natalPlanet,
                        aspectType: hit.aspectType,
                        aspectAngle: hit.aspectAngle,
                        startDateIso: hit.dateIso,
                        peakDateIso: hit.dateIso,
                        endDateIso: hit.dateIso,
                        peakSeparation: hit.separation,
                        minOrb: hit.orb,
                        hitDays: 1,
                        tier: hit.tier,
                        priorityScore: hit.priorityScore,
                        zodiacSign: hit.zodiacSign,
                        transitPositionText: hit.transitPositionText,
                        natalPositionText: hit.natalPositionText,
                        transitAbsoluteLongitude: hit.transitAbsoluteLongitude,
                        natalAbsoluteLongitude: hit.natalAbsoluteLongitude,
                    },
                    lastDateIso: hit.dateIso,
                })
                continue
            }

            if (!isNextUtcDay(active.lastDateIso, hit.dateIso)) {
                finalized.push(active.event)
                activeByKey.set(key, {
                    event: {
                        aspectKey: buildAspectEventKey({
                            transitPlanet: hit.transitPlanet,
                            natalPlanet: hit.natalPlanet,
                            aspectType: hit.aspectType,
                            startDateIso: hit.dateIso,
                            peakDateIso: hit.dateIso,
                        }),
                        transitPlanet: hit.transitPlanet,
                        natalPlanet: hit.natalPlanet,
                        aspectType: hit.aspectType,
                        aspectAngle: hit.aspectAngle,
                        startDateIso: hit.dateIso,
                        peakDateIso: hit.dateIso,
                        endDateIso: hit.dateIso,
                        peakSeparation: hit.separation,
                        minOrb: hit.orb,
                        hitDays: 1,
                        tier: hit.tier,
                        priorityScore: hit.priorityScore,
                        zodiacSign: hit.zodiacSign,
                        transitPositionText: hit.transitPositionText,
                        natalPositionText: hit.natalPositionText,
                        transitAbsoluteLongitude: hit.transitAbsoluteLongitude,
                        natalAbsoluteLongitude: hit.natalAbsoluteLongitude,
                    },
                    lastDateIso: hit.dateIso,
                })
                continue
            }

            active.event.endDateIso = hit.dateIso
            active.event.hitDays += 1
            if (hit.orb < active.event.minOrb) {
                active.event.minOrb = hit.orb
                active.event.peakDateIso = hit.dateIso
                active.event.peakSeparation = hit.separation
                active.event.priorityScore = Number(
                    getPriorityScore(
                        active.event.transitPlanet,
                        hit.orb,
                    ).toFixed(3),
                )
                active.event.zodiacSign = hit.zodiacSign
                active.event.transitPositionText = hit.transitPositionText
                active.event.natalPositionText = hit.natalPositionText
                active.event.transitAbsoluteLongitude =
                    hit.transitAbsoluteLongitude
                active.event.natalAbsoluteLongitude = hit.natalAbsoluteLongitude
                active.event.aspectKey = buildAspectEventKey({
                    transitPlanet: active.event.transitPlanet,
                    natalPlanet: active.event.natalPlanet,
                    aspectType: active.event.aspectType,
                    startDateIso: active.event.startDateIso,
                    peakDateIso: hit.dateIso,
                })
            }
            active.lastDateIso = hit.dateIso
        }

        for (const [key, active] of activeByKey.entries()) {
            if (seenKeys.has(key)) continue
            finalized.push(active.event)
            activeByKey.delete(key)
        }
    }

    finalized.push(...finalizeActiveWindows(activeByKey))
    finalized.sort(
        (a, b) =>
            a.priorityScore - b.priorityScore ||
            a.minOrb - b.minOrb ||
            b.hitDays - a.hitDays ||
            a.startDateIso.localeCompare(b.startDateIso),
    )

    return {
        startDateIso,
        endDateIso,
        sampledDays: codexRows.length,
        events: finalized,
    }
}

export function buildPersonalizedTransitAspects({
    questionRange,
    natalLongitudes,
    codexRows,
    fallbackExactTransitLongitudes,
}: {
    questionRange: {
        source: "explicit" | "relative" | "default_30d" | "ai_inferred"
        startDateIso: string
        endDateIso: string
    }
    natalLongitudes: Partial<Record<MajorPlanetName, number>>
    codexRows: EphemerisCodexRow[]
    fallbackExactTransitLongitudes?: Partial<Record<MajorPlanetName, number>>
}): PersonalizedTransitAspectsResult {
    const exactRow =
        codexRows.find((row) => row.date === questionRange.startDateIso) ?? null
    const explicitExact =
        questionRange.source === "explicit"
            ? computeExactTransitAspects({
                  dateIso: questionRange.startDateIso,
                  natalLongitudes,
                  codexRow: exactRow,
                  fallbackTransitLongitudes: fallbackExactTransitLongitudes,
              })
            : null

    const computedRange = computeRangeTransitAspects({
        startDateIso:
            codexRows[0]?.date ??
            questionRange.startDateIso,
        endDateIso:
            codexRows[codexRows.length - 1]?.date ??
            questionRange.endDateIso,
        natalLongitudes,
        codexRows,
    })

    const range = computedRange
        ? {
              ...computedRange,
              events: computedRange.events.filter((event) =>
                  questionRange.source === "explicit"
                      ? isDateWithinInclusive(
                            questionRange.startDateIso,
                            event.startDateIso,
                            event.endDateIso,
                        )
                      : doRangesOverlap(
                            questionRange.startDateIso,
                            questionRange.endDateIso,
                            event.startDateIso,
                            event.endDateIso,
                        ),
              ),
          }
        : null

    const exact =
        questionRange.source === "explicit" &&
        (!range || range.events.length === 0)
            ? explicitExact
            : null

    return {
        orbDegrees: ORB_DEGREES,
        aspects: MAJOR_ASPECTS.map((aspect) => ({
            type: aspect.type,
            angle: aspect.angle,
        })),
        exact,
        range,
    }
}

export function buildTransitLongitudesFromSwissPlanets(
    planets: Record<string, SwissPlanetPoint | undefined>,
) {
    const transit: Partial<Record<MajorPlanetName, number>> = {}
    for (const planet of getDefaultTransitAspectPlanets()) {
        const value = absoluteLongitudeFromSwissPoint(
            planets[planet] ??
                planets[planet === "Rahu" ? "true_node" : planet],
        )
        if (typeof value === "number") {
            transit[planet] = value
        }
    }
    return transit
}

export function mergeAspectKeywordsIntoAspects(
    aspects: PersonalizedTransitAspectsResult,
    keywords: AspectKeywordItem[],
): PersonalizedTransitAspectsResult {
    if (!keywords.length) return aspects
    const map = new Map<string, AspectKeywordItem>()
    for (const item of keywords) {
        const keyword = item.keyword?.trim()
        if (!item.aspectKey || !keyword) continue
        map.set(item.aspectKey, {
            aspectKey: item.aspectKey,
            keyword,
            sentiment: item.sentiment,
            insight: item.insight?.trim() || undefined,
        })
    }
    if (!map.size) return aspects

    const exactEvents =
        aspects.exact?.events.map((event) => {
            const matched = map.get(event.aspectKey)
            if (!matched) return event
            return {
                ...event,
                keyword: matched.keyword,
                sentiment: matched.sentiment,
                insight: matched.insight,
            }
        }) ?? null

    const rangeEvents =
        aspects.range?.events.map((event) => {
            const matched = map.get(event.aspectKey)
            if (!matched) return event
            return {
                ...event,
                keyword: matched.keyword,
                sentiment: matched.sentiment,
                insight: matched.insight,
            }
        }) ?? null

    return {
        ...aspects,
        exact: aspects.exact
            ? {
                  ...aspects.exact,
                  events: exactEvents ?? aspects.exact.events,
              }
            : null,
        range: aspects.range
            ? {
                  ...aspects.range,
                  events: rangeEvents ?? aspects.range.events,
              }
            : null,
    }
}
