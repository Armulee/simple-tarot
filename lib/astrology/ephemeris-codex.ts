import { supabaseAdmin } from "@/lib/supabase"
import type { QuestionTimeRange } from "@/lib/astrology/question-time-range"
import {
    computeCodexCoverage,
    type CodexCoverage,
} from "@/lib/astrology/codex-coverage"

const MAJOR_PLANET_KEYS = [
    "sun_long",
    "moon_long",
    "mercury_long",
    "venus_long",
    "mars_long",
    "jupiter_long",
    "saturn_long",
    "uranus_long",
    "neptune_long",
    "pluto_long",
] as const

type MajorPlanetKey = (typeof MAJOR_PLANET_KEYS)[number]

export type EphemerisCodexRow = {
    date: string
    ayanamsa_lahiri: number | null
    is_retrograde: Record<string, boolean>
    sun_long: number
    moon_long: number
    mercury_long: number
    venus_long: number
    mars_long: number
    jupiter_long: number
    saturn_long: number
    uranus_long: number
    neptune_long: number
    pluto_long: number
    chiron_long: number | null
    lilith_long: number | null
    selena_long: number | null
    true_node_long: number | null
    ceres_long: number | null
    pallas_long: number | null
    juno_long: number | null
    vesta_long: number | null
}

export type CodexTransitSummary = {
    rangeStart: string
    rangeEnd: string
    notableMovements: Array<{ body: string; degrees: number }>
    retrogradeDays: Record<string, number>
    sampledDays: number
}

export type CodexTransitWindowResult = {
    source: "codex" | "swisseph_fallback"
    reason: string | null
    rows: EphemerisCodexRow[]
    coverage: CodexCoverage
    summary: CodexTransitSummary | null
}

function toNumber(value: unknown) {
    if (typeof value === "number") return value
    if (typeof value === "string") {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

function normalizeAngleDelta(from: number, to: number) {
    const raw = Math.abs(to - from) % 360
    return raw > 180 ? 360 - raw : raw
}

function countExpectedDays(range: QuestionTimeRange) {
    const ms = range.endDate.getTime() - range.startDate.getTime()
    return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

function normalizeCodexRows(rows: unknown[]): EphemerisCodexRow[] {
    return rows
        .map((row): EphemerisCodexRow | null => {
            if (!row || typeof row !== "object") return null
            const item = row as Record<string, unknown>

            const date = typeof item.date === "string" ? item.date : null
            if (!date) return null

            const numericRequired: MajorPlanetKey[] = [...MAJOR_PLANET_KEYS]
            const parsedRequired = Object.fromEntries(
                numericRequired.map((key) => [key, toNumber(item[key])])
            ) as Record<MajorPlanetKey, number | null>

            if (Object.values(parsedRequired).some((value) => value == null)) return null

            const retrograde =
                item.is_retrograde && typeof item.is_retrograde === "object"
                    ? (item.is_retrograde as Record<string, boolean>)
                    : {}

            return {
                date,
                ayanamsa_lahiri: toNumber(item.ayanamsa_lahiri),
                is_retrograde: retrograde,
                sun_long: parsedRequired.sun_long as number,
                moon_long: parsedRequired.moon_long as number,
                mercury_long: parsedRequired.mercury_long as number,
                venus_long: parsedRequired.venus_long as number,
                mars_long: parsedRequired.mars_long as number,
                jupiter_long: parsedRequired.jupiter_long as number,
                saturn_long: parsedRequired.saturn_long as number,
                uranus_long: parsedRequired.uranus_long as number,
                neptune_long: parsedRequired.neptune_long as number,
                pluto_long: parsedRequired.pluto_long as number,
                chiron_long: toNumber(item.chiron_long),
                lilith_long: toNumber(item.lilith_long),
                selena_long: toNumber(item.selena_long),
                true_node_long: toNumber(item.true_node_long),
                ceres_long: toNumber(item.ceres_long),
                pallas_long: toNumber(item.pallas_long),
                juno_long: toNumber(item.juno_long),
                vesta_long: toNumber(item.vesta_long),
            }
        })
        .filter((value): value is EphemerisCodexRow => Boolean(value))
        .sort((a, b) => a.date.localeCompare(b.date))
}

function buildSummary(
    rows: EphemerisCodexRow[],
    range: QuestionTimeRange
): CodexTransitSummary | null {
    if (!rows.length) return null
    const first = rows[0]
    const last = rows[rows.length - 1]

    const notableMovements = MAJOR_PLANET_KEYS.map((key) => ({
        body: key.replace("_long", "").replace(/^\w/, (c) => c.toUpperCase()),
        degrees: Number(
            normalizeAngleDelta(first[key] as number, last[key] as number).toFixed(3)
        ),
    }))
        .sort((a, b) => b.degrees - a.degrees)
        .slice(0, 4)

    const retrogradeDays: Record<string, number> = {}
    for (const row of rows) {
        for (const [body, isRetro] of Object.entries(row.is_retrograde ?? {})) {
            if (!isRetro) continue
            retrogradeDays[body] = (retrogradeDays[body] ?? 0) + 1
        }
    }

    return {
        rangeStart: range.startDateIso,
        rangeEnd: range.endDateIso,
        notableMovements,
        retrogradeDays,
        sampledDays: rows.length,
    }
}

export async function getCodexTransitWindow(
    range: QuestionTimeRange
): Promise<CodexTransitWindowResult> {
    const expectedDays = countExpectedDays(range)

    if (!supabaseAdmin) {
        return {
            source: "swisseph_fallback",
            reason: "SUPABASE_ADMIN_UNAVAILABLE",
            rows: [],
            coverage: {
                expectedDays,
                actualDays: 0,
                ratio: 0,
                isComplete: false,
            },
            summary: null,
        }
    }

    const { data, error } = await supabaseAdmin
        .from("ephemeris_codex")
        .select(
            "date, sun_long, moon_long, mercury_long, venus_long, mars_long, jupiter_long, saturn_long, uranus_long, neptune_long, pluto_long, chiron_long, lilith_long, selena_long, true_node_long, ceres_long, pallas_long, juno_long, vesta_long, ayanamsa_lahiri, is_retrograde"
        )
        .gte("date", range.startDateIso)
        .lte("date", range.endDateIso)
        .order("date", { ascending: true })

    if (error) {
        return {
            source: "swisseph_fallback",
            reason: error.message,
            rows: [],
            coverage: {
                expectedDays,
                actualDays: 0,
                ratio: 0,
                isComplete: false,
            },
            summary: null,
        }
    }

    const normalizedRows = normalizeCodexRows((data ?? []) as unknown[])
    const actualDays = normalizedRows.length
    const coverage = computeCodexCoverage(expectedDays, actualDays)
    const summary = buildSummary(normalizedRows, range)

    if (!coverage.isComplete) {
        return {
            source: "swisseph_fallback",
            reason: "INCOMPLETE_CODEX_COVERAGE",
            rows: normalizedRows,
            coverage,
            summary,
        }
    }

    return {
        source: "codex",
        reason: null,
        rows: normalizedRows,
        coverage,
        summary,
    }
}
