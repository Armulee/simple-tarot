"use client"

import { type ReactNode, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import type { ChatMessage } from "@/components/chat/types"
import { resolveRelevanceColor } from "@/lib/horoscope/relevance-colors"
import { PrivacyHighlightedText } from "@/components/chat/privacy-highlighted-user-text"
import {
    unmaskTextWithAliases,
    type PromptAliasEntry,
} from "@/lib/privacy/prompt-redaction"
import {
    isSingleDayQuestionRange,
    readQuestionRangeFromChartData,
} from "@/lib/astrology/single-day"
import { InterpretationHeaderBar } from "./interpretation-header-bar"
import { RelevanceBreakdown } from "./relevance-breakdown"
import VerdictHero from "./horoscope/verdict-hero"
import TransitFeed from "./horoscope/transit-feed"

type HoroscopeTab = "overview" | "aspect" | "transit"

const TAB_ORDER: ReadonlyArray<HoroscopeTab> = [
    "overview",
    "aspect",
    "transit",
]

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
    aspectPanel,
    loadingNode,
    footerActions,
    onApplySuggestedQuestion,
    privacyAliases,
    hideFollowUpSuggestions = false,
}: {
    message: ChatMessage
    aspectPanel: ReactNode
    loadingNode?: ReactNode
    footerActions?: ReactNode
    onApplySuggestedQuestion: (question: string) => void
    /**
     * Session-scoped alias map used to resolve `[Person_0]`-style placeholders
     * to the user's original PII and render them as emerald lock chips.
     */
    privacyAliases?: PromptAliasEntry[]
    /** When true, follow-up chips are shown only in the composer. */
    hideFollowUpSuggestions?: boolean
}) {
    const [activeTab, setActiveTab] = useState<HoroscopeTab>("overview")
    const tTabs = useTranslations("HoroscopeChat.tabs")
    const tReading = useTranslations("ReadingPage.interpretation")

    const tabs = useMemo<Array<{ id: HoroscopeTab; label: string }>>(
        () => [
            { id: "overview", label: tTabs("overview") },
            { id: "aspect", label: tTabs("aspect") },
            { id: "transit", label: tTabs("transit") },
        ],
        [tTabs],
    )

    const summary = getOverviewSummary(message)
    const suggestions = Array.isArray(message.followUpSuggestions)
        ? message.followUpSuggestions
        : []
    const aliases = privacyAliases ?? []
    const relevanceStats = useMemo(
        () =>
            (message.relevance ?? [])
                .filter((s) => s && typeof s.pct === "number" && s.pct > 0)
                .map(({ label, pct }) => ({
                    label,
                    pct,
                    color: resolveRelevanceColor(label),
                })),
        [message.relevance],
    )

    const questionRange = useMemo(
        () => readQuestionRangeFromChartData(message.chartData),
        [message.chartData],
    )
    const isSingleDay = isSingleDayQuestionRange(questionRange)
    const showVerdict = isSingleDay && !!message.dailyVerdict
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
                                onClick={() => setActiveTab(tab.id)}
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
                    <span className='sr-only'>{TAB_ORDER.join(",")}</span>
                </div>

                <InterpretationHeaderBar />

                {activeTab === "overview" && (
                    <div className='space-y-6'>
                        {showVerdict && message.dailyVerdict && (
                            <VerdictHero
                                verdict={message.dailyVerdict}
                                dateIso={dateIso}
                                privacyAliases={aliases}
                            />
                        )}

                        {relevanceStats.length > 0 && (
                            <RelevanceBreakdown stats={relevanceStats} />
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

                        {!hideFollowUpSuggestions && suggestions.length > 0 && (
                            <div className='flex flex-wrap gap-2 border-t border-white/5 pt-4'>
                                {suggestions.map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type='button'
                                        onClick={() =>
                                            onApplySuggestedQuestion(
                                                unmaskTextWithAliases(
                                                    suggestion,
                                                    aliases,
                                                ),
                                            )
                                        }
                                        className='rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-left text-xs text-white/80 transition hover:bg-white/10 hover:text-white'
                                    >
                                        <PrivacyHighlightedText
                                            text={suggestion}
                                            aliases={aliases}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "aspect" && <div>{aspectPanel}</div>}

                {activeTab === "transit" && (
                    <div className='rounded-[16px] border border-white/10 bg-white/[0.04] p-5'>
                        {loadingNode ? (
                            loadingNode
                        ) : (
                            <TransitFeed
                                message={message}
                                privacyAliases={aliases}
                            />
                        )}
                        {footerActions ? (
                            <div className='mt-5 border-t border-white/10 pt-4'>
                                {footerActions}
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </section>
    )
}
