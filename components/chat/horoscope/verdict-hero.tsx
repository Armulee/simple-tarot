"use client"

import { useMemo } from "react"
import Image from "next/image"
import { AlertTriangle, Moon, Sparkles, Target } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { PrivacyHighlightedText } from "@/components/chat/privacy/privacy-highlighted-user-text"
import { PrivacyDetailedHtml } from "@/components/chat/privacy/privacy-detailed-html"
import { InterpretationHeaderBar } from "@/components/chat/interpretation-header-bar"
import type {
    ChatMessage,
    NatalRelevantPlanet,
} from "@/components/chat/types"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"
import { getPlanetImageSrc } from "@/lib/astrology/planet-images"
import { getPlanetDignity } from "@/lib/birth-chart-utils"
import TransitFeed from "@/components/chat/horoscope/transit-feed"
import NatalPlanetSpotlight from "@/components/chat/horoscope/natal-planet-spotlight"

type NatalPlacementForHero = {
    planet: string
    sign?: string
    degree?: number
    retrograde?: boolean
}

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
    mode?: "daily" | "natal"
    relevantPlanets?: NatalRelevantPlanet[]
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

const ZODIAC_CANONICAL: ReadonlyArray<string> = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
]

const ZODIAC_ALIAS: Record<string, string> = {
    เมษ: "Aries",
    พฤษภ: "Taurus",
    มิถุน: "Gemini",
    กรกฎ: "Cancer",
    สิงห์: "Leo",
    กันย์: "Virgo",
    ตุลย์: "Libra",
    พิจิก: "Scorpio",
    ธนู: "Sagittarius",
    มกร: "Capricorn",
    กุมภ์: "Aquarius",
    มีน: "Pisces",
}

function canonicalSign(sign: string): string {
    if (ZODIAC_CANONICAL.includes(sign)) return sign
    return ZODIAC_ALIAS[sign] ?? sign
}

/**
 * Looks up the natal placement (sign / degree / retrograde) for each
 * planet returned by the natal verdict, by reading from
 * `chartData.charts[0].planets`. Returns the entries in the same order the
 * model picked them so the most-relevant placement renders first.
 */
function resolveHeroPlacements(
    chartData: Record<string, unknown> | null | undefined,
    relevantPlanets: NatalRelevantPlanet[],
): NatalPlacementForHero[] {
    if (!relevantPlanets.length) return []
    const data = (chartData ?? null) as
        | {
              charts?: Array<{
                  planets?: Record<
                      string,
                      {
                          sign?: string
                          degree?: number
                          retrograde?: boolean
                      }
                  >
              }>
          }
        | null
    const planets = data?.charts?.[0]?.planets ?? {}
    return relevantPlanets.map((rp) => {
        const point = planets[rp.planet]
        return {
            planet: rp.planet,
            sign: point?.sign,
            degree: typeof point?.degree === "number" ? point.degree : undefined,
            retrograde: !!point?.retrograde,
        }
    })
}

/**
 * Replaces the mood icon at the top of the verdict hero for natal-mode
 * answers. Renders a cluster of planet portraits + compact placement chip
 * ("Sun · Leo 12.3°") for the planets the AI cited in `relevantPlanets`.
 * Falls back to nothing when no placements resolve so the caller can keep
 * the mood-icon path.
 */
