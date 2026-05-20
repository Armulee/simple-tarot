"use client"

import { Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import TransitOrbitVisual from "@/components/chat/horoscope/transit-orbit-visual"
import TransitPlanetGrid from "@/components/chat/horoscope/transit-planet-grid"
import RealtimePlanetaryPanel from "@/components/astrology/realtime-planetary-panel"
import type { PersonalizedTransitAspectsResult } from "@/lib/astrology/transit-aspects"
import { SectionHeader } from "./SectionHeader"

export function SelectedTransitCard({
    isoDate,
    chartData,
    personalizedTransitAspects,
    status,
}: {
    isoDate: string | null
    chartData: Record<string, unknown> | null
    personalizedTransitAspects: PersonalizedTransitAspectsResult | null
    status: "idle" | "loading" | "ready" | "error"
}) {
    const t = useTranslations("Calendar")

    // `isoDate` is part of the public API so the parent can rerender us
    // when the calendar selection changes; it doesn't drive layout itself.
    void isoDate

    return (
        <div className='rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-5 space-y-4'>
            <SectionHeader
                icon={Sparkles}
                label={t("detail.selectedTransitTitle")}
            />

            {status === "loading" || status === "idle" ? (
                <div className='space-y-3'>
                    <div className='aspect-square rounded-2xl border border-white/10 bg-white/[0.02] animate-pulse' />
                    <div className='h-24 rounded-2xl border border-white/10 bg-white/[0.02] animate-pulse' />
                    <div className='h-40 rounded-2xl border border-white/10 bg-white/[0.02] animate-pulse' />
                </div>
            ) : status === "error" || !chartData ? (
                <p className='text-sm text-white/55 leading-relaxed'>
                    {t("detail.selectedTransitError")}
                </p>
            ) : (
                <div className='space-y-5'>
                    <TransitOrbitVisual chartData={chartData} />
                    <TransitPlanetGrid chartData={chartData} />
                    <RealtimePlanetaryPanel
                        chartData={chartData}
                        personalizedTransitAspects={
                            personalizedTransitAspects
                        }
                    />
                </div>
            )}
        </div>
    )
}
