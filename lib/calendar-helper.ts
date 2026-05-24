/**
 * Shared calendar types + deterministic helpers used by the calendar UI.
 *
 * Per-day `DayData` is no longer generated client-side — it's computed on the
 * server in `/api/calendar/month` from real ephemeris codex rows + the user's
 * natal chart (see lib/calendar/day-from-aspects.ts). The types live here so
 * both the client and server share the same shape.
 */

export type DayQuality = "excellent" | "good" | "neutral" | "caution" | "avoid"

export type Vitality = {
    career: number
    love: number
    finance: number
    health: number
    social: number
    spiritual: number
}

export type EventSignals = {
    job_change: number
    resignation: number
    marriage: number
    contract_sign: number
    travel_long: number
    major_purchase: number
}

export type CalendarQueryIntent = keyof EventSignals

export type CalendarQueryConfidence = "high" | "medium" | "low"

export type Highlight = {
    text: string
    type: "positive" | "neutral"
    category: string
}

export type Warning = {
    text: string
    severity: "low" | "medium" | "high"
}

export type Lucky = {
    colors: string[]
    numbers: number[]
    direction: string
    time: string
}

export type DayData = {
    date: Date
    overall: number
    quality: DayQuality
    vitality: Vitality
    eventSignals: EventSignals
    highlights: Highlight[]
    warnings: Warning[]
    lucky: Lucky
}

export type DayDataWire = Omit<DayData, "date"> & { isoDate: string }

export type CalendarQueryCandidate = {
    isoDate: string
    score: number
    overall: number
    quality: DayQuality
    career: number
    warningCount: number
    highlightCount: number
    highlights: Highlight[]
    warnings: Warning[]
}

export type CalendarQueryResult = {
    intent: CalendarQueryIntent
    searchStartIso: string
    searchEndIso: string
    windowStartIso: string
    windowEndIso: string
    usedDefaultRange: boolean
    confidence: CalendarQueryConfidence
    candidates: CalendarQueryCandidate[]
    topCandidate: CalendarQueryCandidate | null
}

export type MonthOverview = {
    luckyDays: number
    cautionDays: number
    peak: { date: Date; overall: number } | null
}

export type StarFieldDot = {
    top: string
    left: string
    size: number
    opacity: number
}

// ---------------------------------------------------------------------------
// Seeded RNG (used for the decorative starfield + lucky-detail jitter)
// ---------------------------------------------------------------------------

export function mulberry32(seed: number): () => number {
    let a = seed >>> 0
    return function () {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

export function hashDateKey(d: Date): number {
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    let h = 2166136261 >>> 0
    const s = `${y}-${m}-${day}`
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i)
        h = Math.imul(h, 16777619) >>> 0
    }
    return h >>> 0
}

// ---------------------------------------------------------------------------
// Calendar layout helpers (pure, hydration-safe)
// ---------------------------------------------------------------------------

/**
 * 6x7 matrix of Date | null for the given (year, month). Sunday-start. Out-of-
 * month leading/trailing cells are null.
 */
export function getMonthMatrix(year: number, month: number): (Date | null)[][] {
    const first = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startDow = first.getDay()
    const cells: (Date | null)[] = []
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let day = 1; day <= daysInMonth; day++) {
        cells.push(new Date(year, month, day))
    }
    while (cells.length < 42) cells.push(null)
    const rows: (Date | null)[][] = []
    for (let r = 0; r < 6; r++) rows.push(cells.slice(r * 7, r * 7 + 7))
    return rows
}

export function toLocalIsoDate(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
}

/** Lift a wire-format day record back to a `DayData` with a Date instance. */
export function hydrateDayData(wire: DayDataWire): DayData {
    return {
        date: new Date(`${wire.isoDate}T00:00:00`),
        overall: wire.overall,
        quality: wire.quality,
        vitality: wire.vitality,
        eventSignals: wire.eventSignals,
        highlights: wire.highlights,
        warnings: wire.warnings,
        lucky: wire.lucky,
    }
}

/**
 * Compute the month overview ("lucky days", "caution days", "peak") from a
 * map of iso-date → DayData. Cells without codex data are ignored.
 */
export function getMonthOverview(
    matrix: (Date | null)[][],
    days: Record<string, DayData | null>,
): MonthOverview {
    let luckyDays = 0
    let cautionDays = 0
    let peak: { date: Date; overall: number } | null = null
    for (const row of matrix) {
        for (const cell of row) {
            if (!cell) continue
            const iso = toLocalIsoDate(cell)
            const d = days[iso]
            if (!d) continue
            if (d.quality === "excellent" || d.quality === "good") luckyDays++
            if (d.quality === "caution" || d.quality === "avoid") cautionDays++
            if (!peak || d.overall > peak.overall) {
                peak = { date: cell, overall: d.overall }
            }
        }
    }
    return { luckyDays, cautionDays, peak }
}

// ---------------------------------------------------------------------------
// Decorative starfield (deterministic so SSR === CSR)
// ---------------------------------------------------------------------------

export function getStarField(
    seed: number = 1,
    count: number = 36,
): StarFieldDot[] {
    const rng = mulberry32(seed)
    const dots: StarFieldDot[] = []
    const round = (n: number) => Math.round(n * 10) / 10
    for (let i = 0; i < count; i++) {
        dots.push({
            top: `${round(rng() * 100)}%`,
            left: `${round(rng() * 100)}%`,
            size: Math.floor(rng() * 3) + 1,
            opacity: round(0.2 + rng() * 0.5),
        })
    }
    return dots
}
