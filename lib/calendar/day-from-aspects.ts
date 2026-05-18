/**
 * Heuristic mapping: codex row + transit-to-natal aspect events ⇒ DayData.
 *
 * Everything in this module is pure and runs on the server (called from the
 * /api/calendar/month route). The output schema matches the existing client
 * UI in lib/mockCalendar.ts so the swap is invisible to the calendar grid /
 * detail panel.
 */

import type {
    DayData,
    DayQuality,
    EventSignals,
    Highlight,
    Lucky,
    Vitality,
    Warning,
} from "@/lib/calendar-helper"
import { hashDateKey, mulberry32 } from "@/lib/calendar-helper"
import type { EphemerisCodexRow } from "@/lib/astrology/ephemeris-codex"
import type { PersonalizedTransitAspectExact } from "@/lib/astrology/transit-aspects"

type AspectEvent = PersonalizedTransitAspectExact

type Planet =
    | "Sun"
    | "Moon"
    | "Mercury"
    | "Venus"
    | "Mars"
    | "Jupiter"
    | "Saturn"
    | "Rahu"
    | "Uranus"
    | "Neptune"
    | "Pluto"

const ASPECT_SIGN: Record<AspectEvent["aspectType"], number> = {
    trine: +1,
    sextile: +0.8,
    conjunction: +0.25,
    square: -1,
    opposition: -0.9,
}

const PLANET_TIER: Record<Planet, number> = {
    Pluto: 0.5,
    Neptune: 0.5,
    Uranus: 0.5,
    Saturn: 1.5,
    Rahu: 1.4,
    Jupiter: 1.4,
    Mars: 1.1,
    Sun: 1.0,
    Mercury: 0.9,
    Venus: 0.9,
    Moon: 0.8,
}

const MALEFICS: ReadonlySet<Planet> = new Set([
    "Saturn",
    "Mars",
    "Pluto",
    "Rahu",
])

const PLANET_CATEGORIES: Record<Planet, readonly (keyof Vitality)[]> = {
    Sun: ["career", "health"],
    Moon: ["love", "spiritual", "health"],
    Mercury: ["career", "social"],
    Venus: ["love", "finance", "social"],
    Mars: ["career", "health"],
    Jupiter: ["career", "finance", "spiritual"],
    Saturn: ["career", "health"],
    Rahu: ["career", "spiritual"],
    Uranus: ["career", "social"],
    Neptune: ["spiritual", "love"],
    Pluto: ["career", "health"],
}

const PLANET_TH: Record<Planet, string> = {
    Sun: "อาทิตย์",
    Moon: "จันทร์",
    Mercury: "พุธ",
    Venus: "ศุกร์",
    Mars: "อังคาร",
    Jupiter: "พฤหัส",
    Saturn: "เสาร์",
    Rahu: "ราหู",
    Uranus: "ยูเรนัส",
    Neptune: "เนปจูน",
    Pluto: "พลูโต",
}

const ASPECT_TH: Record<AspectEvent["aspectType"], string> = {
    trine: "ทำมุมเอื้อ",
    sextile: "ส่งแรงดี",
    conjunction: "ทับ",
    square: "ทำมุมแข็ง",
    opposition: "ตรงข้าม",
}

const ASPECT_LABEL: Record<AspectEvent["aspectType"], string> = {
    trine: "การงาน",
    sextile: "โอกาส",
    conjunction: "พลังรวม",
    square: "อุปสรรค",
    opposition: "ความตึงเครียด",
}

const ZODIAC_TH: Record<string, string> = {
    Aries: "เมษ",
    Taurus: "พฤษภ",
    Gemini: "เมถุน",
    Cancer: "กรกฎ",
    Leo: "สิงห์",
    Virgo: "กันย์",
    Libra: "ตุลย์",
    Scorpio: "พิจิก",
    Sagittarius: "ธนู",
    Capricorn: "มังกร",
    Aquarius: "กุมภ์",
    Pisces: "มีน",
}

type CalendarTextLocale = "th" | "en"

const PLANET_EN: Record<Planet, string> = {
    Sun: "Sun",
    Moon: "Moon",
    Mercury: "Mercury",
    Venus: "Venus",
    Mars: "Mars",
    Jupiter: "Jupiter",
    Saturn: "Saturn",
    Rahu: "Rahu",
    Uranus: "Uranus",
    Neptune: "Neptune",
    Pluto: "Pluto",
}

const ASPECT_EN: Record<AspectEvent["aspectType"], string> = {
    trine: "trines",
    sextile: "sextiles",
    conjunction: "conjuncts",
    square: "squares",
    opposition: "opposes",
}

