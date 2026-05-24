"use client"

import { Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import BirthChartStats from "./stats"
import BirthChartOrbitVisual from "./orbit-visual"
import BirthChartShareSection from "./share-section"
import BirthChartQuestion from "./question"
import BirthChartDebugSection from "./debug-section"
import BirthChartInfoCard from "./info-card"
import BirthChartHouses from "./houses"
import BirthChartPlanets from "./planets"

interface BirthChartDisplayProps {
    birthChart: {
        id: string
        day: number
        month: number
        year: number
        hour: number
        minute: number
        timezone: number
        lat: number
        lng: number
        country?: string | null
        state_province?: string | null
        houses?: Record<string, unknown> | null
        planets?: Record<string, unknown> | null
        created_at: string
    }
    mode?: "shared" | "personal"
    onChartUpdated?: () => void | Promise<void>
}

export default function BirthChartDisplay({
    birthChart,
    mode = "shared",
    onChartUpdated,
}: BirthChartDisplayProps) {
    const t = useTranslations("BirthChart")

    return (
        <div className='relative isolate'>
            <div className='relative max-w-6xl mx-auto px-4 lg:px-6 py-8 lg:py-14 space-y-10 lg:space-y-14'>
                {/* Hero */}
                <section className='relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]'>
                    <div
                        aria-hidden
                        className='pointer-events-none absolute -top-24 left-1/2 h-56 w-[28rem] -translate-x-1/2 rounded-full bg-violet-500/20 blur-[110px]'
                    />
                    <div
                        aria-hidden
                        className='pointer-events-none absolute -bottom-24 -right-16 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl'
                    />
                    <div
                        aria-hidden
                        className='pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl'
                    />

                    <div className='relative px-6 sm:px-10 py-10 sm:py-14 space-y-7 text-center'>
                        <div className='inline-flex items-center justify-center gap-3'>
                            <span className='h-px w-8 bg-gradient-to-r from-transparent to-amber-300/80' />
                            <p className='text-[11px] font-medium uppercase tracking-[0.32em] text-amber-200/80'>
                                {t("subtitle")}
                            </p>
                            <Sparkles className='h-3.5 w-3.5 text-amber-200/70' />
                            <span className='h-px w-8 bg-gradient-to-l from-transparent to-amber-300/80' />
                        </div>

                        <h1 className='font-serif italic text-3xl sm:text-5xl text-white leading-tight'>
                            {t("pageTitle")}
                        </h1>

                        <div className='mx-auto max-w-2xl'>
                            <BirthChartInfoCard
                                birthChart={birthChart}
                                mode={mode}
                                onChartUpdated={onChartUpdated}
                            />
                        </div>
                    </div>
                </section>

                {/* Orbit + Stats */}
                <section className='relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]'>
                    <div
                        aria-hidden
                        className='pointer-events-none absolute -top-32 left-1/2 h-64 w-[28rem] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl'
                    />
                    <div className='relative p-4 sm:p-6 lg:p-8 space-y-8'>
                        <SectionEyebrow label={t("planetaryPositions")} />
                        <div className='mx-auto w-full lg:max-w-2xl'>
                            <BirthChartOrbitVisual
                                planets={birthChart.planets}
                            />
                        </div>
                    </div>
                </section>

                <BirthChartStats planets={birthChart.planets} />

                {/* Houses Detail */}
                <BirthChartHouses
                    houses={birthChart.houses}
                    planets={birthChart.planets}
                />

                {/* Planets Detail */}
                <BirthChartPlanets planets={birthChart.planets} />

                {/* Share Section (shared link pages only) */}
                {mode === "shared" && (
                    <BirthChartShareSection id={birthChart.id} />
                )}
            </div>
        </div>
    )
}

function SectionEyebrow({ label }: { label: string }) {
    return (
        <div className='flex items-center gap-3'>
            <span className='h-px w-8 bg-gradient-to-r from-amber-300/80 to-transparent' />
            <p className='text-[11px] font-medium uppercase tracking-[0.32em] text-amber-200/80'>
                {label}
            </p>
            <Sparkles className='h-3.5 w-3.5 text-amber-200/70' />
            <span className='h-px flex-1 bg-gradient-to-r from-amber-300/30 to-transparent' />
        </div>
    )
}
