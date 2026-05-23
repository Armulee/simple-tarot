"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, Sparkles } from "lucide-react"
import type {
    ChatMessage,
    SourceAspectEvent,
} from "@/components/chat/types"
import {
    unmaskTextWithAliases,
    type PromptAliasEntry,
} from "@/lib/privacy/prompt-redaction"
import InnerEnergyHero from "@/components/chat/general/inner-energy-hero"
import TransitOrbitVisual from "@/components/chat/horoscope/transit-orbit-visual"
import TransitPlanetGrid from "@/components/chat/horoscope/transit-planet-grid"
import RealtimePlanetaryPanel from "@/components/astrology/realtime-planetary-panel"

function NatalChartCollapsible({
    chartData,
}: {
    chartData: ChatMessage["chartData"]
}) {
    const [open, setOpen] = useState(false)
    const tAstro = useTranslations("BirthChart")

    return (
        <div className='overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] transition'>
            <button
                type='button'
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className='group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]'
            >
                <span className='flex items-center gap-2'>
                    <span className='relative inline-flex h-6 w-6 items-center justify-center rounded-full border border-indigo-300/30 bg-indigo-500/15 text-indigo-200 shadow-[0_0_12px_-2px_rgba(129,140,248,0.55)]'>
                        <Sparkles className='h-3 w-3' />
                    </span>
                    <span className='bg-gradient-to-r from-indigo-200 via-violet-200 to-cyan-200 bg-clip-text text-[12px] font-semibold uppercase tracking-[0.22em] text-transparent'>
                        {tAstro("tabBirthChart")}
                    </span>
                </span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-white/55 transition-transform duration-300 group-hover:text-white/80 ${
                        open ? "rotate-180" : ""
                    }`}
                />
            </button>
            {open && (
                <div className='border-t border-white/[0.06] px-4 py-4 animate-fade-in'>
                    <TransitPlanetGrid
                        chartData={chartData}
                        source='natal'
                        hideHeader
                    />
                </div>
            )}
        </div>
    )
}

type GeneralTab = "overview" | "transit" | "aspect"

function hasTransitChart(chartData: ChatMessage["chartData"]): boolean {
    if (!chartData || typeof chartData !== "object") return false
    const transit = (chartData as { transit?: unknown }).transit as
        | { charts?: unknown[] }
        | null
        | undefined
    return Array.isArray(transit?.charts) && transit!.charts!.length > 0
}

function hasAspectData(message: ChatMessage): boolean {
    const aspects =
        message.personalizedTransitAspects ??
        ((message.chartData as { personalizedTransitAspects?: unknown } | null)
            ?.personalizedTransitAspects as
            | ChatMessage["personalizedTransitAspects"]
            | undefined)
    if (!aspects) return false
    const exactCount = aspects.exact?.events.length ?? 0
    const rangeCount = aspects.range?.events.length ?? 0
    return exactCount > 0 || rangeCount > 0
}

/**
 * Tabbed wrapper for the general (chat) reply strategy. Mirrors
 * HoroscopeReadingTabs so the general answer reads as a peer of the horoscope
 * reading: the Overview tab carries the symbolic inner-energy reflection, and
 * the Technical / Impacting-Aspects tabs surface the birth chart, the transit
 * chart for the target date (extracted from the question, or today), and the
 * live transit-to-natal aspects the answer is grounded in. The astrology tabs
 * only appear once chart data has streamed in.
 */
export default function GeneralReadingTabs({
    message,
    privacyAliases,
    onAskAspectDetail,
    askedAspectKeys,
}: {
    message: ChatMessage
    privacyAliases?: PromptAliasEntry[]
    onAskAspectDetail?: (
        question: string,
        aspectKey: string,
        event: SourceAspectEvent,
    ) => void
    askedAspectKeys?: Record<string, string>
}) {
    const tTabs = useTranslations("HoroscopeChat.tabs")
    const [explicitTab, setExplicitTab] = useState<GeneralTab | null>(null)

    const showTransitTab = hasTransitChart(message.chartData)
    const showAspectTab = hasAspectData(message)

    // If the user is parked on a tab that loses its data (e.g. message
    // regenerated), snap back to the overview reflection.
    useEffect(() => {
        if (explicitTab === "transit" && !showTransitTab) setExplicitTab(null)
        if (explicitTab === "aspect" && !showAspectTab) setExplicitTab(null)
    }, [explicitTab, showTransitTab, showAspectTab])

    const tabs = useMemo<Array<{ id: GeneralTab; label: string }>>(() => {
        const out: Array<{ id: GeneralTab; label: string }> = [
            { id: "overview", label: tTabs("overview") },
        ]
        if (showTransitTab) out.push({ id: "transit", label: tTabs("transit") })
        if (showAspectTab) out.push({ id: "aspect", label: tTabs("aspect") })
        return out
    }, [tTabs, showTransitTab, showAspectTab])

    const activeTab: GeneralTab = explicitTab ?? "overview"
    const aliases = privacyAliases ?? []

    // Unmasked question + reflection passed to the hero's share section.
    const shareQuestion = unmaskTextWithAliases(
        message.displayQuestion ?? message.question ?? "",
        aliases,
    )
    const shareInterpretation = unmaskTextWithAliases(
        (message.generalReply?.reflection || message.text || "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
        aliases,
    )

    // No astrology tabs to show — render the bare hero, no tab strip.
    if (tabs.length === 1) {
        return (
            <InnerEnergyHero
                reply={message.generalReply}
                privacyAliases={aliases}
                isLoading={Boolean(message.isLoading)}
                shareQuestion={shareQuestion}
                shareInterpretation={shareInterpretation}
            />
        )
    }

    return (
        <section className='relative overflow-hidden'>
            <div className='space-y-6'>
                <div
                    role='tablist'
                    aria-label='Inner energy reading sections'
                    className='relative flex gap-2 overflow-x-auto pb-1'
                >
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                role='tab'
                                type='button'
                                aria-selected={isActive}
                                onClick={() => setExplicitTab(tab.id)}
                                className={`relative shrink-0 overflow-hidden rounded-full border px-4 py-2 text-sm font-medium transition duration-300 ${
                                    isActive
                                        ? "border-blue-400/40 text-white shadow-[0_10px_30px_-10px_rgba(96,165,250,0.38)] backdrop-blur-xl ring-1 ring-blue-400/25"
                                        : "border-blue-400/15 text-white/55 hover:border-blue-400/30 hover:bg-white/[0.06] hover:text-white/85"
                                }`}
                            >
                                {isActive && (
                                    <>
                                        <span
                                            aria-hidden
                                            className='pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(120%_120%_at_0%_0%,rgba(99,102,241,0.2),rgba(168,85,247,0.12)_38%,rgba(34,211,238,0.1)_72%,transparent_85%)] opacity-90 blur-xl'
                                        />
                                        <span
                                            aria-hidden
                                            className='absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15'
                                        />
                                    </>
                                )}
                                <span className='relative z-10'>
                                    {tab.label}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {activeTab === "overview" && (
                    <InnerEnergyHero
                        reply={message.generalReply}
                        privacyAliases={aliases}
                        isLoading={Boolean(message.isLoading)}
                        shareQuestion={shareQuestion}
                        shareInterpretation={shareInterpretation}
                    />
                )}

                {activeTab === "transit" && showTransitTab && (
                    <div className='space-y-5 rounded-[16px]'>
                        <TransitOrbitVisual chartData={message.chartData} />
                        <TransitPlanetGrid chartData={message.chartData} />
                        <NatalChartCollapsible chartData={message.chartData} />
                    </div>
                )}

                {activeTab === "aspect" && showAspectTab && (
                    <div className='space-y-3'>
                        <RealtimePlanetaryPanel
                            chartData={
                                message.chartData as
                                    | Record<string, unknown>
                                    | null
                                    | undefined
                            }
                            personalizedTransitAspects={
                                message.personalizedTransitAspects
                            }
                            personalizedTransitAspectsMerged={
                                message.personalizedTransitAspectsMerged
                            }
                            aspectInsights={message.aspectInsights}
                            onAskAspectDetail={onAskAspectDetail}
                            askedAspectKeys={askedAspectKeys}
                        />
                    </div>
                )}
            </div>
        </section>
    )
}
