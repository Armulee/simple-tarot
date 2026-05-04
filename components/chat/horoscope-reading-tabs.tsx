"use client"

import { type ReactNode, useMemo, useState } from "react"
import { AlertTriangle, HeartPulse, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ChatMessage } from "@/components/chat/types"
import { resolveRelevanceColor } from "@/lib/horoscope/relevance-colors"
import { PrivacyHighlightedText } from "@/components/chat/privacy-highlighted-user-text"
import {
    unmaskTextWithAliases,
    type PromptAliasEntry,
} from "@/lib/privacy/prompt-redaction"
import { InterpretationHeaderBar } from "./interpretation-header-bar"
import { RelevanceBreakdown } from "./relevance-breakdown"

type HoroscopeTab = "overview" | "aspects" | "interpretation"

type TimelineChunk = {
    label: string
    theme: string
    icon: ReactNode
    color: string
    body: string
}

const TABS: Array<{ id: HoroscopeTab; label: string }> = [
    { id: "overview", label: "ภาพรวม" },
    { id: "aspects", label: "แอสเปกต์" },
    { id: "interpretation", label: "คำทำนาย" },
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
    return (
        splitSentences(message.text || "")[0] ||
        "ภาพรวมพลังงานช่วงนี้กำลังเปิดให้สังเกตจังหวะสำคัญของตัวเอง"
    )
}

function buildTimelineChunks(text: string): TimelineChunk[] {
    const sentences = splitSentences(text)
    const chunkSize = Math.max(1, Math.ceil(sentences.length / 3))
    const groups = [
        sentences.slice(0, chunkSize),
        sentences.slice(chunkSize, chunkSize * 2),
        sentences.slice(chunkSize * 2),
    ]
    const fallback = [
        "ช่วงแรกเป็นจังหวะที่ประตูบางอย่างเริ่มเปิด ให้เลือกสิ่งที่สอดคล้องกับเป้าหมายจริง",
        "ช่วงถัดมาต้องใช้ความรอบคอบ ตรวจรายละเอียดและอย่าตัดสินใจจากแรงกดดันชั่วคราว",
        "ช่วงท้ายอารมณ์อาจแกว่งง่ายขึ้น ให้พักใจและสื่อสารอย่างนุ่มนวลกับตัวเอง",
    ]
    const configs = [
        {
            label: "28 เม.ย. – 29 พ.ค.",
            theme: "โอกาสเปิด",
            icon: <Sparkles className='h-4 w-4' />,
            color: "#4CC985",
        },
        {
            label: "30 พ.ค. – 12 มิ.ย.",
            theme: "ต้องรอบคอบ",
            icon: <AlertTriangle className='h-4 w-4' />,
            color: "#E8A84C",
        },
        {
            label: "13 มิ.ย. – 28 มิ.ย.",
            theme: "อารมณ์ผันผวน",
            icon: <HeartPulse className='h-4 w-4' />,
            color: "#43C6C6",
        },
    ]

    return configs.map((config, index) => ({
        ...config,
        body: groups[index]?.join(" ") || fallback[index],
    }))
}

export default function HoroscopeReadingTabs({
    message,
    aspectPanel,
    loadingNode,
    footerActions,
    onApplySuggestedQuestion,
    privacyAliases,
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
}) {
    const [activeTab, setActiveTab] = useState<HoroscopeTab>("overview")
    const tReading = useTranslations("ReadingPage.interpretation")
    const summary = getOverviewSummary(message)
    const timelineChunks = useMemo(
        () => buildTimelineChunks(message.text || ""),
        [message.text],
    )
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

    return (
        <section className='relative overflow-hidden'>
            <div className='space-y-6'>
                <div className='relative flex gap-2 overflow-x-auto pb-1'>
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type='button'
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative shrink-0 overflow-hidden rounded-full border px-4 py-2 text-sm font-medium transition duration-300 ${
                                activeTab === tab.id
                                    ? "border-blue-400/40 text-white shadow-[0_10px_30px_-10px_rgba(96,165,250,0.38)] backdrop-blur-xl ring-1 ring-blue-400/25"
                                    : "border-blue-400/15 text-white/55 hover:border-blue-400/30 hover:bg-white/[0.06] hover:text-white/85"
                            }`}
                        >
                            {activeTab === tab.id && (
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
                            <span className='relative z-10'>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <InterpretationHeaderBar />

                {activeTab === "overview" && (
                    <div className='space-y-6'>
                        {relevanceStats.length > 0 && (
                            <RelevanceBreakdown stats={relevanceStats} />
                        )}

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

                        {suggestions.length > 0 && (
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

                {activeTab === "aspects" && <div>{aspectPanel}</div>}

                {activeTab === "interpretation" && (
                    <div className='rounded-[16px] border border-white/10 bg-white/[0.04] p-5'>
                        {loadingNode ? (
                            loadingNode
                        ) : (
                            <div className='relative space-y-5 pl-7'>
                                <div className='absolute left-[13px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-300/70 via-amber-300/55 to-cyan-300/65' />
                                {timelineChunks.map((chunk) => (
                                    <div key={chunk.theme} className='relative'>
                                        <span
                                            className='absolute -left-[25px] top-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#08080F] shadow-[0_0_22px_-6px_currentColor]'
                                            style={{ color: chunk.color }}
                                        >
                                            {chunk.icon}
                                        </span>
                                        <div className='rounded-[16px] border border-white/10 bg-black/15 p-4'>
                                            <div className='mb-2 flex flex-wrap items-center gap-2'>
                                                <span
                                                    className='h-2 w-2 rounded-full'
                                                    style={{
                                                        backgroundColor:
                                                            chunk.color,
                                                    }}
                                                />
                                                <span className='text-xs text-white/45'>
                                                    {chunk.label}
                                                </span>
                                                <span className='text-sm font-semibold text-white'>
                                                    {chunk.theme}
                                                </span>
                                            </div>
                                            <p className='text-sm leading-7 text-white/82'>
                                                <PrivacyHighlightedText
                                                    text={chunk.body}
                                                    aliases={
                                                        privacyAliases ?? []
                                                    }
                                                    supportMarkdown
                                                />
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