const ASPECT_LABEL_EN: Record<AspectEvent["aspectType"], string> = {
    trine: "Career",
    sextile: "Opportunity",
    conjunction: "Momentum",
    square: "Obstacle",
    opposition: "Tension",
}

function resolveCalendarTextLocale(locale?: string): CalendarTextLocale {
    return locale?.toLowerCase().startsWith("th") ? "th" : "en"
}

function getPlanetLabel(planet: Planet, locale: CalendarTextLocale) {
    return locale === "th" ? PLANET_TH[planet] ?? planet : PLANET_EN[planet] ?? planet
}

function getAspectLabel(
    aspectType: AspectEvent["aspectType"],
    locale: CalendarTextLocale,
) {
    return locale === "th" ? ASPECT_TH[aspectType] : ASPECT_EN[aspectType]
}

function getHighlightCategory(
    aspectType: AspectEvent["aspectType"],
    locale: CalendarTextLocale,
) {
    return locale === "th"
        ? ASPECT_LABEL[aspectType]
        : ASPECT_LABEL_EN[aspectType]
}

function buildHighlightText(
    locale: CalendarTextLocale,
    transitPlanet: Planet,
    aspectType: AspectEvent["aspectType"],
    natalPlanet: Planet,
    category: string,
) {
    const tName = getPlanetLabel(transitPlanet, locale)
    const nName = getPlanetLabel(natalPlanet, locale)
    const aspect = getAspectLabel(aspectType, locale)

    if (locale === "th") {
        return `${tName} ${aspect} ${nName} เดิม — ${category}ส่งแรงดี`
    }

    return `${tName} ${aspect} natal ${nName} - supportive ${category.toLowerCase()} energy`
}

function buildWarningText(
    locale: CalendarTextLocale,
    transitPlanet: Planet,
    aspectType: AspectEvent["aspectType"],
    natalPlanet: Planet,
    focus: "work_health" | "communication",
) {
    const tName = getPlanetLabel(transitPlanet, locale)
    const nName = getPlanetLabel(natalPlanet, locale)
    const aspect = getAspectLabel(aspectType, locale)

    if (locale === "th") {
        return `${tName} ${aspect} ${nName} เดิม — ระวังเรื่อง${
            focus === "work_health" ? "งานและสุขภาพ" : "การสื่อสาร"
        }`
    }

    return `${tName} ${aspect} natal ${nName} - watch ${
        focus === "work_health" ? "work and health" : "communication"
    }`
}

const MOON_LUCKY_COLOR_BY_ELEMENT: Record<string, string[]> = {
    fire: ["ทอง", "แดงเลือดหมู", "ส้มอำพัน"],
    earth: ["น้ำตาลทอง", "เขียวมรกต", "เหลืองมัสตาร์ด"],
    air: ["ฟ้า", "ขาวมุก", "เงิน"],
    water: ["ม่วง", "ฟ้าคราม", "เขียวน้ำทะเล"],
}

const SIGN_ELEMENT: Record<string, "fire" | "earth" | "air" | "water"> = {
    Aries: "fire",
    Leo: "fire",
    Sagittarius: "fire",
    Taurus: "earth",
    Virgo: "earth",
    Capricorn: "earth",
    Gemini: "air",
    Libra: "air",
    Aquarius: "air",
    Cancer: "water",
    Scorpio: "water",
    Pisces: "water",
}

const DIRECTIONS_BY_ELEMENT: Record<string, string> = {
    fire: "ทิศใต้",
    earth: "ทิศตะวันออกเฉียงเหนือ",
    air: "ทิศตะวันออก",
    water: "ทิศเหนือ",
}

const TIMES = [
    "06:00–08:00",
    "09:00–11:00",
    "13:00–15:00",
    "17:00–19:00",
    "20:00–22:00",
] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
}

function round1(value: number) {
    return Math.round(value * 10) / 10
}

function deriveQuality(overall: number): DayQuality {
    if (overall >= 8.0) return "excellent"
    if (overall >= 6.5) return "good"
    if (overall >= 4.5) return "neutral"
    if (overall >= 2.5) return "caution"
    return "avoid"
}

function signedAspectWeight(event: AspectEvent): number {
    const sign = ASPECT_SIGN[event.aspectType]
    // Tighter orb = stronger weight. With ORB=5, orb=0 → 1.0, orb=5 → 0.0.
    const tightness = clamp(1 - event.orb / 5, 0, 1)
    const tier =
        (PLANET_TIER[event.transitPlanet as Planet] ?? 1) *
        (PLANET_TIER[event.natalPlanet as Planet] ?? 1)
    return sign * tightness * tier
}

