"use client"

import { useMemo } from "react"
import { useFormatter } from "next-intl"
import OrbitVisual from "@/components/astrology/orbit-visual"

type TransitChartData = {
    transit?: {
        date?: {
            day?: number | null
            month?: number | null
            year?: number | null
        } | null
        charts?: Array<{
            planets?: Record<string, unknown>
        }> | null
    } | null
} | null

/**
 * Transit-flavored wrapper around the shared {@link OrbitVisual}. Pulls the
 * transit planets and date out of the horoscope chartData payload so call
 * sites can keep passing the full `chartData` object.
 */
export default function TransitOrbitVisual({
    chartData,
    highlightPlanets,
}: {
    chartData: TransitChartData | Record<string, unknown> | null | undefined
    highlightPlanets?: ReadonlyArray<string>
}) {
    const formatter = useFormatter()

    const data = (chartData ?? null) as TransitChartData
    const planets = data?.transit?.charts?.[0]?.planets ?? null

    const dateLabel = useMemo(() => {
        const d = data?.transit?.date
        if (!d?.day || !d?.month || !d?.year) return null
        try {
            const utc = new Date(
                Date.UTC(d.year, (d.month ?? 1) - 1, d.day ?? 1, 12, 0, 0),
            )
            if (Number.isNaN(utc.getTime())) return null
            return formatter.dateTime(utc, {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
            })
        } catch {
            return null
        }
    }, [data, formatter])

    return (
        <OrbitVisual
            planets={planets}
            dateLabel={dateLabel}
            highlightPlanets={highlightPlanets}
            ariaLabel='Transit orbit visual'
        />
    )
}
