"use client"

import { type ReactNode, useMemo, useState } from "react"
import { AlertTriangle, HeartPulse, Sparkles } from "lucide-react"
import type { ChatMessage } from "@/components/chat/types"

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

function renderInlineBoldMarkdown(text: string): ReactNode[] {
    if (!text.includes("**")) return [text]

    const nodes: ReactNode[] = []
    let cursor = 0
    let key = 0

    while (cursor < text.length) {
        const open = text.indexOf("**", cursor)
        if (open === -1) {
            nodes.push(text.slice(cursor))
            break
        }

        const close = text.indexOf("**", open + 2)
        if (close === -1) {
            nodes.push(text.slice(cursor))
            break
        }

        if (open > cursor) nodes.push(text.slice(cursor, open))
        const boldText = text.slice(open + 2, close)
        nodes.push(<strong key={`bold-${key++}`}>{boldText}</strong>)
        cursor = close + 2
    }

    return nodes
}

function splitSentences(text: string): string[] {
    const normalized = stripMarkdownFormatting(text).replace(/\s+/g, " ").trim()
    if (!normalized) return []
    return (normalized.match(/[^.!?\n]+(?:[.!?]+|$)/g) ?? [normalized])
        .map((sentence) => sentence.trim())
        .filter(Boolean)
}

function formatBirthDate(message: ChatMessage): string {
    const birth = message.horoscopeBirthData
    if (!birth?.day || !birth.month || !birth.year) return "-"
    return `${String(birth.day).padStart(2, "0")}/${String(birth.month).padStart(2, "0")}/${birth.year}`
}

function getRating(message: ChatMessage): string {
    const insights = message.aspectInsights ?? []
    const high = insights.filter((item) => item.intensity === "high").length
    const medium = insights.filter((item) => item.intensity === "medium").length
    if (high >= 2) return "★★★★★"
    if (high >= 1 || medium >= 2) return "★★★★☆"
    return "★★★☆☆"
}

function getOverviewSummary(message: ChatMessage): string {
    const firstInsight = message.aspectInsights?.find((item) =>
        item.insight?.trim(),
    )?.insight
    if (firstInsight) return firstInsight
    return splitSentences(message.text || "")[0] || "ภาพรวมพลังงานช่วงนี้กำลังเปิดให้สังเกตจังหวะสำคัญของตัวเอง"
}

function getDomainPills(message: ChatMessage) {
    const seen = new Set<string>()
    return (message.aspectInsights ?? [])
        .filter((item) => item.impact?.trim())
        .map((item) => ({
            domain: item.impact!.trim(),
            intensity: item.intensity ?? "low",
        }))
        .filter((item) => {
            const key = item.domain.toLowerCase()
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })
        .slice(0, 5)
}

function getIntensityLabel(intensity: "low" | "medium" | "high") {
    if (intensity === "high") return "สูง"
    if (intensity === "medium") return "ปานกลาง"
    return "ต่ำ"
}

function getIntensityColor(intensity: "low" | "medium" | "high") {
    if (intensity === "high") return "#E8604C"
    if (intensity === "medium") return "#E8A84C"
    return "#4CC9A4"
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
}: {
    message: ChatMessage
    aspectPanel: ReactNode
    loadingNode?: ReactNode
    footerActions?: ReactNode
    onApplySuggestedQuestion: (question: string) => void
}) {
    const [activeTab, setActiveTab] = useState<HoroscopeTab>("overview")
    const summary = getOverviewSummary(message)
    const domainPills = getDomainPills(message)
    const timelineChunks = useMemo(
        () => buildTimelineChunks(message.text || ""),
        [message.text],
    )
    const suggestions = Array.isArray(message.followUpSuggestions)
        ? message.followUpSuggestions
        : []

    return (
        <section className='relative overflow-hidden rounded-[16px] border border-white/10 bg-[#08080F] p-3 shadow-[0_18px_60px_-34px_rgba(99,102,241,0.85)]'>
            <div className='pointer-events-none absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_18%_12%,rgba(139,92,246,0.22),transparent_30%),radial-gradient(circle_at_84%_4%,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_50%_110%,rgba(232,168,76,0.10),transparent_35%)]' />
            <div className='pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:26px_26px]' />
            <div className='relative space-y-4'>
                <div className='grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-md'>
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type='button'
                            onClick={() => setActiveTab(tab.id)}
                            className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                                activeTab === tab.id
                                    ? "bg-white/12 text-white shadow-[0_0_24px_-10px_rgba(255,255,255,0.85)]"
                                    : "text-white/55 hover:bg-white/[0.06] hover:text-white/85"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === "overview" && (
                    <div className='space-y-4'>
                        <div className='rounded-[16px] border border-white/10 bg-[linear-gradient(135deg,rgba(99,102,241,0.26),rgba(34,211,238,0.12)_50%,rgba(232,168,76,0.14))] p-5'>
                            <div className='mb-4 flex items-start justify-between gap-3'>
                                <div>
                                    <p className='text-[11px] uppercase tracking-[0.24em] text-white/50'>
                                        ภาพรวมดวง
                                    </p>
                                    <p className='mt-1 text-lg font-semibold text-white'>
                                        {getRating(message)}
                                    </p>
                                </div>
                                <div className='rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70'>
                                    {formatBirthDate(message)}
                                </div>
                            </div>
                            <p className='text-sm leading-7 text-white/88'>
                                {summary}
                            </p>
                        </div>

                        {domainPills.length > 0 && (
                            <div className='flex flex-wrap gap-2'>
                                {domainPills.map((pill) => (
                                    <span
                                        key={pill.domain}
                                        className='inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/78'
                                    >
                                        <span>{pill.domain}</span>
                                        <span
                                            className='h-1.5 w-1.5 rounded-full'
                                            style={{
                                                backgroundColor:
                                                    getIntensityColor(
                                                        pill.intensity,
                                                    ),
                                            }}
                                        />
                                        <span className='text-white/55'>
                                            {getIntensityLabel(pill.intensity)}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        )}

                        {suggestions.length > 0 && (
                            <div className='space-y-2'>
                                <p className='text-[11px] uppercase tracking-[0.22em] text-white/45'>
                                    คำถามต่อยอด
                                </p>
                                <div className='flex flex-wrap gap-2'>
                                    {suggestions.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type='button'
                                            onClick={() =>
                                                onApplySuggestedQuestion(
                                                    suggestion,
                                                )
                                            }
                                            className='rounded-full border border-cyan-300/15 bg-cyan-300/[0.07] px-3 py-1.5 text-left text-xs text-cyan-50/85 transition hover:border-cyan-200/30 hover:bg-cyan-300/[0.12]'
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
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
                                    <div
                                        key={chunk.theme}
                                        className='relative'
                                    >
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
                                                {renderInlineBoldMarkdown(
                                                    chunk.body,
                                                )}
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