function longitudeToSign(lon: number) {
    const normalized = ((lon % 360) + 360) % 360
    const idx = Math.floor(normalized / 30)
    const signs = [
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
    return signs[idx] ?? "Aries"
}

function isMalefic(planet: string): boolean {
    return MALEFICS.has(planet as Planet)
}

function severityFromOrb(orb: number): "low" | "medium" | "high" {
    if (orb < 1.5) return "high"
    if (orb < 3) return "medium"
    return "low"
}

// ---------------------------------------------------------------------------
// Per-bucket scoring
// ---------------------------------------------------------------------------

function buildVitality(events: AspectEvent[]): Vitality {
    const buckets: Vitality = {
        career: 0,
        love: 0,
        finance: 0,
        health: 0,
        social: 0,
        spiritual: 0,
    }

    for (const ev of events) {
        const weight = signedAspectWeight(ev)
        const tCats = PLANET_CATEGORIES[ev.transitPlanet as Planet] ?? []
        const nCats = PLANET_CATEGORIES[ev.natalPlanet as Planet] ?? []
        const merged = new Set<keyof Vitality>([...tCats, ...nCats])
        for (const cat of merged) {
            buckets[cat] += weight
        }
    }

    // Map signed sums (~ -6 .. +6 in practice) to 0..10 with 5 as neutral.
    const SCALE = 1.4
    const result: Vitality = {
        career: clampScore(buckets.career, SCALE),
        love: clampScore(buckets.love, SCALE),
        finance: clampScore(buckets.finance, SCALE),
        health: clampScore(buckets.health, SCALE),
        social: clampScore(buckets.social, SCALE),
        spiritual: clampScore(buckets.spiritual, SCALE),
    }
    return result
}

function clampScore(rawSum: number, scale: number) {
    return round1(clamp(5 + rawSum * scale, 0, 10))
}

function buildEventSignals(events: AspectEvent[]): EventSignals {
    const signals: EventSignals = {
        job_change: 0,
        resignation: 0,
        marriage: 0,
        contract_sign: 0,
        travel_long: 0,
        major_purchase: 0,
    }

    for (const ev of events) {
        const w = signedAspectWeight(ev)
        const t = ev.transitPlanet as Planet
        const n = ev.natalPlanet as Planet
        const isHarmonious = ASPECT_SIGN[ev.aspectType] > 0

        // job_change: Saturn/Uranus aspects to Sun/Saturn/MC-proxy(Sun)
        if (
            (t === "Saturn" || t === "Uranus") &&
            (n === "Sun" || n === "Saturn")
        ) {
            signals.job_change += Math.abs(w) * 0.9
        }
        // resignation: Pluto/Saturn hard aspects to Sun/Saturn
        if (
            (t === "Pluto" || t === "Saturn") &&
            (n === "Sun" || n === "Saturn") &&
            !isHarmonious
        ) {
            signals.resignation += Math.abs(w)
        }
        // marriage: Venus/Jupiter harmonious to Moon/Venus/Mars
        if (
            (t === "Venus" || t === "Jupiter") &&
            (n === "Moon" || n === "Venus" || n === "Mars") &&
            isHarmonious
        ) {
            signals.marriage += w
        }
        // contract_sign: Mercury or Jupiter harmonious to Mercury/Sun
        if (
            (t === "Mercury" || t === "Jupiter") &&
            (n === "Mercury" || n === "Sun") &&
            isHarmonious
        ) {
            signals.contract_sign += w
        }
        // travel_long: Jupiter to Sun/Moon (harmonious), or Sun/Moon to Jupiter
        if (
            ((t === "Jupiter" && (n === "Sun" || n === "Moon")) ||
                ((t === "Sun" || t === "Moon") && n === "Jupiter")) &&
            isHarmonious
        ) {
            signals.travel_long += w
        }
        // major_purchase: Venus/Jupiter to Venus/Jupiter (harmonious)
        if (
            (t === "Venus" || t === "Jupiter") &&
            (n === "Venus" || n === "Jupiter") &&
            isHarmonious
        ) {
            signals.major_purchase += w
        }
    }

    // Convert each signal sum to 0..10 with 5 as neutral baseline. Harmonious
    // signals only push up; explicit hard-aspect ones (resignation/job_change)
    // are abs-summed so they also push up — that matches the semantic ("more
    // signal = more likely to consider this event").
    return {
        job_change: round1(clamp(5 + signals.job_change * 1.6, 0, 10)),
        resignation: round1(clamp(5 + signals.resignation * 1.6, 0, 10)),
        marriage: round1(clamp(5 + signals.marriage * 1.8, 0, 10)),
        contract_sign: round1(clamp(5 + signals.contract_sign * 1.8, 0, 10)),
        travel_long: round1(clamp(5 + signals.travel_long * 1.8, 0, 10)),
        major_purchase: round1(clamp(5 + signals.major_purchase * 1.8, 0, 10)),
    }
}

// ---------------------------------------------------------------------------
// Text generation
// ---------------------------------------------------------------------------

function topEventsBySign(
    events: AspectEvent[],
    sign: "positive" | "negative",
    limit: number,
) {
    const filtered = events.filter((e) =>
        sign === "positive"
            ? ASPECT_SIGN[e.aspectType] > 0
            : ASPECT_SIGN[e.aspectType] < 0,
    )
    return filtered
        .map((e) => ({ e, weight: Math.abs(signedAspectWeight(e)) }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, limit)
        .map((x) => x.e)
}

function buildHighlights(
    events: AspectEvent[],
    locale: CalendarTextLocale,
): Highlight[] {
    const top = topEventsBySign(events, "positive", 3)
    return top.map((e) => {
        const category = getHighlightCategory(e.aspectType, locale)
        return {
            text: buildHighlightText(
                locale,
                e.transitPlanet as Planet,
                e.aspectType,
                e.natalPlanet as Planet,
                category,
            ),
            type: "positive",
            category,
        }
    })
}

function buildWarnings(
    events: AspectEvent[],
    retrogradePlanets: string[],
    locale: CalendarTextLocale,
): Warning[] {
    const top = topEventsBySign(events, "negative", 3)
    const warnings: Warning[] = top.map((e) => {
        return {
            text: buildWarningText(
                locale,
                e.transitPlanet as Planet,
                e.aspectType,
                e.natalPlanet as Planet,
                isMalefic(e.transitPlanet)
                    ? "work_health"
                    : "communication",
            ),
            severity: severityFromOrb(e.orb),
        }
    })
    if (retrogradePlanets.includes("mercury")) {
        warnings.push({
            text:
                locale === "th"
                    ? "พุธพักร์ — ทบทวนงานเอกสาร อย่ารีบเซ็น"
                    : "Mercury retrograde - review documents and avoid rushing signatures",
            severity: "low",
        })
    }
    if (retrogradePlanets.includes("venus")) {
        warnings.push({
            text:
                locale === "th"
                    ? "ศุกร์พักร์ — ทบทวนความสัมพันธ์ อย่าตัดสินใจเร็ว"
                    : "Venus retrograde - review relationships and avoid quick decisions",
            severity: "low",
        })
    }
    return warnings
}

function buildLucky(date: Date, codexRow: EphemerisCodexRow): Lucky {
    const sign = longitudeToSign(codexRow.moon_long)
    const element = SIGN_ELEMENT[sign] ?? "air"
    const colorPool = MOON_LUCKY_COLOR_BY_ELEMENT[element] ?? ["ขาวมุก", "ฟ้า"]
    const rng = mulberry32(hashDateKey(date))
    const colorA = colorPool[Math.floor(rng() * colorPool.length)]
    const colorB = colorPool[Math.floor(rng() * colorPool.length)]
    const colors = colorA === colorB ? [colorA] : [colorA, colorB]
    const numbers = [Math.floor(rng() * 9) + 1, Math.floor(rng() * 9) + 1]
    const direction = DIRECTIONS_BY_ELEMENT[element] ?? "ทิศตะวันออก"
    const time = TIMES[Math.floor(rng() * TIMES.length)]
    return { colors, numbers, direction, time }
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export function buildDayDataFromCodex(
    date: Date,
    codexRow: EphemerisCodexRow,
    events: AspectEvent[],
    locale?: string,
): DayData {
    const vitality = buildVitality(events)
    const eventSignals = buildEventSignals(events)

    const totalWeight = events.reduce(
        (acc, e) => acc + signedAspectWeight(e),
        0,
    )
    const retrogradePlanets = Object.entries(codexRow.is_retrograde ?? {})
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k)
    // Each retrograde minor planet (mercury/venus) costs ~0.3 vitality.
    const retroPenalty = retrogradePlanets.length * 0.25

    const overall = round1(clamp(5 + totalWeight * 0.9 - retroPenalty, 0, 10))
    const quality = deriveQuality(overall)
    const textLocale = resolveCalendarTextLocale(locale)
    const highlights = buildHighlights(events, textLocale)
    const warnings = buildWarnings(events, retrogradePlanets, textLocale)
    const lucky = buildLucky(date, codexRow)

    return {
        date,
        overall,
        quality,
        vitality,
        eventSignals,
        highlights,
        warnings,
        lucky,
    }
}

/** Helper used by the API to expose moon-sign info for downstream UI. */
export function moonSignThai(codexRow: EphemerisCodexRow): string {
    return ZODIAC_TH[longitudeToSign(codexRow.moon_long)] ?? ""
}
