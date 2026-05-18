"use client"

import { type ReactNode, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, Sparkles } from "lucide-react"
import type { ChatMessage } from "@/components/chat/types"
import { PrivacyHighlightedText } from "@/components/chat/privacy/privacy-highlighted-user-text"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"
import RealtimePlanetaryPanel from "@/components/astrology/realtime-planetary-panel"
import type { SourceAspectEvent } from "@/components/chat/types"
import {
    looksLikeNatalQuestion,
    looksLikeTimingQuestion,
} from "@/lib/astrology/single-day"
import VerdictHero from "./horoscope/verdict-hero"
import TransitPlanetGrid from "./horoscope/transit-planet-grid"
import TransitOrbitVisual from "./horoscope/transit-orbit-visual"
import NatalChartDetail from "./horoscope/natal-chart-detail"

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

type HoroscopeTab = "overview" | "aspect" | "transit"

const TAB_ORDER_DEFAULT: ReadonlyArray<HoroscopeTab> = [
    "overview",
    "transit",
    "aspect",
]

const TAB_ORDER_NATAL: ReadonlyArray<HoroscopeTab> = ["overview", "transit"]

function stripMarkdownFormatting(text: string): string {
    return text.replace(/\*\*/g, "").replace(/`/g, "").trim()
}

function splitSentences(text: string): string[] {
    const normalized = stripMarkdownFormatting(text).replace(/\s+/g, " ").trim()
    if (!normalized) return []
    return (normalized.match(/[^.!?\n]+(?:[.!?]+|$)/g) ?? [normalized])
        .map((sentence) => sentence.trim())
        .filter(Boolean)
}

function getOverviewSummary(message: ChatMessage): string {
    const firstInsight = message.aspectInsights?.find((item) =>
        item.insight?.trim(),
    )?.insight
    if (firstInsight) return firstInsight
    return splitSentences(message.text || "")[0] || ""
}

export default function HoroscopeReadingTabs({
    message,
    loadingNode,
    footerActions,
    privacyAliases,
    onAskAspectDetail,
    askedAspectKeys,
    showBirthDetails,
    showTransitDetails,
    onToggleBirthDetails,
    onToggleTransitDetails,
    birthDetailsContent,
    transitDetailsContent,
}: {
    message: ChatMessage
    loadingNode?: ReactNode
    footerActions?: ReactNode
    /**
     * Session-scoped alias map used to resolve `[Person_0]`-style placeholders
     * to the user's original PII and render them as emerald lock chips.
     */
    privacyAliases?: PromptAliasEntry[]
    onAskAspectDetail?: (
        question: string,
        aspectKey: string,
        event: SourceAspectEvent,
    ) => void
    askedAspectKeys?: Record<string, string>
    showBirthDetails?: boolean
    showTransitDetails?: boolean
    onToggleBirthDetails?: () => void
    onToggleTransitDetails?: () => void
    birthDetailsContent?: ReactNode
    transitDetailsContent?: ReactNode
}) {
    // Track the user's explicit tab pick (if any). When null we derive the
    // active tab from message state so the UI auto-flips between Transit
    // (while the LLM is computing the verdict) and Overview (once the
    // verdict has streamed in).
    const [explicitTab, setExplicitTab] = useState<HoroscopeTab | null>(null)
    const tTabs = useTranslations("HoroscopeChat.tabs")
    const tReading = useTranslations("ReadingPage.interpretation")

    // Natal-mode verdicts (no date/date-range, e.g. "Which career fits me?")
    // swap the right-hand "Technical Information" tab for a "Birth Chart
    // Information" tab anchored in natal placements, and drop the aspect
    // tab entirely. The hero visual underneath the key message also flips
    // from transit feed → relevant-planet spotlight (see VerdictHero).
    //
    // We commit to natal mode as soon as either signal is true:
    //   • the verdict has streamed back with mode === "natal", OR
    //   • the question text contains no date / date-range hints.
    // The text-based heuristic lets us avoid flashing today's transit
    // calculations while the natal verdict is still in flight.
    const questionTextForNatalCheck =
        message.displayQuestion ?? message.question ?? ""
    const isNatalLikely = useMemo(
        () => looksLikeNatalQuestion(questionTextForNatalCheck),
        [questionTextForNatalCheck],
    )
    const isTimingLikely = useMemo(
        () => looksLikeTimingQuestion(questionTextForNatalCheck),
        [questionTextForNatalCheck],
    )
    const verdictIsNatal = message.dailyVerdict?.mode === "natal"
    const verdictIsTiming = message.dailyVerdict?.mode === "timing"
    const isNatalMode = verdictIsNatal || isNatalLikely
    // "When will I..?" questions also shouldn't auto-flip to the transit
    // tab during loading — the verdict is about a forward date window, not
    // today's transit, so the today-grid would be misleading.
    const isTimingMode = verdictIsTiming || isTimingLikely

    // Reset auto-pilot whenever a new loading cycle starts (new question OR
    // regenerate). This way Regenerate flips us back to the technical-info
    // default and then back to overview when the verdict streams in.
    const hasDailyVerdict = !!message.dailyVerdict
    useEffect(() => {
        if (message.isLoading && !hasDailyVerdict) {
            setExplicitTab(null)
        }
    }, [message.isLoading, hasDailyVerdict])

    // If the active tab is "aspect" but the message becomes natal-mode
    // (after the verdict resolves), snap back to overview so we don't strand
    // the user on a tab we are no longer rendering.
    useEffect(() => {
        if (isNatalMode && explicitTab === "aspect") {
            setExplicitTab(null)
        }
    }, [isNatalMode, explicitTab])

    // Loading + no verdict yet → Transit (chartData lands first, no LLM
    // wait). Otherwise → Overview. An explicit user click always wins.
    //
    // Natal- and timing-mode questions skip the "show today's transit
    // while we wait" optimization — both verdicts are about something
    // other than today, so the today-grid would be misleading.
    const activeTab: HoroscopeTab =
        explicitTab ??
        (message.isLoading &&
        !hasDailyVerdict &&
        !isNatalMode &&
        !isTimingMode
            ? "transit"
            : "overview")

    const handleSelectTab = (tab: HoroscopeTab) => setExplicitTab(tab)

    const tabs = useMemo<Array<{ id: HoroscopeTab; label: string }>>(() => {
        if (isNatalMode) {
            return [
                { id: "overview", label: tTabs("overview") },
                { id: "transit", label: tTabs("birthChartInfo") },
            ]
        }
        return [
            { id: "overview", label: tTabs("overview") },
            { id: "transit", label: tTabs("transit") },
            { id: "aspect", label: tTabs("aspect") },
        ]
    }, [tTabs, isNatalMode])

    const summary = getOverviewSummary(message)
    const aliases = privacyAliases ?? []
    // const relevanceStats = useMemo(
    //     () =>
    //         (message.relevance ?? [])
    //             .filter((s) => s && typeof s.pct === "number" && s.pct > 0)
    //             .map(({ label, pct }) => ({
    //                 label,
    //                 pct,
    //                 color: resolveRelevanceColor(label),
    //             })),
    //     [message.relevance],
    // )

    // The hero only depends on `dailyVerdict` arriving — the schema + prompt
    // already guarantee the model omits it for multi-day questions, so we do
    // NOT wait on chartData.questionRange (which comes from a separate
    // /api/horoscope/chart-data fetch and can lag behind the LLM stream).
    const showVerdict = !!message.dailyVerdict
    const dateIso = useMemo(() => {
        if (!message.chartData || typeof message.chartData !== "object") {
            return null
        }
        const range = (message.chartData as { questionRange?: unknown })
            .questionRange
        if (!range || typeof range !== "object") return null
        const startDateIso = (range as { startDateIso?: unknown }).startDateIso
        return typeof startDateIso === "string" ? startDateIso : null
    }, [message.chartData])

    return (
        <section className='relative overflow-hidden'>
            <div className='space-y-6'>
                {message.isLoading && loadingNode ? (
                    <div className='flex justify-start'>{loadingNode}</div>
                ) : null}
                <div
                    role='tablist'
                    aria-label='Horoscope reading sections'
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
                                onClick={() => handleSelectTab(tab.id)}
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
                    {/* Hidden ordering anchor for aria/test stability */}
                    <span className='sr-only'>
                        {(isNatalMode ? TAB_ORDER_NATAL : TAB_ORDER_DEFAULT).join(
                            ",",
                        )}
                    </span>
                </div>

                {activeTab === "overview" && (
                    <div className='space-y-6'>
                        {showVerdict && message.dailyVerdict && (
                            <VerdictHero
                                verdict={message.dailyVerdict}
                                dateIso={dateIso}
                                privacyAliases={aliases}
                                isLoading={message.isLoading}
                                transitSourceMessage={message}
                            />
                        )}

                        {message.isLoading && !showVerdict && (
                            <div
                                className='flex flex-col items-center gap-4 py-6 animate-pulse'
                                aria-hidden
                            >
                                <div className='h-12 w-12 rounded-full bg-white/[0.07]' />
                                <div className='h-6 w-2/3 rounded-full bg-white/[0.07]' />
                                <div className='h-5 w-24 rounded-full bg-white/[0.05]' />
                                <div className='mt-4 w-full max-w-md space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4'>
                                    <div className='h-5 w-3/4 rounded bg-white/[0.07]' />
                                    <div className='h-3 w-5/6 rounded bg-white/[0.05]' />
                                </div>
                            </div>
                        )}

                        {!message.isLoading && !showVerdict && summary && (
                            <div className='rounded-2xl border border-indigo-300/20 bg-indigo-400/[0.07] px-4 py-3 shadow-[0_8px_24px_-18px_rgba(129,140,248,0.75)]'>
                                <div className='mb-1 flex items-start justify-between gap-3'>
                                    <div>
                                        <p className='min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-100/70'>
                                            {tReading("actions.keyMessage")}
                                        </p>
                                        <p className='text-sm leading-7 text-white/92'>
                                            <PrivacyHighlightedText
                                                text={summary}
                                                aliases={aliases}
                                                supportMarkdown
                                            />
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Follow-up suggestions are now hosted EXCLUSIVELY
                            in the action-trigger composer (see <QuestionInput
                            composerFollowUps>); never rendered after the
                            overview tab here. The composer hides them
                            automatically once the user sends a new question. */}
                    </div>
                )}

                {activeTab === "transit" &&
                    (isNatalMode ? (
                        <div className='space-y-6 rounded-[16px]'>
                            <NatalChartDetail chartData={message.chartData} />

                            {footerActions && !message.isLoading ? (
                                <div className='border-t border-white/10 pt-4'>
                                    {footerActions}
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className='space-y-5 rounded-[16px]'>
                            <TransitOrbitVisual chartData={message.chartData} />
                            <TransitPlanetGrid chartData={message.chartData} />
                            <NatalChartCollapsible
                                chartData={message.chartData}
                            />

                            {footerActions && !message.isLoading ? (
                                <div className='border-t border-white/10 pt-4'>
                                    {footerActions}
                                </div>
                            ) : null}
                        </div>
                    ))}

                {activeTab === "aspect" && !isNatalMode && (
                    <div>
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
                            showBirthDetails={showBirthDetails}
                            showTransitDetails={showTransitDetails}
                            onToggleBirthDetails={onToggleBirthDetails}
                            onToggleTransitDetails={onToggleTransitDetails}
                            birthDetailsContent={birthDetailsContent}
                            transitDetailsContent={transitDetailsContent}
                        />
                    </div>
                )}
            </div>
        </section>
    )
}
