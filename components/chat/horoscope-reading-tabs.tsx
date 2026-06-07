"use client"

import { type ReactNode, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, Sparkles } from "lucide-react"
import type { ChatMessage } from "@/components/chat/types"
import { PrivacyHighlightedText } from "@/components/chat/privacy/privacy-highlighted-user-text"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"
import RealtimePlanetaryPanel from "@/components/astrology/realtime-planetary-panel"
import CosmicCenteredLoader from "@/components/cosmic-centered-loader"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { SourceAspectEvent } from "@/components/chat/types"
import {
    isDateBoundedQuestionRange,
    isSingleDayQuestionRange,
    looksLikeNatalQuestion,
    readQuestionRangeFromChartData,
} from "@/lib/astrology/single-day"
import VerdictHero from "./horoscope/verdict-hero"
import TransitPlanetGrid from "./horoscope/transit-planet-grid"
import NatalChartDetail from "./horoscope/natal-chart-detail"
import PredictionTimeline from "./horoscope/prediction-timeline"

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
    onPickTransitDate,
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
    /**
     * For timeline-mode readings: pick which day inside the question's range
     * the Technical Information / Aspect tabs should anchor to. The session
     * fetches /chart-data for the chosen day and replaces `message.chartData`.
     */
    onPickTransitDate?: (
        messageId: string,
        datetimeIso: string,
    ) => void
}) {
    // Track the user's explicit tab pick (if any). When null we keep the user
    // on Overview so the streamed explanation stays front and center.
    const [explicitTab, setExplicitTab] = useState<HoroscopeTab | null>(null)
    const tChat = useTranslations("HoroscopeChat")
    const tTabs = useTranslations("HoroscopeChat.tabs")
    const tReading = useTranslations("ReadingPage.interpretation")
    const summary = getOverviewSummary(message)

    // Natal-mode verdicts (no date/date-range, e.g. "Which career fits me?")
    // swap the right-hand "Technical Information" tab for a "Birth Chart
    // Information" tab anchored in natal placements, and drop the aspect
    // tab entirely. The hero visual underneath the key message also flips
    // from transit feed → relevant-planet spotlight (see VerdictHero).
    //
    // The extract route's classification is the source of truth: when the
    // message carries replyStrategy we trust it directly. Otherwise we fall
    // back to the legacy heuristic (verdict.mode + question-text + chartData
    // questionRange) so older / regenerated messages keep working.
    const questionTextForNatalCheck =
        message.displayQuestion ?? message.question ?? ""
    const isNatalLikely = useMemo(
        () => looksLikeNatalQuestion(questionTextForNatalCheck),
        [questionTextForNatalCheck],
    )
    const questionRangeFromChart = useMemo(
        () => readQuestionRangeFromChartData(message.chartData),
        [message.chartData],
    )
    const chartIsSingleDay = isSingleDayQuestionRange(questionRangeFromChart)
    const chartIsDateBounded = isDateBoundedQuestionRange(
        questionRangeFromChart,
    )
    const verdictIsNatal = message.dailyVerdict?.mode === "natal"
    const verdictIsTechnical = message.dailyVerdict?.mode === "technical"
    // Technical replies are about planetary mechanics — they reuse the
    // same "spotlight" layout as natal, but the data comes from the
    // current transit chart instead of the asker's birth chart. From the
    // tab layout's perspective both modes hide the Aspect tab and swap
    // the Transit tab for the Birth Chart Information tab, so we treat
    // technical the same as natal here.
    const isNatalMode = message.replyStrategy
        ? message.replyStrategy === "natal" ||
          message.replyStrategy === "technical"
        : verdictIsNatal ||
          verdictIsTechnical ||
          (isNatalLikely && !chartIsSingleDay && !chartIsDateBounded)
    // Reset auto-pilot whenever a new loading cycle starts (new question OR
    // regenerate). This way a fresh run returns to the overview tab and keeps
    // the inline loader visible until the first overview text arrives.
    const hasOverviewContent = summary.length > 0
    useEffect(() => {
        if (message.isLoading && !hasOverviewContent) {
            setExplicitTab(null)
        }
    }, [message.isLoading, hasOverviewContent])

    // If the active tab is "aspect" but the message becomes natal-mode
    // (after the verdict resolves), snap back to overview so we don't strand
    // the user on a tab we are no longer rendering.
    useEffect(() => {
        if (isNatalMode && explicitTab === "aspect") {
            setExplicitTab(null)
        }
    }, [isNatalMode, explicitTab])

    // Default to Overview for every new reading (verdict hero + streamed text).
    // Chart data may arrive before the verdict, but we keep the user on
    // Overview until they choose Technical Information themselves.
    const activeTab: HoroscopeTab = explicitTab ?? "overview"

    const handleSelectTab = (tab: HoroscopeTab) => setExplicitTab(tab)

    // Timeline-mode transit-date picker. The /timeline response carries an
    // ordered list of slots (hourly or daily) covering the user's range.
    // When the user picks a slot, the parent refetches /chart-data for that
    // date and replaces `message.chartData`, so the Transit / Aspect tabs
    // re-render against the picked moment.
    const isTimelineMode = message.replyStrategy === "timeline"
    const timelineSlots = useMemo(() => {
        if (!isTimelineMode) return [] as Array<{
            datetimeIso: string
            label: string
        }>
        const slots = message.timeline?.slots ?? []
        return slots
            .filter(
                (slot): slot is NonNullable<typeof slot> =>
                    Boolean(slot?.datetimeIso),
            )
            .map((slot) => ({
                datetimeIso: slot.datetimeIso,
                label: slot.label || slot.datetimeIso,
            }))
    }, [isTimelineMode, message.timeline])
    const currentTransitIso = useMemo(() => {
        if (!isTimelineMode) return null
        const chartData = message.chartData as
            | {
                  transit?: {
                      date?: { day?: number; month?: number; year?: number }
                  } | null
              }
            | null
            | undefined
        const tDate = chartData?.transit?.date
        if (
            tDate &&
            typeof tDate.year === "number" &&
            typeof tDate.month === "number" &&
            typeof tDate.day === "number"
        ) {
            const yyyy = String(tDate.year).padStart(4, "0")
            const mm = String(tDate.month).padStart(2, "0")
            const dd = String(tDate.day).padStart(2, "0")
            return `${yyyy}-${mm}-${dd}`
        }
        return timelineSlots[0]?.datetimeIso?.slice(0, 10) ?? null
    }, [isTimelineMode, message.chartData, timelineSlots])
    const currentSlotLabel = useMemo(() => {
        if (!isTimelineMode || timelineSlots.length === 0) return null
        const match = timelineSlots.find(
            (slot) => slot.datetimeIso.slice(0, 10) === currentTransitIso,
        )
        return match?.label ?? timelineSlots[0]?.label ?? null
    }, [isTimelineMode, timelineSlots, currentTransitIso])
    const showTransitPicker =
        isTimelineMode && timelineSlots.length > 1 && Boolean(onPickTransitDate)

    const transitDatePickerNode = showTransitPicker ? (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type='button'
                    className='inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/80 transition hover:border-white/25 hover:bg-white/[0.08]'
                >
                    {currentSlotLabel ?? currentTransitIso}
                    <ChevronDown className='h-3.5 w-3.5 text-white/55' />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='max-h-72 overflow-y-auto'>
                {timelineSlots.map((slot) => (
                    <DropdownMenuItem
                        key={slot.datetimeIso}
                        onSelect={() =>
                            onPickTransitDate?.(message.id, slot.datetimeIso)
                        }
                    >
                        {slot.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    ) : null

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

    // Timeline takes precedence over the verdict hero — when the question is
    // a "what will happen" predictive ask we render the Prediction Timeline
    // instead, so the verdict and timeline never collide.
    const hasTimeline =
        !!message.timeline?.slots && message.timeline.slots.length > 0
    // The hero still keys off `dailyVerdict`, but the inline loader now waits
    // for the first streamed overview sentence/insight before clearing.
    const showVerdict = !!message.dailyVerdict && !hasTimeline
    const showOverviewLoader = message.isLoading && !hasOverviewContent
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
                        {(isNatalMode
                            ? TAB_ORDER_NATAL
                            : TAB_ORDER_DEFAULT
                        ).join(",")}
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
                                overviewReady={hasOverviewContent}
                                transitSourceMessage={message}
                            />
                        )}

                        {message.timeline &&
                            message.timeline.slots &&
                            message.timeline.slots.length > 0 && (
                                <PredictionTimeline
                                    timeline={message.timeline}
                                    isLoading={message.isLoading}
                                    privacyAliases={aliases}
                                />
                            )}

                        {!showVerdict && showOverviewLoader && (
                            <CosmicCenteredLoader
                                label={tChat("loading")}
                                variant='embedded'
                            />
                        )}

                        {!showVerdict && summary && (
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
                            {transitDatePickerNode && (
                                <div className='flex items-center gap-2'>
                                    <span className='text-[11px] uppercase tracking-[0.18em] text-white/55'>
                                        {tChat("transitDateLabel")}
                                    </span>
                                    {transitDatePickerNode}
                                </div>
                            )}
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
                    <div className='space-y-3'>
                        {transitDatePickerNode && (
                            <div className='flex items-center gap-2'>
                                <span className='text-[11px] uppercase tracking-[0.18em] text-white/55'>
                                    {tChat("transitDateLabel")}
                                </span>
                                {transitDatePickerNode}
                            </div>
                        )}
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