function NatalHeroCrest({
    placements,
    moodShadow,
}: {
    placements: NatalPlacementForHero[]
    moodShadow: string
}) {
    const tAstro = useTranslations("BirthChart")
    if (placements.length === 0) return null

    const visible = placements.slice(0, 4)
    const single = visible.length === 1
    const imageSize = single ? 72 : visible.length === 2 ? 60 : 52

    return (
        <div className='flex flex-col items-center gap-3'>
            <ul
                className={`relative flex items-end justify-center gap-3 list-none p-0 m-0 ${
                    single ? "" : "sm:gap-4"
                }`}
            >
                {visible.map(({ planet, retrograde }) => {
                    const planetName = tAstro(`planets.${planet}`, {
                        defaultValue: planet,
                    })
                    const src = getPlanetImageSrc(planet)
                    return (
                        <li
                            key={planet}
                            className='relative flex shrink-0 items-center justify-center'
                            style={{ width: imageSize, height: imageSize }}
                        >
                            {src ? (
                                <Image
                                    src={src}
                                    alt={planetName}
                                    width={imageSize}
                                    height={imageSize}
                                    className={`h-full w-full rounded-full object-cover ring-1 ring-white/15 ${moodShadow} ${
                                        planet === "Ketu" ? "rotate-90" : ""
                                    }`}
                                />
                            ) : (
                                <span
                                    className={`flex h-full w-full items-center justify-center rounded-full bg-white/[0.06] text-[12px] font-semibold uppercase tracking-wider text-white/75 ring-1 ring-white/15 ${moodShadow}`}
                                >
                                    {planet.slice(0, 2)}
                                </span>
                            )}
                            {retrograde && (
                                <span
                                    aria-label='retrograde'
                                    className='absolute -bottom-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full border border-rose-300/40 bg-rose-500/20 px-1 text-[10px] font-semibold text-rose-100 shadow-[0_0_10px_-2px_rgba(244,114,182,0.45)]'
                                >
                                    ℞
                                </span>
                            )}
                        </li>
                    )
                })}
            </ul>
            <ul className='flex flex-wrap items-center justify-center gap-1.5 list-none p-0 m-0'>
                {visible.map(({ planet, sign, degree }) => {
                    const planetName = tAstro(`planets.${planet}`, {
                        defaultValue: planet,
                    })
                    const canonical = sign ? canonicalSign(sign) : null
                    const signName = canonical
                        ? tAstro(`zodiacSigns.${canonical}`, {
                              defaultValue: sign ?? "",
                          })
                        : null
                    const dignity = canonical
                        ? getPlanetDignity(planet, canonical)
                        : null
                    const dignityChipClasses = dignity?.isExalted
                        ? "border-amber-300/40 bg-amber-400/10 text-amber-100"
                        : dignity?.isOwnSign
                          ? "border-sky-300/40 bg-sky-400/10 text-sky-100"
                          : dignity?.isDebilitated
                            ? "border-red-300/40 bg-red-400/10 text-red-100"
                            : "border-white/10 bg-white/[0.05] text-white/80"
                    return (
                        <li
                            key={planet}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${dignityChipClasses}`}
                        >
                            <span className='font-semibold tracking-tight'>
                                {planetName}
                            </span>
                            {signName && (
                                <>
                                    <span className='text-white/30'>·</span>
                                    <span className='text-white/85'>
                                        {signName}
                                    </span>
                                </>
                            )}
                            {typeof degree === "number" &&
                                Number.isFinite(degree) && (
                                    <span className='font-mono tabular-nums text-white/65'>
                                        {degree.toFixed(1)}°
                                    </span>
                                )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
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

    // Natal-mode verdicts answer questions like "Which career fits me?" —
    // they are timeless, so we deliberately suppress the date pill that
    // would otherwise read "Today · 18 May" and imply this is a daily
    // forecast.
    const dateLabel = useMemo(() => {
        if (verdict.mode === "natal") return null
        return formatDateLabel(
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
        )
    }, [dateIso, formatter, t, verdict.mode])

    const moodLabel =
        verdict.mood === "good"
            ? t("moodGood")
            : verdict.mood === "caution"
              ? t("moodCaution")
              : t("moodRest")

    const detailedHtml = (verdict.detailedHtml ?? "").trim()
    const keyMessageHeadline = (verdict.keyMessage?.headline ?? "").trim()
    const keyMessageSubtitle = (verdict.keyMessage?.subtitle ?? "").trim()
    const isNatalMode = verdict.mode === "natal"
    const relevantPlanets = useMemo<NatalRelevantPlanet[]>(
        () => (isNatalMode ? verdict.relevantPlanets ?? [] : []),
        [isNatalMode, verdict.relevantPlanets],
    )
    const hasRelevantPlanets = relevantPlanets.length > 0
    const heroPlacements = useMemo(
        () =>
            isNatalMode
                ? resolveHeroPlacements(
                      transitSourceMessage.chartData,
                      relevantPlanets,
                  )
                : [],
        [isNatalMode, relevantPlanets, transitSourceMessage.chartData],
    )
    const showNatalHeroCrest = isNatalMode && heroPlacements.length > 0
    // Daily verdicts hang their visual under the detailed HTML (the transit
    // feed). Natal verdicts use the relevant-planets spotlight instead. We
    // never show both at the same time.
    const showTransitFeed = !isLoading && !isNatalMode
    const showNatalSpotlight = !isLoading && isNatalMode && hasRelevantPlanets
    const showReplyBubble =
        keyMessageHeadline.length > 0 ||
        detailedHtml.length > 0 ||
        showTransitFeed ||
        showNatalSpotlight

    return (
        <section
            className={`relative overflow-hidden rounded-[28px] transition`}
        >
            <div className='relative z-[1] flex flex-col gap-6 py-6 md:px-8 md:pt-10'>
                <div className='flex flex-col items-center gap-3 text-center'>
                    {showNatalHeroCrest ? (
                        <div className='mb-2'>
                            <NatalHeroCrest
                                placements={heroPlacements}
                                moodShadow={style.iconShadow}
                            />
                        </div>
                    ) : (
                        <MoodIcon
                            mood={verdict.mood}
                            className={`h-12 w-12 mb-2 ${style.accent} ${style.iconShadow}`}
                        />
                    )}
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

                        {(detailedHtml.length > 0 ||
                            showTransitFeed ||
                            showNatalSpotlight) && (
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

                                {showNatalSpotlight && (
                                    <div
                                        className={
                                            detailedHtml.length > 0
                                                ? "mt-5"
                                                : ""
                                        }
                                    >
                                        <NatalPlanetSpotlight
                                            chartData={
                                                transitSourceMessage.chartData
                                            }
                                            relevantPlanets={relevantPlanets}
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
