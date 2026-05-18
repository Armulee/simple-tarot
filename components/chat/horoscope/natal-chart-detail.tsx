"use client"

import { useMemo } from "react"
import BirthChartOrbitVisual from "@/components/birth-chart/orbit-visual"
import BirthChartStats from "@/components/birth-chart/stats"
import BirthChartHouses from "@/components/birth-chart/houses"
import BirthChartPlanets from "@/components/birth-chart/planets"
import { useProfile } from "@/contexts/profile-context"

type NatalChartDetailProps = {
    chartData: Record<string, unknown> | null | undefined
}

/**
 * Renders the same set of birth-chart sections the dedicated Birth Chart
 * page uses (orbit visual → stats → houses → planets detail). When the
 * signed-in user has a saved birth chart in their profile we use it
 * directly so the chat tab is byte-for-byte identical to /birth-chart;
 * otherwise we fall back to the on-the-fly `chartData.charts[0]` produced
 * by `/api/horoscope/chart-data`.
 *
 * We intentionally never read from `chartData.transit.*`, so natal-mode
 * answers never display today's transit calculations under the "Birth
 * Chart Information" tab.
 */
export default function NatalChartDetail({ chartData }: NatalChartDetailProps) {
    const { birthChart: storedBirthChart } = useProfile()

    const { planets, houses } = useMemo(() => {
        // Prefer the saved birth-chart row — this is exactly what
        // /birth-chart renders. Falling back to chartData.charts[0]
        // ensures non-signed-in / anonymous flows still work.
        if (storedBirthChart) {
            const storedPlanets =
                (storedBirthChart.planets as Record<string, unknown> | null) ??
                null
            const storedHouses =
                (storedBirthChart.houses as Record<string, unknown> | null) ??
                null
            if (storedPlanets) {
                return { planets: storedPlanets, houses: storedHouses }
            }
        }
        const data = (chartData ?? null) as
            | {
                  charts?: Array<{
                      planets?: Record<string, unknown>
                      houses?: Record<string, unknown>
                  }>
              }
            | null
        const primary = data?.charts?.[0]
        return {
            planets: (primary?.planets ?? null) as Record<
                string,
                unknown
            > | null,
            houses: (primary?.houses ?? null) as Record<
                string,
                unknown
            > | null,
        }
    }, [chartData, storedBirthChart])

    if (!planets) return null

    return (
        <div className='space-y-8'>
            <BirthChartOrbitVisual planets={planets} />
            <BirthChartStats planets={planets} />
            {houses ? (
                <BirthChartHouses houses={houses} planets={planets} />
            ) : null}
            <BirthChartPlanets planets={planets} />
        </div>
    )
}
