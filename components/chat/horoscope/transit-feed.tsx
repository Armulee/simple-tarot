"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { ChevronDown, Orbit } from "lucide-react"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { AspectIcon } from "@/components/astrology/aspect-icon"
import { PrivacyHighlightedText } from "@/components/chat/privacy/privacy-highlighted-user-text"
import type { AspectInsightItem, ChatMessage } from "@/components/chat/types"
import type {
    PersonalizedTransitAspectExact,
    PersonalizedTransitAspectWindow,
    PersonalizedTransitAspectsResult,
} from "@/lib/astrology/transit-aspects"
import { getPlanetImageSrc } from "@/lib/astrology/planet-images"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"

const VISIBLE_DEFAULT = 6

type FeedEvent = {
    aspectKey: string
    transitPlanet: string
    natalPlanet: string
    aspectType: string
    sentiment: "good" | "bad" | "neutral"
    primaryDateIso: string
    secondaryDateIso?: string
    isWindow: boolean
    insight?: string
    keyword?: string
    intensity?: "low" | "medium" | "high"
    transitPositionText?: string
    natalPositionText?: string
}

function buildEvents(
    aspects: PersonalizedTransitAspectsResult | null | undefined,
    insightsByKey: Map<string, AspectInsightItem>,
): FeedEvent[] {
    if (!aspects) return []
    const events: FeedEvent[] = []
    const exactEvents: PersonalizedTransitAspectExact[] =
        aspects.exact?.events ?? []
    for (const e of exactEvents) {
        const ai = insightsByKey.get(e.aspectKey)
        events.push({
            aspectKey: e.aspectKey,
            transitPlanet: e.transitPlanet,
            natalPlanet: e.natalPlanet,
            aspectType: e.aspectType,
            sentiment: ai?.sentiment ?? e.sentiment ?? "neutral",
            primaryDateIso: e.dateIso,
            isWindow: false,
            insight: ai?.insight ?? e.insight,
            keyword: ai?.keyword ?? e.keyword,
            intensity: ai?.intensity,
            transitPositionText: e.transitPositionText,
            natalPositionText: e.natalPositionText,
        })
    }
    const windowEvents: PersonalizedTransitAspectWindow[] =
        aspects.range?.events ?? []
    for (const e of windowEvents) {
        const ai = insightsByKey.get(e.aspectKey)
        events.push({
            aspectKey: e.aspectKey,
            transitPlanet: e.transitPlanet,
            natalPlanet: e.natalPlanet,
            aspectType: e.aspectType,
            sentiment: ai?.sentiment ?? e.sentiment ?? "neutral",
            primaryDateIso: e.peakDateIso,
            secondaryDateIso: e.endDateIso,
            isWindow: true,
            insight: ai?.insight ?? e.insight,
            keyword: ai?.keyword ?? e.keyword,
            intensity: ai?.intensity,
            transitPositionText: e.transitPositionText,
            natalPositionText: e.natalPositionText,
        })
    }
    return events.sort((a, b) => {
        const intensityRank: Record<string, number> = {
            high: 0,
            medium: 1,
            low: 2,
        }
        const ai = a.intensity ? (intensityRank[a.intensity] ?? 3) : 3
        const bi = b.intensity ? (intensityRank[b.intensity] ?? 3) : 3
        if (ai !== bi) return ai - bi
        return a.primaryDateIso.localeCompare(b.primaryDateIso)
    })
}

type SentimentStyle = {
    /** Vertical accent bar on the card's left edge. */
    bar: string
    /** Soft radial tint anchored top-right for ambient color. */
    glow: string
    /** Text/accent color for sentiment-aware label highlights. */
    accent: string
    /** Color for the aspect icon connecting the two planets. */
    connector: string
}

