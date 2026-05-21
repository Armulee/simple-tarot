"use client"

import { useMemo, useState } from "react"
import { Box, CircleDot } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"

import Orbit3D from "@/components/astrology/orbit-3d"
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

type ViewMode = "2d" | "3d"

/**
 * Transit-flavored wrapper around the shared {@link OrbitVisual}. Pulls the
 * transit planets and date out of the horoscope chartData payload so call
 * sites can keep passing the full `chartData` object.
 *
 * Includes a 2D / 3D toggle — the 3D view is dynamically imported so the
 * three.js bundle is only fetched when the user opts in.
 */
export default function TransitOrbitVisual({
    chartData,
    highlightPlanets,
}: {
    chartData: TransitChartData | Record<string, unknown> | null | undefined
    highlightPlanets?: ReadonlyArray<string>
}) {
    const formatter = useFormatter()
    const t = useTranslations("TransitOrbit")
    const [view, setView] = useState<ViewMode>("2d")

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
        <div className='space-y-3'>
            <div className='flex justify-end'>
                <div className='inline-flex items-center gap-0.5 rounded-full border border-white/15 bg-white/[0.04] p-0.5 text-[10px] font-semibold uppercase tracking-[0.22em]'>
                    <button
                        type='button'
                        aria-pressed={view === "2d"}
                        onClick={() => setView("2d")}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${
                            view === "2d"
                                ? "bg-white/15 text-white"
                                : "text-white/55 hover:text-white"
                        }`}
                    >
                        <CircleDot className='h-3 w-3' />
                        {t("toggle2D")}
                    </button>
                    <button
                        type='button'
                        aria-pressed={view === "3d"}
                        onClick={() => setView("3d")}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${
                            view === "3d"
                                ? "bg-white/15 text-white"
                                : "text-white/55 hover:text-white"
                        }`}
                    >
                        <Box className='h-3 w-3' />
                        {t("toggle3D")}
                    </button>
                </div>
            </div>

            {view === "3d" ? (
                <Orbit3D
                    planets={planets}
                    highlightPlanets={highlightPlanets}
                />
            ) : (
                <OrbitVisual
                    planets={planets}
                    dateLabel={dateLabel}
                    highlightPlanets={highlightPlanets}
                    ariaLabel='Transit orbit visual'
                />
            )}
        </div>
    )
}
