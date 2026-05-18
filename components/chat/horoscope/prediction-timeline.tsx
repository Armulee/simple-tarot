"use client"

import { useMemo } from "react"
import {
    AlertTriangle,
    Clock,
    Hourglass,
    Moon,
    Shuffle,
    Sparkles,
    Sunrise,
    Target,
} from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { PrivacyHighlightedText } from "@/components/chat/privacy/privacy-highlighted-user-text"
import type {
    PredictionTimeline as PredictionTimelineData,
    PredictionTimelineSlot,
} from "@/components/chat/types"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"

type MoodStyle = {
    bar: string
    glow: string
    accent: string
    pillBg: string
    pillBorder: string
}

const MOOD_STYLES: Record<PredictionTimelineSlot["mood"], MoodStyle> = {
    good: {
        bar: "bg-gradient-to-b from-emerald-300/0 via-emerald-300/85 to-emerald-300/0",
        glow: "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(52,211,153,0.14),transparent_60%)]",
        accent: "text-emerald-200/90",
        pillBg: "bg-emerald-400/12",
        pillBorder: "border-emerald-300/40",
    },
    caution: {
        bar: "bg-gradient-to-b from-amber-300/0 via-amber-300/85 to-amber-300/0",
        glow: "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(252,211,77,0.15),transparent_60%)]",
        accent: "text-amber-200/90",
        pillBg: "bg-amber-400/12",
        pillBorder: "border-amber-300/40",
    },
    rest: {
        bar: "bg-gradient-to-b from-cyan-300/0 via-cyan-300/85 to-cyan-300/0",
        glow: "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(103,232,249,0.14),transparent_60%)]",
        accent: "text-cyan-200/90",
        pillBg: "bg-cyan-400/12",
        pillBorder: "border-cyan-300/35",
    },
    mixed: {
        bar: "bg-gradient-to-b from-indigo-300/0 via-indigo-300/85 to-indigo-300/0",
        glow: "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(129,140,248,0.14),transparent_60%)]",
        accent: "text-indigo-200/90",
        pillBg: "bg-indigo-400/12",
        pillBorder: "border-indigo-300/40",
    },
}

function MoodIcon({
    mood,
    className,
}: {
    mood: PredictionTimelineSlot["mood"]
    className?: string
}) {
    if (mood === "good") return <Sparkles className={className} />
    if (mood === "caution") return <AlertTriangle className={className} />
    if (mood === "rest") return <Moon className={className} />
    return <Shuffle className={className} />
}

function hourBucketKey(hour: number): string {
    if (hour < 5) return "lateNight"
    if (hour < 8) return "dawn"
    if (hour < 11) return "morning"
    if (hour < 14) return "midday"
    if (hour < 17) return "afternoon"
    if (hour < 20) return "evening"
    return "night"
}

function getHourFromSlotKey(slotKey: string): number | null {
    const match = slotKey.match(/^hour-(\d{1,2})$/)
    if (!match) return null
    const hour = Number(match[1])
    return Number.isFinite(hour) && hour >= 0 && hour < 24 ? hour : null
}

function getHourFromIso(iso: string): number | null {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return null
    return date.getUTCHours()
}