const SENTIMENT_STYLES: Record<FeedEvent["sentiment"], SentimentStyle> = {
    good: {
        bar: "bg-gradient-to-b from-emerald-300/0 via-emerald-300/80 to-emerald-300/0",
        glow: "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(52,211,153,0.12),transparent_55%)]",
        accent: "text-emerald-200/90",
        connector: "text-emerald-200/85",
    },
    bad: {
        bar: "bg-gradient-to-b from-rose-300/0 via-rose-300/80 to-rose-300/0",
        glow: "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(251,113,133,0.12),transparent_55%)]",
        accent: "text-rose-200/90",
        connector: "text-rose-200/85",
    },
    neutral: {
        bar: "bg-gradient-to-b from-slate-300/0 via-slate-300/55 to-slate-300/0",
        glow: "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(148,163,184,0.08),transparent_60%)]",
        accent: "text-slate-200/85",
        connector: "text-cyan-200/85",
    },
}

function PlanetAvatar({
    name,
    size = 36,
}: {
    name: string
    size?: number
}) {
    const src = getPlanetImageSrc(name)
    const initials = name?.slice(0, 2) ?? "?"
    if (!src) {
        return (
            <span
                className='flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-[10px] font-semibold uppercase tracking-wider text-white/70'
                style={{ width: size, height: size }}
            >
                {initials}
            </span>
        )
    }
    return (
        <span
            className='relative inline-flex shrink-0 items-center justify-center rounded-full ring-1 ring-white/10'
            style={{
                width: size,
                height: size,
                boxShadow:
                    "0 6px 18px -10px rgba(99,102,241,0.45), inset 0 0 0 1px rgba(255,255,255,0.04)",
            }}
        >
            <Image
                src={src}
                alt={name}
                width={size}
                height={size}
                className={`h-full w-full rounded-full object-cover ${
                    name === "Ketu" ? "rotate-90" : ""
                }`}
            />
        </span>
    )
}

function IntensityMeter({
    intensity,
    sentiment,
}: {
    intensity?: FeedEvent["intensity"]
    sentiment: FeedEvent["sentiment"]
}) {
    if (!intensity) return null
    const filled = intensity === "high" ? 3 : intensity === "medium" ? 2 : 1
    const fillColor =
        sentiment === "good"
            ? "bg-emerald-300/85"
            : sentiment === "bad"
              ? "bg-rose-300/85"
              : "bg-cyan-200/80"
    return (
        <span
            className='inline-flex items-center gap-[3px]'
            aria-label={`intensity ${intensity}`}
        >
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className={`h-2.5 w-[3px] rounded-full ${
                        i < filled ? fillColor : "bg-white/12"
                    }`}
                />
            ))}
        </span>
    )
}

