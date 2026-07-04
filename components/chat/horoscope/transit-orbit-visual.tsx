"use client"

import { useMemo } from "react"
import OrbitVisual, {
    type OrbitAspectLine,
} from "@/components/astrology/orbit-visual"

type TransitChartData = {
    charts?: Array<{
        planets?: Record<string, unknown>
    }> | null
    transit?: {
        charts?: Array<{
            planets?: Record<string, unknown>
        }> | null
    } | null
    personalizedTransitAspects?: {
        exact?: {
            events?: Array<{
                transitPlanet?: string
                natalPlanet?: string
                aspectType?: string
            }> | null
        } | null
    } | null
} | null

const RENDERED_ASPECTS = new Set<OrbitAspectLine["aspectType"]>([
    "conjunction",
    "opposition",
    "sextile",
    "square",
])

/**
 * Transit-flavored wrapper around the shared {@link OrbitVisual}. The overview
 * variant: live transit planets in front, natal positions as ghosted shadows
 * behind them, and aspect lines connecting any conjunction / opposition /
 * sextile / square between the two sets.
 */
export default function TransitOrbitVisual({
    chartData,
    highlightPlanets,
}: {
    chartData: TransitChartData | Record<string, unknown> | null | undefined
    highlightPlanets?: ReadonlyArray<string>
}) {
    const data = (chartData ?? null) as TransitChartData
    const transitPlanets = data?.transit?.charts?.[0]?.planets ?? null
    const natalPlanets = data?.charts?.[0]?.planets ?? null

    const aspects = useMemo<OrbitAspectLine[]>(() => {
        const events = data?.personalizedTransitAspects?.exact?.events ?? []
        if (!Array.isArray(events) || events.length === 0) return []
        const seen = new Set<string>()
        const out: OrbitAspectLine[] = []
        for (const e of events) {
            const tp = typeof e?.transitPlanet === "string" ? e.transitPlanet : ""
            const np = typeof e?.natalPlanet === "string" ? e.natalPlanet : ""
            const type = typeof e?.aspectType === "string" ? e.aspectType : ""
            if (!tp || !np || !type) continue
            if (!RENDERED_ASPECTS.has(type as OrbitAspectLine["aspectType"])) {
                continue
            }
            const key = `${tp}-${np}-${type}`
            if (seen.has(key)) continue
            seen.add(key)
            out.push({
                transitPlanet: tp,
                natalPlanet: np,
                aspectType: type as OrbitAspectLine["aspectType"],
            })
        }
        return out
    }, [data])

    return (
        <OrbitVisual
            planets={transitPlanets}
            shadowPlanets={natalPlanets}
            aspects={aspects}
            highlightPlanets={highlightPlanets}
            labelMode='sign-degree'
            ariaLabel='Transit orbit visual'
        />
    )
}