export default function PredictionTimeline({
    timeline,
    isLoading = false,
    privacyAliases,
}: {
    timeline: PredictionTimelineData
    isLoading?: boolean
    privacyAliases?: PromptAliasEntry[]
}) {
    const t = useTranslations("HoroscopeChat.timeline")
    const formatter = useFormatter()
    const aliases = privacyAliases ?? []

    const slots = timeline.slots ?? []
    const granularity = timeline.granularity

    const subtitle =
        granularity === "hourly" ? t("subtitleHourly") : t("subtitleDaily")
    const granularityLabel =
        granularity === "hourly"
            ? t("granularityHourly")
            : t("granularityDaily")

    const moodLabel = (mood: PredictionTimelineSlot["mood"]) => {
        if (mood === "good") return t("moodGood")
        if (mood === "caution") return t("moodCaution")
        if (mood === "rest") return t("moodRest")
        return t("moodMixed")
    }

    const formattedSlots = useMemo(() => {
        return slots.map((slot) => {
            let chip: string = slot.label
            let bucketKey: string | null = null
            if (granularity === "hourly") {
                const hour =
                    getHourFromSlotKey(slot.slotKey) ??
                    getHourFromIso(slot.datetimeIso)
                if (typeof hour === "number") {
                    bucketKey = hourBucketKey(hour)
                    const hourLabel = `${hour.toString().padStart(2, "0")}:00`
                    chip = `${t(`hourBuckets.${bucketKey}` as const)} · ${hourLabel}`
                }
            } else {
                try {
                    const date = new Date(`${slot.datetimeIso}T00:00:00Z`)
                    if (!Number.isNaN(date.getTime())) {
                        chip = formatter.dateTime(date, {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            timeZone: "UTC",
                        })
                    }
                } catch {
                    // fallback to provided label
                }
            }
            return { slot, chip, bucketKey }
        })
    }, [slots, granularity, t, formatter])

    if (!slots.length && !isLoading) return null

    return (
        <section className='relative overflow-hidden rounded-[26px] border border-indigo-300/20 bg-gradient-to-br from-indigo-500/[0.06] via-violet-500/[0.04] to-cyan-500/[0.05] px-4 py-5 shadow-[0_18px_48px_-26px_rgba(99,102,241,0.45)] sm:px-6 sm:py-6'>
            <div
                aria-hidden
                className='pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.22),transparent_70%)] blur-3xl'
            />
            <div className='relative flex items-start justify-between gap-3'>
                <div className='flex items-center gap-3'>
                    <span className='relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-indigo-300/35 bg-indigo-500/15 text-indigo-100 shadow-[0_0_18px_-4px_rgba(129,140,248,0.55)]'>
                        {granularity === "hourly" ? (
                            <Hourglass className='h-4 w-4' aria-hidden />
                        ) : (
                            <Sunrise className='h-4 w-4' aria-hidden />
                        )}
                    </span>
                    <div className='min-w-0'>
                        <h3 className='bg-gradient-to-r from-indigo-200 via-violet-200 to-cyan-200 bg-clip-text text-base font-semibold tracking-tight text-transparent'>
                            {t("title")}
                        </h3>
                        <p className='mt-0.5 text-[11px] uppercase tracking-[0.22em] text-white/45'>
                            {subtitle}
                        </p>
                    </div>
                </div>
                <span className='shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/65'>
                    {granularityLabel}
                </span>
            </div>

            <ol className='relative mt-5 list-none space-y-3 p-0 sm:space-y-4'>
                <span
                    aria-hidden
                    className='pointer-events-none absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-indigo-300/5 via-indigo-300/30 to-indigo-300/5 sm:left-[22px]'
                />
                {formattedSlots.map(({ slot, chip }, idx) => {
                    const style = MOOD_STYLES[slot.mood] ?? MOOD_STYLES.mixed
                    return (
                        <li
                            key={slot.slotKey || `${idx}-${slot.datetimeIso}`}
                            className='group relative pl-10 sm:pl-12 animate-fade-in'
                        >
                            <span
                                aria-hidden
                                className={`absolute left-0 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/35 backdrop-blur ${style.accent} sm:left-1 sm:h-10 sm:w-10`}
                            >
                                <MoodIcon
                                    mood={slot.mood}
                                    className='h-4 w-4'
                                />
                            </span>
                            <div className='relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-white/[0.01] px-4 py-4 shadow-[0_10px_36px_-22px_rgba(0,0,0,0.65)] transition duration-300 hover:border-indigo-300/30 hover:from-white/[0.07]'>
                                <span
                                    aria-hidden
                                    className={`pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-full ${style.bar}`}
                                />
                                <span
                                    aria-hidden
                                    className={`pointer-events-none absolute inset-0 opacity-90 transition-opacity duration-300 group-hover:opacity-100 ${style.glow}`}
                                />
                                <div className='relative flex flex-col gap-2'>
                                    <div className='flex flex-wrap items-center gap-2'>
                                        <span className='inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] font-medium tabular-nums text-white/75'>
                                            <Clock
                                                aria-hidden
                                                className='h-3 w-3 text-white/45'
                                            />
                                            {chip}
                                        </span>
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full border ${style.pillBorder} ${style.pillBg} px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${style.accent}`}
                                        >
                                            {moodLabel(slot.mood)}
                                        </span>
                                        {slot.focusArea && (
                                            <span className='inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/65'>
                                                <Target
                                                    aria-hidden
                                                    className='h-3 w-3 text-white/45'
                                                />
                                                {slot.focusArea}
                                            </span>
                                        )}
                                    </div>
                                    {slot.title && (
                                        <h4 className='text-base font-semibold leading-snug text-white'>
                                            <PrivacyHighlightedText
                                                text={slot.title}
                                                aliases={aliases}
                                                supportMarkdown
                                            />
                                        </h4>
                                    )}
                                    {slot.narrative && (
                                        <p className='text-sm leading-relaxed text-white/[0.82]'>
                                            <PrivacyHighlightedText
                                                text={slot.narrative}
                                                aliases={aliases}
                                                supportMarkdown
                                            />
                                        </p>
                                    )}
                                    {slot.tags && slot.tags.length > 0 && (
                                        <div className='mt-1 flex flex-wrap gap-1.5'>
                                            {slot.tags
                                                .slice(0, 3)
                                                .map((tag, tagIdx) => (
                                                    <span
                                                        key={`${slot.slotKey}-tag-${tagIdx}`}
                                                        className='inline-flex rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/60'
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </li>
                    )
                })}
            </ol>

            {isLoading && slots.length === 0 && (
                <div
                    className='mt-2 animate-pulse space-y-3'
                    aria-hidden
                >
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className='h-20 rounded-2xl border border-white/[0.06] bg-white/[0.03]'
                        />
                    ))}
                </div>
            )}
        </section>
    )
}