export default function TransitFeed({
    message,
    privacyAliases,
}: {
    message: ChatMessage
    privacyAliases?: PromptAliasEntry[]
}) {
    const t = useTranslations("HoroscopeChat.transit")
    const locale = useLocale()
    const formatter = useFormatter()
    const aliases = privacyAliases ?? []
    const [expanded, setExpanded] = useState(false)

    const insightsByKey = useMemo(() => {
        const map = new Map<string, AspectInsightItem>()
        for (const item of message.aspectInsights ?? []) {
            if (item?.aspectKey) map.set(item.aspectKey, item)
        }
        return map
    }, [message.aspectInsights])

    const events = useMemo(
        () =>
            buildEvents(
                message.personalizedTransitAspectsMerged ??
                    message.personalizedTransitAspects,
                insightsByKey,
            ),
        [
            insightsByKey,
            message.personalizedTransitAspects,
            message.personalizedTransitAspectsMerged,
        ],
    )

    const aspectLabel = (type: string) => {
        switch (type) {
            case "conjunction":
                return t("aspectConjunction")
            case "opposition":
                return t("aspectOpposition")
            case "square":
                return t("aspectSquare")
            case "trine":
                return t("aspectTrine")
            case "sextile":
                return t("aspectSextile")
            default:
                return type
        }
    }

    const formatDate = (iso: string) => {
        try {
            return formatter.dateTime(new Date(`${iso}T00:00:00Z`), {
                day: "numeric",
                month: "short",
                timeZone: "UTC",
            })
        } catch {
            return iso
        }
    }

    if (events.length === 0) {
        const text = message.text?.trim()
        if (!text) {
            return (
                <div className='relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-dashed border-white/[0.12] bg-gradient-to-b from-white/[0.03] to-transparent px-6 py-10 text-center'>
                    <div
                        aria-hidden
                        className='pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(129,140,248,0.08),transparent_70%)]'
                    />
                    <span className='relative flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-300/25 bg-indigo-500/10 text-indigo-200/80 shadow-[0_0_22px_-6px_rgba(129,140,248,0.5)]'>
                        <Orbit
                            className='h-5 w-5 animate-[spin_18s_linear_infinite]'
                            aria-hidden
                        />
                    </span>
                    <p className='relative max-w-sm text-sm leading-relaxed text-white/50'>
                        {t("emptyFallback")}
                    </p>
                </div>
            )
        }
        return (
            <div className='rounded-2xl border border-indigo-300/15 bg-gradient-to-br from-indigo-500/[0.06] via-white/[0.03] to-cyan-500/[0.04] p-5 shadow-[0_12px_40px_-24px_rgba(99,102,241,0.35)]'>
                <p className='text-sm leading-7 text-white/[0.88]'>
                    <PrivacyHighlightedText
                        text={text}
                        aliases={aliases}
                        supportMarkdown
                    />
                </p>
            </div>
        )
    }

    const visible = expanded ? events : events.slice(0, VISIBLE_DEFAULT)
    const hasMore = events.length > VISIBLE_DEFAULT
    const remaining = events.length - VISIBLE_DEFAULT

    return (
        <div className='space-y-5'>
            <div className='relative overflow-hidden rounded-2xl border border-indigo-300/20 bg-gradient-to-r from-indigo-500/[0.1] via-violet-500/[0.06] to-cyan-500/[0.05] px-4 py-3.5 shadow-[0_10px_36px_-18px_rgba(99,102,241,0.35)]'>
                <div
                    aria-hidden
                    className='pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.18),transparent_70%)] blur-2xl'
                />
                <div className='relative flex items-center justify-between gap-3'>
                    <div className='flex min-w-0 items-center gap-3'>
                        <span className='relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-300/35 bg-indigo-500/15 text-indigo-100 shadow-[0_0_16px_-4px_rgba(129,140,248,0.55)]'>
                            <Orbit
                                className='h-4 w-4 animate-[spin_24s_linear_infinite]'
                                aria-hidden
                            />
                            <span
                                aria-hidden
                                className='absolute inset-[-4px] rounded-2xl border border-indigo-300/20'
                            />
                        </span>
                        <div className='min-w-0'>
                            <h3 className='text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-100/85'>
                                {t("feedTitle")}
                            </h3>
                        </div>
                    </div>
                    <span className='shrink-0 rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white/80 ring-1 ring-white/[0.06]'>
                        {events.length}
                    </span>
                </div>
            </div>

            <ol className='list-none space-y-3 p-0'>
                {visible.map((event, idx) => {
                    const sStyle = SENTIMENT_STYLES[event.sentiment]
                    return (
                        <li
                            key={`${event.aspectKey}-${idx}`}
                            className='group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-white/[0.01] pl-4 pr-4 py-4 shadow-[0_8px_32px_-22px_rgba(0,0,0,0.65)] transition duration-300 hover:border-indigo-300/25 hover:from-white/[0.06] hover:shadow-[0_14px_44px_-20px_rgba(99,102,241,0.28)]'
                        >
                            <span
                                aria-hidden
                                className={`pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-full ${sStyle.bar}`}
                            />
                            <span
                                aria-hidden
                                className={`pointer-events-none absolute inset-0 opacity-90 transition-opacity duration-300 group-hover:opacity-100 ${sStyle.glow}`}
                            />

                            <div className='relative flex flex-col gap-3'>
                                <div className='flex items-start justify-between gap-3'>
                                    <div className='flex min-w-0 items-center gap-2.5'>
                                        <PlanetAvatar
                                            name={event.transitPlanet}
                                        />
                                        <span
                                            aria-hidden
                                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/30 backdrop-blur ${sStyle.connector}`}
                                            title={aspectLabel(event.aspectType)}
                                        >
                                            <AspectIcon
                                                aspectType={event.aspectType}
                                                className='h-3.5 w-3.5'
                                            />
                                        </span>
                                        <PlanetAvatar name={event.natalPlanet} />
                                    </div>
                                    <time
                                        className='shrink-0 rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[11px] font-medium tabular-nums text-white/55'
                                        dateTime={event.primaryDateIso}
                                    >
                                        {event.isWindow && event.secondaryDateIso
                                            ? `${formatDate(event.primaryDateIso)} – ${formatDate(event.secondaryDateIso)}`
                                            : formatDate(event.primaryDateIso)}
                                    </time>
                                </div>

                                <div className='flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] leading-snug'>
                                    <span className='font-medium text-white'>
                                        {event.transitPlanet}
                                    </span>
                                    <span
                                        className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${sStyle.accent}`}
                                    >
                                        {aspectLabel(event.aspectType)}
                                    </span>
                                    <span className='font-medium text-white'>
                                        {event.natalPlanet}
                                    </span>
                                    <span className='ml-1 text-[11px] text-white/40'>
                                        {t("transitLabel")}
                                        <span className='mx-1 text-white/25'>
                                            ·
                                        </span>
                                        {t("natalLabel")}
                                    </span>
                                </div>

                                {(event.intensity || event.keyword) && (
                                    <div className='flex flex-wrap items-center gap-2'>
                                        {event.intensity && (
                                            <span className='inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1'>
                                                <IntensityMeter
                                                    intensity={event.intensity}
                                                    sentiment={event.sentiment}
                                                />
                                                <span className='text-[10px] font-semibold uppercase tracking-[0.12em] text-white/65'>
                                                    {event.intensity
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                        event.intensity.slice(1)}
                                                </span>
                                            </span>
                                        )}
                                        {event.keyword && (
                                            <span className='inline-flex max-w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/55'>
                                                {event.keyword}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {event.insight && (
                                    <p className='relative border-t border-white/[0.06] pt-3 text-sm leading-relaxed text-white/[0.82]'>
                                        <PrivacyHighlightedText
                                            text={event.insight}
                                            aliases={aliases}
                                            supportMarkdown
                                        />
                                    </p>
                                )}
                                {!event.insight &&
                                    (event.transitPositionText ||
                                        event.natalPositionText) && (
                                        <p
                                            className='relative border-t border-white/[0.06] pt-3 text-[12px] leading-relaxed text-white/55'
                                            lang={locale}
                                        >
                                            {event.transitPositionText && (
                                                <span>
                                                    {t("transitLabel")}:{" "}
                                                    {event.transitPositionText}
                                                </span>
                                            )}
                                            {event.transitPositionText &&
                                                event.natalPositionText && (
                                                    <span className='text-white/30'>
                                                        {" · "}
                                                    </span>
                                                )}
                                            {event.natalPositionText && (
                                                <span>
                                                    {t("natalLabel")}:{" "}
                                                    {event.natalPositionText}
                                                </span>
                                            )}
                                        </p>
                                    )}
                            </div>
                        </li>
                    )
                })}
            </ol>

            {hasMore && (
                <button
                    type='button'
                    onClick={() => setExpanded((v) => !v)}
                    className='group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-300/20 bg-indigo-500/[0.08] py-2.5 text-xs font-medium text-indigo-100/90 transition hover:border-indigo-300/40 hover:bg-indigo-500/[0.14] hover:text-white sm:w-auto sm:justify-start sm:rounded-full sm:px-4'
                    aria-expanded={expanded}
                >
                    <span>{expanded ? t("showLess") : t("showMore")}</span>
                    {!expanded && (
                        <span className='rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[10px] tabular-nums text-white/70'>
                            +{remaining}
                        </span>
                    )}
                    <ChevronDown
                        aria-hidden
                        className={`h-3.5 w-3.5 transition-transform duration-300 ${
                            expanded ? "rotate-180" : ""
                        }`}
                    />
                </button>
            )}
        </div>
    )
}
