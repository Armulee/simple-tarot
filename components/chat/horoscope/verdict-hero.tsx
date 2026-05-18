"use client"

import { useMemo } from "react"
import { AlertTriangle, Moon, Sparkles, Target } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { PrivacyHighlightedText } from "@/components/chat/privacy/privacy-highlighted-user-text"
import { PrivacyDetailedHtml } from "@/components/chat/privacy/privacy-detailed-html"
import { InterpretationHeaderBar } from "@/components/chat/interpretation-header-bar"
import type { ChatMessage } from "@/components/chat/types"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"
import TransitFeed from "@/components/chat/horoscope/transit-feed"

export type DailyVerdict = {
    mood: "good" | "caution" | "rest"
    headline: string
    detailedHtml: string
    watchOut?: string
    focusArea?: string
    keyMessage?: {
        headline: string
        subtitle: string
    }
}

type VerdictHeroProps = {
    verdict: DailyVerdict
    /** ISO date (yyyy-mm-dd) the verdict applies to. */
    dateIso?: string | null
    privacyAliases?: PromptAliasEntry[]
    /** When true, compact interpretation actions stay hidden (same as tarot). */
    isLoading?: boolean
    /** Same message as the horoscope reading; powers the transit aspect list under the verdict. */
    transitSourceMessage: ChatMessage
}

type MoodStyle = {
    /** Mood pill background. */
    pillBg: string
    /** Mood pill border. */
    pillBorder: string
    /** Text color for mood label & glyph. */
    accent: string
    /** Soft icon halo (drop-shadow). */
    iconShadow: string
}

const MOOD_STYLES: Record<DailyVerdict["mood"], MoodStyle> = {
    good: {
        pillBg: "bg-emerald-400/15",
        pillBorder: "border-emerald-300/40",
        accent: "text-emerald-200",
        iconShadow: "drop-shadow-[0_0_18px_rgba(110,231,183,0.55)]",
    },
    caution: {
        pillBg: "bg-amber-400/15",
        pillBorder: "border-amber-300/40",
        accent: "text-amber-200",
        iconShadow: "drop-shadow-[0_0_18px_rgba(252,211,77,0.55)]",
    },
    rest: {
        pillBg: "bg-cyan-400/12",
        pillBorder: "border-cyan-300/35",
        accent: "text-cyan-200",
        iconShadow: "drop-shadow-[0_0_18px_rgba(103,232,249,0.45)]",
    },
}

function MoodIcon({
    mood,
    className,
}: {
    mood: DailyVerdict["mood"]
    className?: string
}) {
    if (mood === "good") return <Sparkles className={className} />
    if (mood === "caution") return <AlertTriangle className={className} />
    return <Moon className={className} />
}

/**
 * Deterministic pseudo-random so SSR and CSR agree, and the starfield doesn't
 * twitch on re-render. Seeded by the date + mood so each day looks unique.
 */
// function buildStars(seed: string, count = 36) {
//     let h = 0
//     for (let i = 0; i < seed.length; i++) {
//         h = (h * 31 + seed.charCodeAt(i)) >>> 0
//     }
//     const rand = () => {
//         h = (h * 1664525 + 1013904223) >>> 0
//         return h / 0xffffffff
//     }
//     return Array.from({ length: count }, (_, id) => ({
//         id,
//         x: rand() * 100,
//         y: rand() * 100,
//         s: rand() * 1.4 + 0.4,
//         o: rand() * 0.45 + 0.18,
//     }))
// }

// function Starfield({ seed }: { seed: string }) {
//     const stars = useMemo(() => buildStars(seed), [seed])
//     return (
//         <div
//             aria-hidden
//             className='pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden'
//         >
//             {stars.map((s) => (
//                 <span
//                     key={s.id}
//                     className='absolute rounded-full bg-white'
//                     style={{
//                         left: `${s.x}%`,
//                         top: `${s.y}%`,
//                         width: `${s.s}px`,
//                         height: `${s.s}px`,
//                         opacity: s.o,
//                     }}
//                 />
//             ))}
//         </div>
//     )
// }

function formatDateLabel(
    dateIso: string | null | undefined,
    formatDateTime: (date: Date) => string,
    relative: { today: string; tomorrow: string; yesterday: string },
): string | null {
    if (!dateIso) return null
    const target = new Date(`${dateIso}T00:00:00Z`)
    if (Number.isNaN(target.getTime())) return null

    const now = new Date()
    const startOfDay = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const localTarget = new Date(
        target.getUTCFullYear(),
        target.getUTCMonth(),
        target.getUTCDate(),
    )
    const dayDiff = Math.round(
        (startOfDay(localTarget) - startOfDay(now)) / (24 * 60 * 60 * 1000),
    )
    const formatted = formatDateTime(target)
    if (dayDiff === 0) return `${relative.today} · ${formatted}`
    if (dayDiff === 1) return `${relative.tomorrow} · ${formatted}`
    if (dayDiff === -1) return `${relative.yesterday} · ${formatted}`
    return formatted
}

