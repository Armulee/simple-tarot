"use client"

import { useMemo } from "react"
import Image from "next/image"
import { AlertTriangle, Moon, Sparkles, Target } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import CosmicCenteredLoader from "@/components/cosmic-centered-loader"
import { PrivacyHighlightedText } from "@/components/chat/privacy/privacy-highlighted-user-text"
import { PrivacyDetailedHtml } from "@/components/chat/privacy/privacy-detailed-html"
import { InterpretationHeaderBar } from "@/components/chat/interpretation-header-bar"
import type {
    ChatMessage,
    NatalRelevantPlanet,
} from "@/components/chat/types"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"
import { getPlanetImageSrc } from "@/lib/astrology/planet-images"
import { classifyQuestionTopic } from "@/lib/astrology/question-intent"
import { getPlanetDignity } from "@/lib/birth-chart-utils"
import TransitFeed from "@/components/chat/horoscope/transit-feed"
import NatalPlanetSpotlight from "@/components/chat/horoscope/natal-planet-spotlight"
import TransitOrbitVisual from "@/components/chat/horoscope/transit-orbit-visual"

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
    moodSubtitle?: string
    keyMessage?: {
        headline: string
        subtitle: string
    }
    mode?: "daily" | "natal" | "timing" | "technical"
    relevantPlanets?: NatalRelevantPlanet[]
    timingWindow?: {
        startDateIso: string
        endDateIso: string
    }
}

