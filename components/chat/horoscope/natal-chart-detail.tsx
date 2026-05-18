"use client"

import { useMemo } from "react"
import BirthChartOrbitVisual from "@/components/birth-chart/orbit-visual"
import BirthChartStats from "@/components/birth-chart/stats"
import BirthChartHouses from "@/components/birth-chart/houses"
import BirthChartPlanets from "@/components/birth-chart/planets"

type NatalChartDetailProps = {
    chartData: Record<string, unknown> | null | undefined
}

/**
 * Renders the same set of birth-chart sections the dedicated Birth Chart
 * page uses (orbit visual → stats → houses → planets detail), but driven by
 * the in-chat `chartData` blob returned by `/api/horoscope/chart-data`. We
 * intentionally pull from `chartData.charts[0]` (the natal chart) and never
 * touch `chartData.transit.*`, so natal-mode horoscope answers never display
 * today's transit calculations under the "Birth Chart Information" tab.
 */
export default function NatalChartDetail({ chartData }: NatalChartDetailProps) {
    const { planets, houses } = useMemo(() => {
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
    }, [chartData])

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
