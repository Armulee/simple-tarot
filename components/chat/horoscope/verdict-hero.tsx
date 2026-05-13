"use client"

import { useMemo } from "react"
import { AlertTriangle, Moon, Sparkles, Target } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { PrivacyHighlightedText } from "@/components/chat/privacy-highlighted-user-text"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"

export type DailyVerdict = {
    mood: "good" | "caution" | "rest"
    headline: string
    subtext: string
    actions: string[]
    watchOut?: string
    focusArea?: string
}

type VerdictHeroProps = {
    verdict: DailyVerdict
    /** ISO date (yyyy-mm-dd) the verdict applies to. */
    dateIso?: string | null
    privacyAliases?: PromptAliasEntry[]
}

type MoodStyle = {
    /** Tailwind class fragment (no template literal interpolation) for the
     * mood ring + halo on the card border. */
    border: string
    /** Halo background gradient overlay. */
    halo: string
    /** Mood pill background. */
    pillBg: string
    /** Mood pill border. */
    pillBorder: string
    /** Text color for mood label & glyph. */
    accent: string
    /** Soft icon halo (drop-shadow). */
    iconShadow: string
    /** Divider gradient mid-color stop. */
    divider: string
    /** Bullet color for action rows. */
    bullet: string
}

const MOOD_STYLES: Record<DailyVerdict["mood"], MoodStyle> = {
    good: {
        border: "border-emerald-300/30",
        halo: "from-emerald-400/20 via-indigo-400/10 to-transparent",
        pillBg: "bg-emerald-400/15",
        pillBorder: "border-emerald-300/40",
        accent: "text-emerald-200",
        iconShadow: "drop-shadow-[0_0_18px_rgba(110,231,183,0.55)]",
        divider: "via-emerald-300/40",
        bullet: "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.7)]",
    },
    caution: {
        border: "border-amber-300/30",
        halo: "from-amber-400/20 via-rose-400/10 to-transparent",
        pillBg: "bg-amber-400/15",
        pillBorder: "border-amber-300/40",
        accent: "text-amber-200",
        iconShadow: "drop-shadow-[0_0_18px_rgba(252,211,77,0.55)]",
        divider: "via-amber-300/40",
        bullet: "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.7)]",
    },
    rest: {
        border: "border-cyan-300/25",
        halo: "from-cyan-400/15 via-slate-400/10 to-transparent",
        pillBg: "bg-cyan-400/12",
        pillBorder: "border-cyan-300/35",
        accent: "text-cyan-200",
        iconShadow: "drop-shadow-[0_0_18px_rgba(103,232,249,0.45)]",
        divider: "via-cyan-300/30",
        bullet: "bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.65)]",
    },
}

function MoodIcon({ mood, className }: { mood: DailyVerdict["mood"]; className?: string }) {
    if (mood === "good") return <Sparkles className={className} />
    if (mood === "caution") return <AlertTriangle className={className} />
    return <Moon className={className} />
}

/**
 * Deterministic pseudo-random so SSR and CSR agree, and the starfield doesn't
 * twitch on re-render. Seeded by the date + mood so each day looks unique.
 */
function buildStars(seed: string, count = 36) {
    let h = 0
    for (let i = 0; i < seed.length; i++) {
        h = (h * 31 + seed.charCodeAt(i)) >>> 0
    }
    const rand = () => {
        h = (h * 1664525 + 1013904223) >>> 0
        return h / 0xffffffff
    }
    return Array.from({ length: count }, (_, id) => ({
        id,
        x: rand() * 100,
        y: rand() * 100,
        s: rand() * 1.4 + 0.4,
        o: rand() * 0.45 + 0.18,
    }))
}

function Starfield({ seed }: { seed: string }) {
    const stars = useMemo(() => buildStars(seed), [seed])
    return (
        <div
            aria-hidden
            className='pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden'
        >
            {stars.map((s) => (
                <span
                    key={s.id}
                    className='absolute rounded-full bg-white'
                    style={{
                        left: `${s.x}%`,
                        top: `${s.y}%`,
                        width: `${s.s}px`,
                        height: `${s.s}px`,
                        opacity: s.o,
                    }}
                />
            ))}
        </div>
    )
}

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

    const starSeed = `${dateIso ?? "no-date"}::${verdict.mood}`
    const actions = (verdict.actions ?? []).filter((a) => a && a.trim().length > 0)

    return (
        <section
            className={`relative overflow-hidden rounded-[28px] border ${style.border} bg-gradient-to-br from-[#0d0d2b] via-[#0a0a20] to-[#06061a] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)] transition`}
        >
            <div
                aria-hidden
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${style.halo} opacity-90`}
            />
            <Starfield seed={starSeed} />

            <div className='relative z-[1] flex flex-col gap-6 px-6 pb-6 pt-8 md:px-8 md:pt-10'>
                {dateLabel && (
                    <p className='text-center text-[11px] uppercase tracking-[0.22em] text-white/45'>
                        {dateLabel}
                    </p>
                )}

                <div className='flex flex-col items-center gap-3 text-center'>
                    <MoodIcon
                        mood={verdict.mood}
                        className={`h-12 w-12 ${style.accent} ${style.iconShadow}`}
                    />
                    <span
                        className={`inline-flex items-center rounded-full border ${style.pillBorder} ${style.pillBg} px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${style.accent}`}
                    >
                        {moodLabel}
                    </span>
                    <h2 className='max-w-[28ch] text-balance text-[22px] font-semibold leading-[1.25] text-white md:text-[26px]'>
                        <PrivacyHighlightedText
                            text={verdict.headline}
                            aliases={aliases}
                            supportMarkdown
                        />
                    </h2>
                    {verdict.subtext && (
                        <p className='max-w-[36ch] text-sm leading-[1.65] text-white/60'>
                            <PrivacyHighlightedText
                                text={verdict.subtext}
                                aliases={aliases}
                                supportMarkdown
                            />
                        </p>
                    )}
                </div>

                {actions.length > 0 && (
                    <>
                        <div
                            aria-hidden
                            className={`h-px bg-gradient-to-r from-transparent ${style.divider} to-transparent`}
                        />
                        <div className='space-y-2'>
                            <p className='text-[10px] uppercase tracking-[0.22em] text-white/40'>
                                {t("actionsHeading")}
                            </p>
                            <ul className='space-y-2'>
                                {actions.map((action, idx) => (
                                    <li
                                        key={`${idx}-${action.slice(0, 16)}`}
                                        className='flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3'
                                    >
                                        <span
                                            aria-hidden
                                            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${style.bullet}`}
                                        />
                                        <span className='text-sm leading-[1.55] text-white/80'>
                                            <PrivacyHighlightedText
                                                text={action}
                                                aliases={aliases}
                                                supportMarkdown
                                            />
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}

                {verdict.watchOut && (
                    <div className='flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3'>
                        <AlertTriangle
                            aria-hidden
                            className='mt-0.5 h-4 w-4 shrink-0 text-amber-200/80'
                        />
                        <div className='space-y-0.5'>
                            <p className='text-[10px] uppercase tracking-[0.22em] text-white/40'>
                                {t("watchHeading")}
                            </p>
                            <p className='text-[13px] leading-[1.6] text-white/65'>
                                <PrivacyHighlightedText
                                    text={verdict.watchOut}
                                    aliases={aliases}
                                    supportMarkdown
                                />
                            </p>
                        </div>
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