type VerdictHeroProps = {
    verdict: DailyVerdict
    /** ISO date (yyyy-mm-dd) the verdict applies to. */
    dateIso?: string | null
    privacyAliases?: PromptAliasEntry[]
    /** When true, compact interpretation actions stay hidden (same as tarot). */
    isLoading?: boolean
    /** True once the first overview sentence or aspect insight has streamed in. */
    overviewReady?: boolean
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
 * Hero crest for timing-mode verdicts ("when will X happen?"). Renders the
 * AI-picked date range (or single date) in the same vertical footprint the
 * mood icon would have occupied. Uses the user's locale to format month
 * names, falls back to numeric `YYYY-MM-DD` for unsupported locales.
 */
function TimingHeroCrest({
    window,
    accentClass,
    moodShadow,
}: {
    window: { startDateIso: string; endDateIso: string }
    accentClass: string
    moodShadow: string
}) {
    const formatter = useFormatter()
    const sameDay = window.startDateIso === window.endDateIso

    const safeDate = (iso: string) => {
        const parsed = new Date(`${iso}T00:00:00Z`)
        if (Number.isNaN(parsed.getTime())) return null
        return parsed
    }

    const start = safeDate(window.startDateIso)
    const end = safeDate(window.endDateIso)
    if (!start) return null

    const startDay = formatter.dateTime(start, {
        day: "numeric",
        timeZone: "UTC",
    })
    const endDay =
        end && !sameDay
            ? formatter.dateTime(end, {
                  day: "numeric",
                  timeZone: "UTC",
              })
            : null
    const startMonth = formatter
        .dateTime(start, { month: "short", timeZone: "UTC" })
        .toUpperCase()
    const endMonth =
        end && !sameDay
            ? formatter
                  .dateTime(end, { month: "short", timeZone: "UTC" })
                  .toUpperCase()
            : null
    const year = formatter.dateTime(start, {
        year: "numeric",
        timeZone: "UTC",
    })
    const endYear =
        end && !sameDay
            ? formatter.dateTime(end, { year: "numeric", timeZone: "UTC" })
            : year

    const sameMonth = startMonth === endMonth
    const sameYear = year === endYear

    let primaryLine: string
    if (sameDay) {
        primaryLine = `${startDay} ${startMonth}`
    } else if (sameMonth) {
        primaryLine = `${startDay}–${endDay} ${startMonth}`
    } else {
        primaryLine = `${startDay} ${startMonth} – ${endDay} ${endMonth}`
    }
    const secondaryLine = sameYear ? year : `${year} – ${endYear}`

    return (
        <div className='flex flex-col items-center justify-center text-center mb-2'>
            <span
                aria-hidden
                className='pointer-events-none absolute inset-x-0 -top-2 mx-auto h-24 w-[16rem] rounded-full bg-[radial-gradient(60%_60%_at_50%_50%,rgba(129,140,248,0.22),transparent_70%)] blur-2xl'
            />
            <p
                className={`relative font-serif italic text-3xl sm:text-4xl leading-none tracking-tight ${accentClass} ${moodShadow}`}
            >
                {primaryLine}
            </p>
            <p className='relative mt-1.5 text-[11px] font-medium uppercase tracking-[0.32em] text-white/55'>
                {secondaryLine}
            </p>
        </div>
    )
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
    options?: { source?: "natal" | "transit" },
): NatalPlacementForHero[] {
    if (!relevantPlanets.length) return []
    const source = options?.source ?? "natal"
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
              transit?: {
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
              } | null
          }
        | null
    const planets =
        source === "transit"
            ? data?.transit?.charts?.[0]?.planets ?? {}
            : data?.charts?.[0]?.planets ?? {}
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
 * answers. Renders a refined planetary crest: a soft cosmic backdrop, an
 * eyebrow ribbon, and one vertical "portrait" per relevant planet —
 * planet image on top, planet name directly under it, and the sign + degree
 * on a separate line below. Falls back to nothing when no placements resolve
 * so the caller can keep the mood-icon path.
 */
function NatalHeroCrest({
    placements,
    moodShadow,
    source = "natal",
}: {
    placements: NatalPlacementForHero[]
    moodShadow: string
    /** Which chart the placements were resolved from — drives the eyebrow label. */
    source?: "natal" | "transit"
}) {
    const tAstro = useTranslations("BirthChart")
    const tCrest = useTranslations("HoroscopeChat.natalSpotlight")
    if (placements.length === 0) return null

    const visible = placements.slice(0, 4)
    const single = visible.length === 1
    const imageSize = single ? 96 : visible.length === 2 ? 80 : 68

    return (
        <div className='relative w-full max-w-xl mx-auto px-2 sm:px-4'>
            {/* Cosmic backdrop — a soft, layered halo so the planet portraits
                feel like they're floating in front of a small sky rather
                than against the flat hero panel. */}
            <div
                aria-hidden
                className='pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto h-44 w-full max-w-md rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_50%,rgba(129,140,248,0.22),rgba(168,85,247,0.10)_45%,rgba(34,211,238,0.06)_70%,transparent_85%)] blur-2xl'
            />
            <div
                aria-hidden
                className='pointer-events-none absolute inset-0 mx-auto h-full w-full bg-[radial-gradient(80%_60%_at_50%_30%,rgba(255,255,255,0.05),transparent_65%)]'
            />

            <div className='relative flex flex-col items-center gap-5'>
                {/* Refined eyebrow ribbon, mirroring the gilded look of the
                    birth-chart page. */}
                <div className='inline-flex items-center justify-center gap-3'>
                    <span className='h-px w-8 bg-gradient-to-r from-transparent to-amber-300/70' />
                    <Sparkles
                        aria-hidden
                        className='h-3 w-3 text-amber-200/85'
                    />
                    <p className='text-[10px] font-medium uppercase tracking-[0.32em] text-amber-200/80'>
                        {source === "transit"
                            ? tCrest("titleTransit")
                            : tCrest("title")}
                    </p>
                    <Sparkles
                        aria-hidden
                        className='h-3 w-3 text-amber-200/85'
                    />
                    <span className='h-px w-8 bg-gradient-to-l from-transparent to-amber-300/70' />
                </div>

                <ul
                    className={`relative flex flex-wrap items-start justify-center gap-x-4 gap-y-5 list-none p-0 m-0 ${
                        single ? "" : "sm:gap-x-6"
                    }`}
                >
                    {visible.map(({ planet, sign, degree, retrograde }) => {
                        const planetName = tAstro(`planets.${planet}`, {
                            defaultValue: planet,
                        })
                        const src = getPlanetImageSrc(planet)
                        const canonical = sign ? canonicalSign(sign) : null
                        const signName = canonical
                            ? tAstro(`zodiacSigns.${canonical}`, {
                                  defaultValue: sign ?? "",
                              })
                            : null
                        const dignity = canonical
                            ? getPlanetDignity(planet, canonical)
                            : null
                        const dignityNameClass = dignity?.isExalted
                            ? "text-amber-200"
                            : dignity?.isOwnSign
                              ? "text-sky-200"
                              : dignity?.isDebilitated
                                ? "text-rose-200"
                                : "text-white"
                        const ringClass = dignity?.isExalted
                            ? "ring-amber-300/60"
                            : dignity?.isOwnSign
                              ? "ring-sky-300/60"
                              : dignity?.isDebilitated
                                ? "ring-rose-300/55"
                                : "ring-white/20"
                        const haloClass = dignity?.isExalted
                            ? "bg-amber-300/15"
                            : dignity?.isOwnSign
                              ? "bg-sky-300/12"
                              : dignity?.isDebilitated
                                ? "bg-rose-300/12"
                                : "bg-indigo-300/10"

                        return (
                            <li
                                key={planet}
                                className='flex w-[110px] shrink-0 flex-col items-center text-center'
                            >
                                <div
                                    className='relative flex items-center justify-center'
                                    style={{
                                        width: imageSize,
                                        height: imageSize,
                                    }}
                                >
                                    <span
                                        aria-hidden
                                        className={`pointer-events-none absolute inset-[-22%] rounded-full blur-2xl ${haloClass}`}
                                    />
                                    <span
                                        aria-hidden
                                        className={`pointer-events-none absolute inset-[-6%] rounded-full ring-1 ${ringClass} opacity-70`}
                                    />
                                    {src ? (
                                        <Image
                                            src={src}
                                            alt={planetName}
                                            width={imageSize}
                                            height={imageSize}
                                            className={`relative h-full w-full rounded-full object-cover ring-1 ${ringClass} ${moodShadow} ${
                                                planet === "Ketu"
                                                    ? "rotate-90"
                                                    : ""
                                            }`}
                                        />
                                    ) : (
                                        <span
                                            className={`relative flex h-full w-full items-center justify-center rounded-full bg-white/[0.06] text-[13px] font-semibold uppercase tracking-wider text-white/75 ring-1 ${ringClass} ${moodShadow}`}
                                        >
                                            {planet.slice(0, 2)}
                                        </span>
                                    )}
                                    {retrograde && (
                                        <span
                                            aria-label='retrograde'
                                            className='absolute -bottom-1 -right-1 z-10 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full border border-rose-300/40 bg-rose-500/25 px-1 text-[10px] font-semibold text-rose-100 shadow-[0_0_10px_-2px_rgba(244,114,182,0.45)]'
                                        >
                                            ℞
                                        </span>
                                    )}
                                </div>
                                <p
                                    className={`mt-3 font-serif text-[15px] italic leading-tight tracking-wide ${dignityNameClass}`}
                                >
                                    {planetName}
                                </p>
                                {(signName ||
                                    (typeof degree === "number" &&
                                        Number.isFinite(degree))) && (
                                    <p className='mt-1 flex flex-wrap items-baseline justify-center gap-x-1.5 text-[12px] leading-tight text-white/70'>
                                        {signName && (
                                            <span className='font-medium text-white/85'>
                                                {signName}
                                            </span>
                                        )}
                                        {signName &&
                                            typeof degree === "number" &&
                                            Number.isFinite(degree) && (
                                                <span
                                                    aria-hidden
                                                    className='text-white/30'
                                                >
                                                    ·
                                                </span>
                                            )}
                                        {typeof degree === "number" &&
                                            Number.isFinite(degree) && (
                                                <span className='font-mono tabular-nums text-white/65'>
                                                    {degree.toFixed(1)}°
                                                </span>
                                            )}
                                    </p>
                                )}
                            </li>
                        )
                    })}
                </ul>
            </div>
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
    overviewReady = false,
    transitSourceMessage,
}: VerdictHeroProps) {
    const tChat = useTranslations("HoroscopeChat")
    const t = useTranslations("HoroscopeChat.verdict")
    const formatter = useFormatter()
    const style = MOOD_STYLES[verdict.mood]
    const aliases = privacyAliases ?? []

    // Natal-mode verdicts answer questions like "Which career fits me?" —
    // they are timeless, so we deliberately suppress the date pill that
    // would otherwise read "Today · 18 May" and imply this is a daily
    // forecast. Timing-mode verdicts already render the resolved date or
    // window in the hero crest, so the smaller date pill below it would be
    // redundant.
    const dateLabel = useMemo(() => {
        if (verdict.mode === "natal" || verdict.mode === "timing") return null
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

    // Prefer the AI-generated, question-aware tagline. The translated
    // "Good Day" / "Be Mindful" / "Rest Day" templates are now only used
    // for legacy / daily-mode payloads. Natal-mode verdicts deliberately
    // hide the pill when the model didn't supply a tagline — a timeless
    // birth-chart answer must never read "Good Day".
    const aiMoodSubtitle = verdict.moodSubtitle?.trim()
    const isNatalVerdictMode = verdict.mode === "natal"
    const fallbackMoodLabel = isNatalVerdictMode
        ? ""
        : verdict.mood === "good"
          ? t("moodGood")
          : verdict.mood === "caution"
            ? t("moodCaution")
            : t("moodRest")
    const moodLabel = aiMoodSubtitle || fallbackMoodLabel

    const detailedHtml = (verdict.detailedHtml ?? "").trim()
    const keyMessageHeadline = (verdict.keyMessage?.headline ?? "").trim()
    const keyMessageSubtitle = (verdict.keyMessage?.subtitle ?? "").trim()
    const isNatalMode = verdict.mode === "natal"
    const isTimingMode = verdict.mode === "timing"
    const isTechnicalMode = verdict.mode === "technical"
    // Both natal and technical use the same planet-spotlight visual; the
    // difference is which chart we read the placements from (birth chart
    // for natal, current transit chart for technical).
    const isSpotlightMode = isNatalMode || isTechnicalMode
    const questionText = useMemo(
        () =>
            (
                transitSourceMessage.question ??
                transitSourceMessage.displayQuestion ??
                ""
            ).trim(),
        [
            transitSourceMessage.displayQuestion,
            transitSourceMessage.question,
        ],
    )
    const questionTopic = useMemo(
        () => classifyQuestionTopic(questionText),
        [questionText],
    )
    const transitPlanetFilter =
        questionTopic.topic !== "general"
            ? questionTopic.relevantPlanets
            : undefined
    const timingDateRange =
        isTimingMode && verdict.timingWindow ? verdict.timingWindow : undefined
    const showFocusAreaPill =
        !!verdict.focusArea?.trim() && questionTopic.topic === "general"
    const relevantPlanets = useMemo<NatalRelevantPlanet[]>(
        () => (isSpotlightMode ? verdict.relevantPlanets ?? [] : []),
        [isSpotlightMode, verdict.relevantPlanets],
    )
    const hasRelevantPlanets = relevantPlanets.length > 0
    const heroPlacements = useMemo(
        () =>
            isSpotlightMode
                ? resolveHeroPlacements(
                      transitSourceMessage.chartData,
                      relevantPlanets,
                      { source: isTechnicalMode ? "transit" : "natal" },
                  )
                : [],
        [
            isSpotlightMode,
            isTechnicalMode,
            relevantPlanets,
            transitSourceMessage.chartData,
        ],
    )
    // Technical verdicts hoist the orbit visual into the hero slot (replacing
    // the planet portraits). Natal verdicts keep the planet-portrait crest.
    const showTechnicalOrbit = isTechnicalMode
    const showNatalHeroCrest =
        isNatalMode && heroPlacements.length > 0
    const showTimingHeroCrest = isTimingMode && !!verdict.timingWindow
    const hasVerdictText =
        verdict.headline.trim().length > 0 ||
        keyMessageHeadline.length > 0 ||
        detailedHtml.length > 0
    const showLoadingState = isLoading && !overviewReady && !hasVerdictText
    // Daily / timing verdicts hang their visual under the detailed HTML (the
    // transit feed). Natal verdicts use the planet spotlight there. Technical
    // verdicts already render the orbit visual at the top of the hero, so the
    // below-verdict slot stays empty for them.
    const showTransitFeed = overviewReady && !isLoading && !isSpotlightMode
    const showNatalSpotlight =
        overviewReady && !isLoading && isNatalMode && hasRelevantPlanets
    const showReplyBubble =
        keyMessageHeadline.length > 0 ||
        detailedHtml.length > 0 ||
        showTransitFeed ||
        showNatalSpotlight ||
        showLoadingState

    return (
        <section
            className={`relative overflow-hidden rounded-[28px] transition`}
        >
            <div className='relative z-[1] flex flex-col gap-6 py-6 md:px-8 md:pt-10'>
                <div className='flex flex-col items-center gap-3 text-center'>
                    {showTechnicalOrbit ? (
                        <div className='w-full animate-fade-in'>
                            <TransitOrbitVisual
                                chartData={transitSourceMessage.chartData}
                                highlightPlanets={relevantPlanets.map(
                                    (rp) => rp.planet,
                                )}
                            />
                        </div>
                    ) : showNatalHeroCrest ? (
                        <div className='w-full mb-3 animate-fade-in'>
                            <NatalHeroCrest
                                placements={heroPlacements}
                                moodShadow={style.iconShadow}
                                source='natal'
                            />
                        </div>
                    ) : showTimingHeroCrest && verdict.timingWindow ? (
                        <div className='w-full animate-fade-in relative'>
                            <TimingHeroCrest
                                window={verdict.timingWindow}
                                accentClass={style.accent}
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

                    {moodLabel && (
                        <div className='relative w-fit max-w-md rounded-xl border border-indigo-300/20 bg-gradient-to-br from-indigo-500/[0.08] via-purple-500/[0.06] to-cyan-500/[0.05] py-2.5 pr-4 pl-5 shadow-[0_8px_28px_-12px_rgba(129,140,248,0.55)] animate-fade-in before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-transparent before:via-[#a78bfa]/70 before:to-transparent'>
                            <p className='text-[11px] font-serif font-semibold italic uppercase leading-relaxed tracking-[0.18em] text-indigo-200/76'>
                                <PrivacyHighlightedText
                                    text={moodLabel}
                                    aliases={aliases}
                                    supportMarkdown
                                />
                            </p>
                        </div>
                    )}
                </div>

                {showReplyBubble && (
                    <div className='w-full space-y-5 text-left text-white/90 leading-relaxed'>
                        <div className='w-full'>
                            <InterpretationHeaderBar
                                isLoading={isLoading}
                                showActions={overviewReady || !isLoading}
                            />
                        </div>
                        {showLoadingState && (
                            <CosmicCenteredLoader
                                label={tChat("loading")}
                                variant='embedded'
                                className='min-h-[280px] py-8'
                            />
                        )}
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

                        {!showLoadingState &&
                            (detailedHtml.length > 0 ||
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
                                            transitPlanetFilter={
                                                transitPlanetFilter
                                            }
                                            dateRange={timingDateRange}
                                            compact={
                                                isTimingMode ||
                                                !!transitPlanetFilter
                                            }
                                            maxVisible={3}
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

                {showFocusAreaPill && (
                    <div className='flex items-center justify-center gap-1.5 pt-0.5'>
                        <Target
                            aria-hidden
                            className='h-3 w-3 text-white/35'
                        />
                        <span className='text-[10px] uppercase tracking-[0.14em] text-white/40'>
                            {t("focusHeading")}
                        </span>
                        <span
                            className={`inline-flex items-center rounded-full border ${style.pillBorder} ${style.pillBg} px-2 py-px text-[10px] font-medium ${style.accent}`}
                        >
                            {verdict.focusArea}
                        </span>
                    </div>
                )}
            </div>
        </section>
    )
}
