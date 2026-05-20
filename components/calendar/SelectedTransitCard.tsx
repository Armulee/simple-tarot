"use client"

import { useMemo } from "react"
import { Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import TransitOrbitVisual from "@/components/chat/horoscope/transit-orbit-visual"
import TransitFeed from "@/components/chat/horoscope/transit-feed"
import type { ChatMessage } from "@/components/chat/types"
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

    // Wrap the calendar's per-date chart data in the minimal ChatMessage
    // shape TransitFeed reads from, so we can reuse the horoscope transit
    // styling without spinning up a real chat session.
    const pseudoMessage = useMemo<ChatMessage>(
        () => ({
            id: `calendar-transit-${isoDate ?? "none"}`,
            role: "assistant",
            text: "",
            chartData: chartData ?? null,
            personalizedTransitAspects: personalizedTransitAspects ?? null,
            personalizedTransitAspectsMerged: null,
            aspectInsights: [],
        }),
        [isoDate, chartData, personalizedTransitAspects],
    )

    return (
        <div className='rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-5 space-y-4'>
            <SectionHeader
                icon={Sparkles}
                label={t("detail.selectedTransitTitle")}
            />

            {status === "loading" || status === "idle" ? (
                <div className='space-y-3'>
                    <div className='aspect-square rounded-2xl border border-white/10 bg-white/[0.02] animate-pulse' />
                    <div className='h-16 rounded-2xl border border-white/10 bg-white/[0.02] animate-pulse' />
                </div>
            ) : status === "error" || !chartData ? (
                <p className='text-sm text-white/55 leading-relaxed'>
                    {t("detail.selectedTransitError")}
                </p>
            ) : (
                <div className='space-y-4'>
                    <TransitOrbitVisual chartData={chartData} />
                    <TransitFeed
                        message={pseudoMessage}
                        compact
                        maxVisible={3}
                    />
                </div>
            )}
        </div>
    )
}