export default function VerdictHero({
    verdict,
    dateIso,
    privacyAliases,
    isLoading = false,
    transitSourceMessage,
}: VerdictHeroProps) {
    const t = useTranslations("HoroscopeChat.verdict")
    const formatter = useFormatter()
    const style = MOOD_STYLES[verdict.mood]
    const aliases = privacyAliases ?? []

    const dateLabel = useMemo(
        () =>
            formatDateLabel(
                dateIso,
                (date) =>
                    formatter.dateTime(date, {
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                    }),
                {
                    today: t("dateRelativeToday"),
                    tomorrow: t("dateRelativeTomorrow"),
                    yesterday: t("dateRelativeYesterday"),
                },
            ),
        [dateIso, formatter, t],
    )

    const moodLabel =
        verdict.mood === "good"
            ? t("moodGood")
            : verdict.mood === "caution"
              ? t("moodCaution")
              : t("moodRest")

    const detailedHtml = (verdict.detailedHtml ?? "").trim()
    const keyMessageHeadline = (verdict.keyMessage?.headline ?? "").trim()
    const keyMessageSubtitle = (verdict.keyMessage?.subtitle ?? "").trim()
    const showTransitFeed = !isLoading
    const showReplyBubble =
        keyMessageHeadline.length > 0 ||
        detailedHtml.length > 0 ||
        showTransitFeed

    return (
        <section
            className={`relative overflow-hidden rounded-[28px] transition`}
        >
            <div className='relative z-[1] flex flex-col gap-6 py-6 md:px-8 md:pt-10'>
                <div className='flex flex-col items-center gap-3 text-center'>
                    <MoodIcon
                        mood={verdict.mood}
                        className={`h-12 w-12 mb-2 ${style.accent} ${style.iconShadow}`}
                    />
                    {dateLabel && (
                        <p className='text-center text-[11px] uppercase tracking-[0.22em] text-white/45'>
                            {dateLabel}
                        </p>
                    )}

                    <h2 className='max-w-[28ch] text-balance text-xl font-semibold leading-[1.25] text-white'>
                        <PrivacyHighlightedText
                            text={verdict.headline}
                            aliases={aliases}
                            supportMarkdown
                        />
                    </h2>

                    <div className='relative w-fit max-w-md rounded-xl border border-indigo-300/20 bg-gradient-to-br from-indigo-500/[0.08] via-purple-500/[0.06] to-cyan-500/[0.05] py-2.5 pr-4 pl-5 shadow-[0_8px_28px_-12px_rgba(129,140,248,0.55)] animate-fade-in before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-transparent before:via-[#a78bfa]/70 before:to-transparent'>
                        <p className='text-[11px] font-serif font-semibold italic uppercase leading-relaxed tracking-[0.18em] text-indigo-200/76'>
                            {moodLabel}
                        </p>
                    </div>
                </div>

                {showReplyBubble && (
                    <div className='w-full space-y-5 text-left text-white/90 leading-relaxed'>
                        <div className='w-full'>
                            <InterpretationHeaderBar isLoading={isLoading} />
                        </div>
                        {keyMessageHeadline.length > 0 && (
                            <div className='rounded-2xl border border-indigo-300/20 bg-indigo-400/[0.07] px-4 py-4 shadow-[0_8px_24px_-18px_rgba(129,140,248,0.75)] animate-fade-in'>
                                <h3 className='text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-snug'>
                                    <PrivacyHighlightedText
                                        text={keyMessageHeadline}
                                        aliases={aliases}
                                        supportMarkdown
                                    />
                                </h3>
                                {keyMessageSubtitle.length > 0 && (
                                    <p className='mt-2 text-sm sm:text-[15px] leading-6 text-white/65'>
                                        <PrivacyHighlightedText
                                            text={keyMessageSubtitle}
                                            aliases={aliases}
                                            supportMarkdown
                                        />
                                    </p>
                                )}
                            </div>
                        )}

                        {(detailedHtml.length > 0 || showTransitFeed) && (
                            <div className='rounded-2xl shadow-lg animate-fade-in text-white/90 leading-relaxed'>
                                {detailedHtml.length > 0 && (
                                    <PrivacyDetailedHtml
                                        html={detailedHtml}
                                        aliases={aliases}
                                        className='tarot-detailed-html'
                                    />
                                )}

                                {showTransitFeed && (
                                    <div
                                        className={
                                            detailedHtml.length > 0
                                                ? "mt-5"
                                                : ""
                                        }
                                    >
                                        <TransitFeed
                                            message={transitSourceMessage}
                                            privacyAliases={aliases}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {verdict.focusArea && (
                    <div className='flex items-center justify-center gap-2 pt-1'>
                        <Target
                            aria-hidden
                            className='h-3.5 w-3.5 text-white/40'
                        />
                        <span className='text-[11px] uppercase tracking-[0.18em] text-white/45'>
                            {t("focusHeading")}
                        </span>
                        <span
                            className={`inline-flex items-center rounded-full border ${style.pillBorder} ${style.pillBg} px-3 py-0.5 text-[11px] font-medium ${style.accent}`}
                        >
                            {verdict.focusArea}
                        </span>
                    </div>
                )}
            </div>
        </section>
    )
}
