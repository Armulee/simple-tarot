"use client"

import { useMemo, useState } from "react"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { AspectIcon } from "@/components/astrology/aspect-icon"
import { PrivacyHighlightedText } from "@/components/chat/privacy-highlighted-user-text"
import type {
    AspectInsightItem,
    ChatMessage,
} from "@/components/chat/types"
import type {
    PersonalizedTransitAspectExact,
    PersonalizedTransitAspectWindow,
    PersonalizedTransitAspectsResult,
} from "@/lib/astrology/transit-aspects"
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
        const ai = a.intensity ? intensityRank[a.intensity] ?? 3 : 3
        const bi = b.intensity ? intensityRank[b.intensity] ?? 3 : 3
        if (ai !== bi) return ai - bi
        return a.primaryDateIso.localeCompare(b.primaryDateIso)
    })
}

function sentimentColor(sentiment: FeedEvent["sentiment"]) {
    if (sentiment === "good") return "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.7)]"
    if (sentiment === "bad") return "bg-rose-300 shadow-[0_0_8px_rgba(252,165,165,0.7)]"
    return "bg-slate-300 shadow-[0_0_8px_rgba(148,163,184,0.6)]"
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
                <p className='text-sm text-white/55'>{t("emptyFallback")}</p>
            )
        }
        return (
            <div className='rounded-[16px] border border-white/10 bg-white/[0.04] p-5'>
                <p className='text-sm leading-7 text-white/82'>
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

    return (
        <div className='space-y-4'>
            <div className='flex items-baseline justify-between gap-2'>
                <h3 className='text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45'>
                    {t("feedTitle")}
                </h3>
                <span className='text-[11px] text-white/35'>
                    {events.length}
                </span>
            </div>
            <ol className='space-y-3'>
                {visible.map((event, idx) => (
                    <li
                        key={`${event.aspectKey}-${idx}`}
                        className='rounded-2xl border border-white/10 bg-white/[0.03] p-4'
                    >
                        <div className='mb-2 flex flex-wrap items-center gap-2'>
                            <span
                                aria-hidden
                                className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${sentimentColor(event.sentiment)}`}
                            />
                            <AspectIcon
                                aspectType={event.aspectType}
                                className='h-3.5 w-3.5 text-cyan-200/80'
                            />
                            <span className='text-[13px] font-medium text-white/90'>
                                <span className='text-white/55'>
                                    {t("transitLabel")}
                                </span>{" "}
                                <span className='text-white'>
                                    {event.transitPlanet}
                                </span>{" "}
                                <span className='text-cyan-200/85'>
                                    {aspectLabel(event.aspectType)}
                                </span>{" "}
                                <span className='text-white/55'>
                                    {t("natalLabel")}
                                </span>{" "}
                                <span className='text-white'>
                                    {event.natalPlanet}
                                </span>
                            </span>
                            <span className='ml-auto text-[11px] text-white/45'>
                                {event.isWindow && event.secondaryDateIso
                                    ? `${formatDate(event.primaryDateIso)} – ${formatDate(event.secondaryDateIso)}`
                                    : formatDate(event.primaryDateIso)}
                            </span>
                        </div>
                        {event.keyword && (
                            <p className='text-[11px] uppercase tracking-[0.18em] text-white/45'>
                                {event.keyword}
                            </p>
                        )}
                        {event.insight && (
                            <p className='mt-1.5 text-sm leading-[1.6] text-white/80'>
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
                                    className='mt-1 text-[12px] text-white/55'
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
                    </li>
                ))}
            </ol>
            {hasMore && (
                <button
                    type='button'
                    onClick={() => setExpanded((v) => !v)}
                    className='inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/65 transition hover:bg-white/[0.08] hover:text-white'
                >
                    {expanded ? t("showLess") : t("showMore")}
                </button>
            )}
        </div>
    )
}
