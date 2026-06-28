"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import {
    AlertTriangle,
    Download,
    Moon,
    Share2,
    Sparkles,
    Target,
} from "lucide-react"
import { toast } from "sonner"
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
import {
    canonicalPlanetName,
    getPlanetDignity,
    isKnownPlanetName,
} from "@/lib/birth-chart-utils"
import { unmaskTextWithAliases } from "@/lib/privacy/prompt-redaction"
import ShareSection from "@/components/tarot/interpretation/share"
import ReadingDownloadDialog from "@/components/share/reading-download-dialog"
import { extractTransitPlanets } from "@/lib/share-astrology-planets"
import TransitOrbitVisual from "@/components/chat/horoscope/transit-orbit-visual"

/** Mirrors the tarot reply's headline-box export icon button. */
const VERDICT_EXPORT_ICON_BTN =
    "group relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl text-white shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)] transition hover:scale-105 hover:border-accent/40 hover:shadow-[0_12px_32px_-10px_rgba(139,92,246,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"

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
    /** Regenerate handler for the verdict's action bar (mirrors the tarot reply). */
    onRegenerateHoroscope?: (messageId: string) => void
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
        const planet = canonicalPlanetName(rp.planet)
        const point = planets[planet] ?? planets[rp.planet]
        return {
            planet,
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
                        const canonicalPlanet = canonicalPlanetName(planet)
                        const planetName = isKnownPlanetName(canonicalPlanet)
                            ? tAstro(`planets.${canonicalPlanet}`)
                            : canonicalPlanet
                        const src = getPlanetImageSrc(canonicalPlanet)
                        const canonical = sign ? canonicalSign(sign) : null
                        const signName = canonical
                            ? tAstro(`zodiacSigns.${canonical}`, {
                                  defaultValue: sign ?? "",
                              })
                            : null
                        const dignity = canonical
                            ? getPlanetDignity(canonicalPlanet, canonical)
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
    onRegenerateHoroscope,
}: VerdictHeroProps) {
    const tChat = useTranslations("HoroscopeChat")
    const t = useTranslations("HoroscopeChat.verdict")
    const tActions = useTranslations("ReadingPage.interpretation")
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
    const showFocusAreaPill =
        !!verdict.focusArea?.trim() && questionTopic.topic === "general"
    const relevantPlanets = useMemo<NatalRelevantPlanet[]>(
        () => (isSpotlightMode ? verdict.relevantPlanets ?? [] : []),
        [isSpotlightMode, verdict.relevantPlanets],
    )
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
    // Daily / fallback verdicts also surface the orbit when we have chart
    // data — it replaces the legacy mood icon so the overview tab carries the
    // visual that used to live in the transit tab.
    const showTechnicalOrbit = isTechnicalMode
    const showNatalHeroCrest =
        isNatalMode && heroPlacements.length > 0
    const showTimingHeroCrest = isTimingMode && !!verdict.timingWindow
    const showDailyOrbit =
        !isTechnicalMode &&
        !showNatalHeroCrest &&
        !showTimingHeroCrest &&
        Boolean(transitSourceMessage.chartData)
    const hasVerdictText =
        verdict.headline.trim().length > 0 ||
        keyMessageHeadline.length > 0 ||
        detailedHtml.length > 0
    const showLoadingState = isLoading && !overviewReady && !hasVerdictText
    // Below the detailed HTML we surface the share section (the transit feed /
    // natal spotlight detail now lives in the Technical / Aspect tabs).
    const showShare = overviewReady && !isLoading && hasVerdictText
    const showReplyBubble =
        keyMessageHeadline.length > 0 ||
        detailedHtml.length > 0 ||
        showShare ||
        showLoadingState

    // ----- Daily-verdict share / actions -----
    // The verdict reply carries the same action bar as the tarot reply
    // (regenerate, copy, download, share…). The download share-image mirrors
    // the tarot poster but swaps in the solar-system skies via the astrology
    // theme, feeding the verdict headline / mood tagline / detailed reading.
    // Technical (ephemeris) verdicts use the orbit-wheel poster; the other
    // verdict flavors use the daily linear solar-system poster.
    const shareTheme: "astrology" | "astrology-technical" = isTechnicalMode
        ? "astrology-technical"
        : "astrology"
    const unmask = (text: string) => unmaskTextWithAliases(text, aliases)
    const posterQuestion = unmask(questionText)
    const posterHeadline = unmask(verdict.headline.trim() || keyMessageHeadline)
    const posterSubtitle = unmask(keyMessageSubtitle || moodLabel || "")
    const posterDetailedHtml = unmask(detailedHtml)
    const posterInterpretation = unmask(
        (transitSourceMessage.text || detailedHtml)
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
    )
    // Today's transit positions (sign + degree), stamped under the painted
    // planets on the share poster — sourced from the same chart the orbit
    // visual reads.
    const transitPlanets = useMemo(
        () => extractTransitPlanets(transitSourceMessage.chartData),
        [transitSourceMessage.chartData],
    )
    const [downloadOpen, setDownloadOpen] = useState(false)
    const handleVerdictShare = async () => {
        const shareText = [posterHeadline, posterInterpretation]
            .filter(Boolean)
            .join("\n\n")
        const url =
            typeof window !== "undefined" ? window.location.href : undefined
        const nav =
            typeof navigator !== "undefined"
                ? (navigator as Navigator & {
                      share?: (data: ShareData) => Promise<void>
                  })
                : undefined
        if (nav?.share) {
            try {
                await nav.share({ title: "AskingFate", text: shareText, url })
                return
            } catch {
                return
            }
        }
        try {
            await navigator.clipboard.writeText(
                url ? `${shareText}\n\n${url}` : shareText,
            )
            toast.success(tActions("actions.copiedLink"))
        } catch {}
    }

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
                    ) : showDailyOrbit ? null : (
                        <MoodIcon
                            mood={verdict.mood}
                            className={`h-12 w-12 mb-2 ${style.accent} ${style.iconShadow}`}
                        />
                    )}

                    {/* Daily-verdict header: small star + date pill above the
                        serif headline, subtitle below, and the orbit visual
                        rendered AFTER this text block. Matches the
                        premium-fortune layout in the reference. */}
                    {showDailyOrbit && (
                        <div className='flex items-center justify-center gap-2.5 text-amber-200/85'>
                            <span aria-hidden className='inline-flex h-px w-6 bg-gradient-to-r from-transparent to-amber-300/60' />
                            <span aria-hidden className='text-base leading-none'>✦</span>
                            <span aria-hidden className='inline-flex h-px w-6 bg-gradient-to-l from-transparent to-amber-300/60' />
                        </div>
                    )}
                    {dateLabel && (
                        <p
                            className={
                                showDailyOrbit
                                    ? 'text-center text-[12px] uppercase tracking-[0.32em] text-amber-200/80'
                                    : 'text-center text-[11px] uppercase tracking-[0.22em] text-white/45'
                            }
                        >
                            {dateLabel}
                        </p>
                    )}

                    <h2
                        className={
                            showDailyOrbit
                                ? 'max-w-[24ch] text-balance font-serif text-3xl font-semibold leading-[1.15] text-amber-50 sm:text-4xl'
                                : 'max-w-[28ch] text-balance text-xl font-semibold leading-[1.25] text-white'
                        }
                    >
                        <PrivacyHighlightedText
                            text={verdict.headline}
                            aliases={aliases}
                            supportMarkdown
                        />
                    </h2>

                    {moodLabel &&
                        (showDailyOrbit ? (
                            <p className='max-w-[36ch] text-balance text-center text-sm leading-relaxed text-amber-100/75'>
                                <PrivacyHighlightedText
                                    text={moodLabel}
                                    aliases={aliases}
                                    supportMarkdown
                                />
                            </p>
                        ) : (
                            <div className='relative w-fit max-w-md rounded-xl border border-indigo-300/20 bg-gradient-to-br from-indigo-500/[0.08] via-purple-500/[0.06] to-cyan-500/[0.05] py-2.5 pr-4 pl-5 shadow-[0_8px_28px_-12px_rgba(129,140,248,0.55)] animate-fade-in before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-transparent before:via-[#a78bfa]/70 before:to-transparent'>
                                <p className='text-[11px] font-serif font-semibold italic uppercase leading-relaxed tracking-[0.18em] text-indigo-200/76'>
                                    <PrivacyHighlightedText
                                        text={moodLabel}
                                        aliases={aliases}
                                        supportMarkdown
                                    />
                                </p>
                            </div>
                        ))}

                    {showDailyOrbit && (
                        <div className='mt-2 w-full animate-fade-in'>
                            <TransitOrbitVisual
                                chartData={transitSourceMessage.chartData}
                            />
                        </div>
                    )}
                </div>

                {showReplyBubble && (
                    <div className='w-full space-y-5 text-left text-white/90 leading-relaxed'>
                        <div className='w-full'>
                            <InterpretationHeaderBar
                                isLoading={isLoading}
                                showActions={overviewReady || !isLoading}
                                mode='horoscope'
                                theme={shareTheme}
                                allowVideo={false}
                                planets={transitPlanets}
                                question={posterQuestion}
                                interpretation={posterInterpretation}
                                headline={posterHeadline}
                                subtitle={posterSubtitle}
                                detailedHtml={posterDetailedHtml}
                                messageId={transitSourceMessage.id}
                                onRegenerateHoroscope={onRegenerateHoroscope}
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
                                <div className='flex items-start justify-between gap-3'>
                                    <div className='min-w-0 flex-1'>
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
                                    {showShare && (
                                        <div className='flex shrink-0 items-start gap-2'>
                                            <button
                                                type='button'
                                                onClick={handleVerdictShare}
                                                className={VERDICT_EXPORT_ICON_BTN}
                                                aria-label={tActions(
                                                    "actions.share",
                                                )}
                                                title={tActions(
                                                    "actions.share",
                                                )}
                                            >
                                                <span
                                                    aria-hidden
                                                    className='pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400/45 via-purple-400/45 to-cyan-400/45 opacity-80 transition group-hover:opacity-0'
                                                />
                                                <Share2 className='relative z-10 h-4.5 w-4.5 shrink-0 drop-shadow-sm' />
                                            </button>
                                            <button
                                                type='button'
                                                onClick={() =>
                                                    setDownloadOpen(true)
                                                }
                                                className={VERDICT_EXPORT_ICON_BTN}
                                                aria-label={tActions(
                                                    "actions.downloadReadingImage",
                                                )}
                                                title={tActions(
                                                    "actions.downloadReadingImage",
                                                )}
                                            >
                                                <span
                                                    aria-hidden
                                                    className='pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400/45 via-purple-400/45 to-cyan-400/45 opacity-80 transition group-hover:opacity-0'
                                                />
                                                <Download className='relative z-10 h-4.5 w-4.5 shrink-0 drop-shadow-sm' />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <ReadingDownloadDialog
                            open={downloadOpen}
                            onOpenChange={setDownloadOpen}
                            theme={shareTheme}
                            allowVideo={false}
                            filenameBase='askingfate-horoscope'
                            question={posterQuestion || undefined}
                            cards={[]}
                            headline={posterHeadline}
                            subtitle={posterSubtitle}
                            detailedHtml={posterDetailedHtml}
                            planets={transitPlanets}
                        />

                        {!showLoadingState &&
                            (detailedHtml.length > 0 || showShare) && (
                            <div className='rounded-2xl shadow-lg animate-fade-in text-white/90 leading-relaxed'>
                                {detailedHtml.length > 0 && (
                                    <PrivacyDetailedHtml
                                        html={detailedHtml}
                                        aliases={aliases}
                                        className='tarot-detailed-html'
                                    />
                                )}

                                {showShare && (
                                    <div
                                        className={
                                            detailedHtml.length > 0
                                                ? "mt-5"
                                                : ""
                                        }
                                    >
                                        <ShareSection
                                            variant='embedded'
                                            question={posterQuestion}
                                            interpretation={posterInterpretation}
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
