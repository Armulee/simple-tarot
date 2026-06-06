"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import { experimental_useObject as useObject } from "@ai-sdk/react"
import { parsePartialJson } from "ai"
import { useStars } from "@/contexts/stars-context"
import Footer from "@/components/footer/footer"
import { TypewriterText } from "@/components/typewriter-text"
import QuestionInput from "@/components/question-input"
import type { TarotCard } from "@/contexts/tarot-context"
import {
    tarotInterpretationSchema,
    type TarotInterpretation,
} from "@/lib/tarot/schema"
import {
    horoscopeInterpretationSchema,
    streamingDailyVerdictSchema,
    type HoroscopeInterpretation,
} from "@/lib/astrology/schema"
import {
    streamingGeneralReplySchema,
    type GeneralReply,
    type StreamingGeneralReply,
} from "@/lib/chat/general-reply-schema"
import {
    streamingOracleReadingSchema,
    type StreamingOracleReading,
} from "@/lib/chat/oracle-reading-schema"
import { resolveDeterministicTransitDate } from "@/lib/astrology/transit-date-extract"
import {
    mergeAspectKeywordsIntoAspects,
    type AspectKeywordItem,
} from "@/lib/astrology/transit-aspects"
import { looksLikeTimingQuestion } from "@/lib/astrology/single-day"
import { getDefaultAstrologySystem } from "@/lib/astrology/intake"
import {
    buildConversationContextFromMessages,
    buildSessionContextSummary,
} from "@/lib/astrology/question-context"
import {
    buildCalendarDayOriginContext,
    mergeOriginContextIntoSummary,
    type OriginContext,
} from "@/lib/chat/origin-context"
import { chartDataToBirth, chartDataToTransit } from "@/lib/chart-data-to-birth"
import { loadBirthFromStorage } from "@/lib/birth-storage"
import {
    applyEphemerisLocationTimeDefaults,
    profileToHoroscopeBirthData,
} from "@/lib/horoscope-profile-birth"
import {
    loadAutoPickFromStorage,
    saveAutoPickToStorage,
} from "@/lib/auto-pick-storage"
import {
    loadComposerSuggestionsEnabledFromStorage,
    saveComposerSuggestionsEnabledToStorage,
} from "@/lib/composer-suggestions-storage"
import {
    loadInterpretationModeFromStorage,
    saveInterpretationModeToStorage,
    type InterpretationMode,
} from "@/lib/interpretation-mode-storage"
import { CookiesBanner } from "@/components/cookies-banner"
import {
    getSkipReadAloudConfirm,
    setSkipReadAloudConfirm,
} from "@/lib/read-aloud-confirm-storage"
import { pickRandomCards } from "@/lib/tarot/pick-random-cards"
import { resolveLocationFromCountryState } from "@/lib/location"
import type {
    HoroscopeBirthData,
    HoroscopeTransitData,
} from "@/types/horoscope"
import DrawCardSection from "@/components/chat/draw-card-section"
import ActionTrigger from "@/components/chat/action-trigger"
import OriginContextStrip from "@/components/chat/origin-context-strip"
import MessageList from "@/components/chat/message-list"
import ShareAccessDialog from "@/components/chat/share-access-dialog"
import type { ChipId as HoroscopeCalendarChipId } from "@/components/chat/horoscope/calendar-tool"
import { toast } from "sonner"
import { LocationSelector } from "@/components/ui/location-selector"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowDown, EyeOff, Star } from "lucide-react"
import {
    CARD_UI_TEXT,
    isPickForMeIntent,
    normalizeLocale,
} from "@/components/chat/card-ui"
import type {
    ChatDecision,
    ChatMessage,
    AspectInsightItem,
    ChatSessionPayload,
    HoroscopeAuthGate,
    SourceAspectEvent,
} from "@/components/chat/types"
import { parseQuestionDomain } from "@/lib/chat/situation-schema"

import { getTarotCardCount } from "@/lib/chat/decision-schema"
import {
    clampCardCountToTier,
    getMaxCardsForTier,
} from "@/lib/payments/plan-limits"
import { buildSupportBlockFromDecision } from "@/lib/chat/support-block"
import { useAuth } from "@/hooks/use-auth"
import { useActiveSubscription } from "@/hooks/use-active-subscription"
import { useProfile } from "@/contexts/profile-context"
import { supabase } from "@/lib/supabase"
import { sanitizePromptOnClient } from "@/lib/privacy/sanitize-client"
import {
    detectInputLanguage,
    isSupportedLocale,
    type SupportedLocale,
} from "@/lib/detect-input-language"
import {
    buildPrivacyStorageKey,
    loadRawPromptFromSession,
    loadSessionAliases,
    removeRawPromptFromSession,
    saveRawPromptToSession,
    saveSessionAliases,
    unmaskTextWithAliases,
    type PromptAliasEntry,
    type PromptRedactionType,
} from "@/lib/privacy/prompt-redaction"

export type { ChatDecision } from "@/components/chat/types"

function normalizeAspectInsights(
    items:
        | Array<
              | {
                    aspectKey?: string | null
                    keyword?: string | null
                    sentiment?: string | null
                    insight?: string | null
                    impact?: string | null
                    intensity?: string | null
                }
              | undefined
          >
        | undefined
        | null,
) {
    const clean: AspectInsightItem[] = []
    const seenAspectKeys = new Set<string>()
    for (const item of items ?? []) {
        const aspectKey = (item?.aspectKey ?? "").trim()
        const keyword = (item?.keyword ?? "").trim()
        const sentiment = (item?.sentiment ?? "").trim().toLowerCase()
        const insight = (item?.insight ?? "").trim()
        const impact = (item?.impact ?? "").trim()
        const intensity = (item?.intensity ?? "").trim().toLowerCase()

        if (!aspectKey || !keyword) continue
        if (seenAspectKeys.has(aspectKey)) continue
        if (
            sentiment !== "good" &&
            sentiment !== "bad" &&
            sentiment !== "neutral"
        ) {
            continue
        }

        const normalized: AspectInsightItem = { aspectKey, keyword, sentiment }
        if (insight) normalized.insight = insight
        if (impact) normalized.impact = impact
        if (
            intensity === "low" ||
            intensity === "medium" ||
            intensity === "high"
        ) {
            normalized.intensity = intensity
        }
        clean.push(normalized)
        seenAspectKeys.add(aspectKey)
    }

    return clean.length > 0 ? clean : undefined
}

function mergeAspectInsightsToPersonalizedAspects(
    base: ChatMessage["personalizedTransitAspects"] | null | undefined,
    aspectInsights: AspectInsightItem[] | undefined,
) {
    if (!base || !aspectInsights?.length) return base ?? null
    const keywordItems: AspectKeywordItem[] = aspectInsights.map((item) => ({
        aspectKey: item.aspectKey,
        keyword: item.keyword,
        sentiment: item.sentiment,
        insight: item.insight,
    }))
    return mergeAspectKeywordsIntoAspects(base, keywordItems)
}

function filterPersonalizedAspectsByKeys(
    base: ChatMessage["personalizedTransitAspects"] | null | undefined,
    aspectKeys: Set<string>,
) {
    if (!base || aspectKeys.size === 0) return null

    const exactEvents = base.exact?.events.filter((event) =>
        aspectKeys.has(event.aspectKey),
    )
    const rangeEvents = base.range?.events.filter((event) =>
        aspectKeys.has(event.aspectKey),
    )

    const nextExact =
        base.exact && exactEvents && exactEvents.length > 0
            ? { ...base.exact, events: exactEvents }
            : null
    const nextRange =
        base.range && rangeEvents && rangeEvents.length > 0
            ? { ...base.range, events: rangeEvents }
            : null

    if (!nextExact && !nextRange) return null

    return {
        ...base,
        exact: nextExact,
        range: nextRange,
    }
}

function buildDiscussedAspectsFromInsights(
    base: ChatMessage["personalizedTransitAspects"] | null | undefined,
    aspectInsights: AspectInsightItem[] | undefined,
) {
    if (!base || !aspectInsights?.length) return null
    const merged = mergeAspectInsightsToPersonalizedAspects(
        base,
        aspectInsights,
    )
    const keys = new Set(aspectInsights.map((item) => item.aspectKey))
    return filterPersonalizedAspectsByKeys(merged, keys)
}

function areAspectInsightsEqual(
    left: ChatMessage["aspectInsights"],
    right: ChatMessage["aspectInsights"],
) {
    if (left === right) return true
    if (!left || !right) return !left && !right
    if (left.length !== right.length) return false
    for (let i = 0; i < left.length; i++) {
        const a = left[i]
        const b = right[i]
        if (!a || !b) return false
        if (
            a.aspectKey !== b.aspectKey ||
            a.keyword !== b.keyword ||
            a.sentiment !== b.sentiment ||
            a.insight !== b.insight
        ) {
            return false
        }
    }
    return true
}

function areStringArraysEqual(
    left: string[] | undefined,
    right: string[] | undefined,
) {
    if (left === right) return true
    if (!left || !right) return !left && !right
    if (left.length !== right.length) return false
    for (let i = 0; i < left.length; i++) {
        if (left[i] !== right[i]) return false
    }
    return true
}

function normalizeStreamedPerCard(
    items:
        | Array<
              | {
                    cardName?: string | null
                    sentence?: string | null
                }
              | undefined
              | null
          >
        | undefined
        | null,
): ChatMessage["perCard"] | undefined {
    if (!Array.isArray(items)) return undefined
    const clean: NonNullable<ChatMessage["perCard"]> = []
    for (const item of items) {
        const cardName = item?.cardName?.trim() ?? ""
        const sentence = item?.sentence?.trim() ?? ""
        if (!cardName || !sentence) continue
        clean.push({ cardName, sentence })
    }
    return clean.length > 0 ? clean : undefined
}

function arePerCardEqual(
    left: ChatMessage["perCard"],
    right: ChatMessage["perCard"],
) {
    if (left === right) return true
    if (!left || !right) return !left && !right
    if (left.length !== right.length) return false
    for (let i = 0; i < left.length; i++) {
        const a = left[i]
        const b = right[i]
        if (!a || !b) return false
        if (a.cardName !== b.cardName || a.sentence !== b.sentence) return false
    }
    return true
}

/**
 * Follow-up chips: keep 2–4 trimmed strings; drop singletons or empty lists;
 * trim lists longer than 4. Supports legacy tarot (2) and current 3–4 prompts.
 */
function normalizeRestoredMessages(messages: ChatMessage[]): ChatMessage[] {
    return messages.map((m) => {
        if (!Array.isArray(m.followUpSuggestions)) return m
        const cleaned = m.followUpSuggestions
            .map((s) => (typeof s === "string" ? s.trim() : ""))
            .filter(Boolean)
        if (cleaned.length === 0) {
            return { ...m, followUpSuggestions: undefined }
        }
        if (cleaned.length === 1) {
            return { ...m, followUpSuggestions: undefined }
        }
        const capped = cleaned.length > 4 ? cleaned.slice(0, 4) : cleaned
        if (
            capped.length === m.followUpSuggestions.length &&
            capped.every((s, i) => s === m.followUpSuggestions![i])
        ) {
            return m
        }
        return { ...m, followUpSuggestions: capped }
    })
}

function areRelevanceEqual(
    left: ChatMessage["relevance"],
    right: ChatMessage["relevance"],
) {
    if (left === right) return true
    if (!left || !right) return !left && !right
    if (left.length !== right.length) return false
    for (let i = 0; i < left.length; i++) {
        const a = left[i]
        const b = right[i]
        if (!a || !b) return false
        if (a.label !== b.label || a.pct !== b.pct) return false
    }
    return true
}

function normalizeRelevance(
    items:
        | Array<
              | {
                    label?: string | null
                    pct?: number | null
                }
              | undefined
          >
        | undefined
        | null,
): ChatMessage["relevance"] | undefined {
    if (!items?.length) return undefined
    const clean = items
        .map((item) => {
            const label = (item?.label ?? "").trim()
            const pct = typeof item?.pct === "number" ? item.pct : NaN
            if (!label || !Number.isFinite(pct) || pct <= 0) return null
            return { label, pct: Math.max(0, Math.min(100, pct)) }
        })
        .filter((x): x is { label: string; pct: number } => x !== null)
        .slice(0, 5)
    return clean.length > 0 ? clean : undefined
}

function normalizeDailyVerdict(
    verdict:
        | {
              mood?: string | null
              headline?: string | null
              moodSubtitle?: string | null
              /** @deprecated — no longer generated; merged into detailedHtml for legacy payloads. */
              subtext?: string | null
              detailedHtml?: string | null
              /** @deprecated — older cached responses used `actions: string[]`. */
              actions?: Array<string | null | undefined> | null
              watchOut?: string | null
              focusArea?: string | null
              keyMessage?: {
                  headline?: string | null
                  subtitle?: string | null
              } | null
              mode?: string | null
              relevantPlanets?: Array<
                  | {
                        planet?: string | null
                        reason?: string | null
                    }
                  | null
                  | undefined
              > | null
              timingWindow?: {
                  startDateIso?: string | null
                  endDateIso?: string | null
              } | null
              targetDateIso?: string | null
          }
        | null
        | undefined,
    options?: {
        allowPartialDetailedHtml?: boolean
    },
): ChatMessage["dailyVerdict"] | undefined {
    if (!verdict) return undefined
    const mood = verdict.mood
    if (mood !== "good" && mood !== "caution" && mood !== "rest")
        return undefined
    const headline = (verdict.headline ?? "").trim()
    if (!headline) return undefined

    // Prefer `detailedHtml`; fall back to legacy `actions` (ordered list) or
    // legacy plain `subtext` wrapped as a single paragraph.
    let detailedHtml = (verdict.detailedHtml ?? "").trim()
    if (!detailedHtml && Array.isArray(verdict.actions)) {
        const legacyActions = verdict.actions
            .map((a) => (typeof a === "string" ? a.trim() : ""))
            .filter(Boolean)
            .slice(0, 3)
        if (legacyActions.length > 0) {
            detailedHtml = `<ol>${legacyActions
                .map((a) => `<li>${a}</li>`)
                .join("")}</ol>`
        }
    }
    if (!detailedHtml) {
        const legacySubtext = (verdict.subtext ?? "").trim()
        if (legacySubtext) {
            detailedHtml = `<p>${legacySubtext}</p>`
        }
    }
    if (!detailedHtml && !options?.allowPartialDetailedHtml) return undefined

    const watchOut = verdict.watchOut?.trim() || undefined
    const focusArea = verdict.focusArea?.trim() || undefined
    const moodSubtitle = verdict.moodSubtitle?.trim() || undefined
    const keyMessageHeadline = verdict.keyMessage?.headline?.trim() ?? ""
    const keyMessageSubtitle = verdict.keyMessage?.subtitle?.trim() ?? ""
    const keyMessage = keyMessageHeadline
        ? {
              headline: keyMessageHeadline,
              subtitle: keyMessageSubtitle,
          }
        : undefined
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/
    const timingWindow =
        verdict.timingWindow &&
        typeof verdict.timingWindow.startDateIso === "string" &&
        typeof verdict.timingWindow.endDateIso === "string" &&
        isoPattern.test(verdict.timingWindow.startDateIso) &&
        isoPattern.test(verdict.timingWindow.endDateIso)
            ? {
                  startDateIso: verdict.timingWindow.startDateIso,
                  endDateIso:
                      verdict.timingWindow.endDateIso <
                      verdict.timingWindow.startDateIso
                          ? verdict.timingWindow.startDateIso
                          : verdict.timingWindow.endDateIso,
              }
            : undefined
    const relevantPlanets = Array.isArray(verdict.relevantPlanets)
        ? verdict.relevantPlanets
              .map((rp) => {
                  const planet = (rp?.planet ?? "").trim()
                  const reason = (rp?.reason ?? "").trim()
                  if (!planet) return null
                  return { planet, reason }
              })
              .filter((rp): rp is { planet: string; reason: string } => !!rp)
              .slice(0, 4)
        : undefined
    const mode =
        verdict.mode === "natal"
            ? "natal"
            : verdict.mode === "timing"
              ? "timing"
              : verdict.mode === "technical"
                ? "technical"
                : timingWindow
                  ? "timing"
                  : relevantPlanets && relevantPlanets.length > 0
                    ? "natal"
                    : "daily"
    const targetDateIso =
        typeof verdict.targetDateIso === "string" &&
        isoPattern.test(verdict.targetDateIso)
            ? verdict.targetDateIso
            : undefined
    return {
        mood,
        headline,
        detailedHtml,
        watchOut,
        focusArea,
        moodSubtitle,
        keyMessage,
        mode,
        relevantPlanets:
            (mode === "natal" || mode === "technical") &&
            relevantPlanets &&
            relevantPlanets.length > 0
                ? relevantPlanets
                : undefined,
        timingWindow: mode === "timing" ? timingWindow : undefined,
        targetDateIso: mode === "technical" ? targetDateIso : undefined,
    }
}

function extractVerdictPayload(
    payload:
        | ({
              dailyVerdict?: unknown
          } & Record<string, unknown>)
        | null
        | undefined,
) {
    if (!payload || typeof payload !== "object") return undefined
    return "dailyVerdict" in payload ? payload.dailyVerdict : payload
}

/** Short plain `message.text` when the reading is verdict-only (no /question body). */
function plainSummaryFromVerdict(
    verdict: NonNullable<ChatMessage["dailyVerdict"]>,
): string {
    const h = verdict.keyMessage?.headline?.trim() ?? ""
    const s = verdict.keyMessage?.subtitle?.trim() ?? ""
    const joined = [h, s].filter(Boolean).join(" ").trim()
    if (joined) return joined
    return verdict.headline.trim()
}

function areDailyVerdictsEqual(
    a: ChatMessage["dailyVerdict"] | null | undefined,
    b: ChatMessage["dailyVerdict"] | null | undefined,
) {
    if (a === b) return true
    if (!a || !b) return false
    if (a.mood !== b.mood) return false
    if (a.headline !== b.headline) return false
    if ((a.watchOut ?? "") !== (b.watchOut ?? "")) return false
    if ((a.focusArea ?? "") !== (b.focusArea ?? "")) return false
    if ((a.moodSubtitle ?? "") !== (b.moodSubtitle ?? "")) return false
    if ((a.keyMessage?.headline ?? "") !== (b.keyMessage?.headline ?? ""))
        return false
    if ((a.keyMessage?.subtitle ?? "") !== (b.keyMessage?.subtitle ?? ""))
        return false
    if (a.detailedHtml !== b.detailedHtml) return false
    if ((a.mode ?? "daily") !== (b.mode ?? "daily")) return false
    const aPlanets = a.relevantPlanets ?? []
    const bPlanets = b.relevantPlanets ?? []
    if (aPlanets.length !== bPlanets.length) return false
    for (let i = 0; i < aPlanets.length; i++) {
        if (aPlanets[i].planet !== bPlanets[i].planet) return false
        if (aPlanets[i].reason !== bPlanets[i].reason) return false
    }
    if (
        (a.timingWindow?.startDateIso ?? "") !==
        (b.timingWindow?.startDateIso ?? "")
    )
        return false
    if (
        (a.timingWindow?.endDateIso ?? "") !==
        (b.timingWindow?.endDateIso ?? "")
    )
        return false
    if ((a.targetDateIso ?? "") !== (b.targetDateIso ?? "")) return false
    return true
}

type RawPredictionTimelineSlot = {
    slotKey?: string | null
    datetimeIso?: string | null
    label?: string | null
    mood?: string | null
    title?: string | null
    narrative?: string | null
    focusArea?: string | null
    tags?: Array<string | null | undefined> | null
}

type RawPredictionTimeline = {
    granularity?: string | null
    slots?: Array<RawPredictionTimelineSlot | null | undefined> | null
}

type NormalizedTimelineSlot = NonNullable<
    NonNullable<ChatMessage["timeline"]>["slots"][number]
>

const horoscopeVerdictStreamSchema = streamingDailyVerdictSchema.passthrough()

/**
 * Merges a streamed partial general reply onto whatever reply data the
 * message already has. Keeps previously-arrived fields when the stream emits a
 * later chunk that drops keys it had already filled, and skips no-op updates
 * so the message list does not thrash during streaming.
 */
function mergeGeneralReplyForMessage(
    previous: GeneralReply | null | undefined,
    incoming: StreamingGeneralReply | null | undefined,
): GeneralReply | null {
    if (!incoming) return previous ?? null
    const base: Partial<GeneralReply> = previous ? { ...previous } : {}
    if (incoming.innerEnergy) base.innerEnergy = incoming.innerEnergy
    if (typeof incoming.heroTitle === "string") base.heroTitle = incoming.heroTitle
    if (typeof incoming.innerDirection === "string")
        base.innerDirection = incoming.innerDirection
    if (typeof incoming.reflection === "string")
        base.reflection = incoming.reflection
    if (Array.isArray(incoming.currents)) {
        base.currents = incoming.currents
            .map((c) => ({
                label: typeof c?.label === "string" ? c.label : "",
                text: typeof c?.text === "string" ? c.text : "",
            }))
            .filter((c) => c.label.length > 0 || c.text.length > 0)
    }
    if (typeof incoming.whisper === "string") base.whisper = incoming.whisper
    if (Array.isArray(incoming.suggestions))
        base.suggestions = incoming.suggestions.filter(
            (s): s is string => typeof s === "string",
        )
    return base as GeneralReply
}

function areGeneralRepliesEqual(
    a: GeneralReply | null | undefined,
    b: GeneralReply | null | undefined,
) {
    if (a === b) return true
    if (!a || !b) return !a && !b
    if (a.innerEnergy !== b.innerEnergy) return false
    if (a.heroTitle !== b.heroTitle) return false
    if (a.innerDirection !== b.innerDirection) return false
    if (a.reflection !== b.reflection) return false
    if (a.whisper !== b.whisper) return false
    const aCurrents = a.currents ?? []
    const bCurrents = b.currents ?? []
    if (aCurrents.length !== bCurrents.length) return false
    for (let i = 0; i < aCurrents.length; i++) {
        if (aCurrents[i].label !== bCurrents[i].label) return false
        if (aCurrents[i].text !== bCurrents[i].text) return false
    }
    const aSugg = a.suggestions ?? []
    const bSugg = b.suggestions ?? []
    if (aSugg.length !== bSugg.length) return false
    for (let i = 0; i < aSugg.length; i++) {
        if (aSugg[i] !== bSugg[i]) return false
    }
    return true
}

function normalizePredictionTimeline(
    timeline: RawPredictionTimeline | null | undefined,
): ChatMessage["timeline"] | undefined {
    if (!timeline) return undefined
    // Streaming-friendly: until the LLM has emitted granularity we still
    // want to start showing slots, so default to "daily". The final chunk
    // overrides this with the correct value.
    const granularity: "hourly" | "daily" =
        timeline.granularity === "hourly" ? "hourly" : "daily"
    const rawSlots = Array.isArray(timeline.slots) ? timeline.slots : []
    const slots = rawSlots
        .map((slot, idx): NormalizedTimelineSlot | null => {
            if (!slot) return null
            const slotKeyRaw = (slot.slotKey ?? "").trim()
            const datetimeIso = (slot.datetimeIso ?? "").trim()
            const label = (slot.label ?? "").trim()
            const title = (slot.title ?? "").trim()
            const narrative = (slot.narrative ?? "").trim()
            // The schema streams slotKey/datetimeIso/label/mood/title before
            // narrative. Surface the slot the moment ANY of its identifying
            // or content fields is filled — that way the user sees a row
            // appear with the date as soon as the LLM emits its first
            // characters for that slot, and watches narrative fill in.
            if (!slotKeyRaw && !datetimeIso && !label && !title && !narrative) {
                return null
            }
            const slotKey = slotKeyRaw || `slot-${idx}`
            const moodRaw = slot.mood
            const mood: NormalizedTimelineSlot["mood"] =
                moodRaw === "good" ||
                moodRaw === "caution" ||
                moodRaw === "rest" ||
                moodRaw === "mixed"
                    ? moodRaw
                    : "mixed"
            const focusAreaRaw = (slot.focusArea ?? "").trim()
            const focusArea = focusAreaRaw || undefined
            const tags = (slot.tags ?? [])
                .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
                .filter((tag): tag is string => tag.length > 0)
                .slice(0, 3)
            return {
                slotKey,
                datetimeIso,
                label: label || title || datetimeIso || slotKey,
                mood,
                title: title || label || datetimeIso || slotKey,
                narrative,
                focusArea,
                tags: tags.length > 0 ? tags : undefined,
            }
        })
        .filter((s): s is NormalizedTimelineSlot => s !== null)
    if (slots.length === 0) return undefined
    return { granularity, slots }
}

function arePredictionTimelinesEqual(
    a: ChatMessage["timeline"] | null | undefined,
    b: ChatMessage["timeline"] | null | undefined,
) {
    if (a === b) return true
    if (!a || !b) return false
    if (a.granularity !== b.granularity) return false
    if (a.slots.length !== b.slots.length) return false
    for (let i = 0; i < a.slots.length; i++) {
        const sa = a.slots[i]
        const sb = b.slots[i]
        if (sa.slotKey !== sb.slotKey) return false
        if (sa.datetimeIso !== sb.datetimeIso) return false
        if (sa.mood !== sb.mood) return false
        if (sa.label !== sb.label) return false
        if (sa.title !== sb.title) return false
        if (sa.narrative !== sb.narrative) return false
        if ((sa.focusArea ?? "") !== (sb.focusArea ?? "")) return false
        const tagsA = sa.tags ?? []
        const tagsB = sb.tags ?? []
        if (tagsA.length !== tagsB.length) return false
        for (let j = 0; j < tagsA.length; j++) {
            if (tagsA[j] !== tagsB[j]) return false
        }
    }
    return true
}

export default function ChatSession({
    initialSession,
}: {
    initialSession?: ChatSessionPayload | null
}) {
    const tHome = useTranslations("Home")
    const tReadingTypes = useTranslations("Reading.types")
    const tHoroscope = useTranslations("HoroscopeChat")
    const tActionTrigger = useTranslations("ActionTrigger")

    const POSITION_MEANINGS: Record<string, string[]> = {
        simple: [tReadingTypes("simple.title")],
        general: [
            "Origin / Past / Root",
            "Current situation / Tension",
            "Direction / Likely outcome",
        ],
        detailed: [
            "Core situation",
            "Obstacle / challenge",
            "Hidden influence",
            "Advice / action",
            "Probable outcome",
        ],
        expanded: [
            "You",
            "The other person / external force",
            "Connection / interaction",
            "Strength",
            "Weakness",
            "Advice",
            "Outcome",
        ],
        celtic: [
            "Present situation",
            "Immediate challenge",
            "Root cause (subconscious)",
            "Past foundation",
            "Conscious goal",
            "Near future",
            "Self-perception",
            "External environment",
            "Hopes & fears",
            "Final outcome",
        ],
    }

    const locale = useLocale()
    const router = useRouter()
    const pathname = usePathname()
    const { user, loading: authLoading } = useAuth()
    const { subscription } = useActiveSubscription()
    const { profile, birthChart: storedBirthChart } = useProfile()
    const storedBirthChartPayload = useMemo(
        () =>
            storedBirthChart
                ? {
                      houses:
                          (storedBirthChart.houses as Record<
                              string,
                              unknown
                          > | null) ?? null,
                      planets:
                          (storedBirthChart.planets as Record<
                              string,
                              unknown
                          > | null) ?? null,
                  }
                : null,
        [storedBirthChart],
    )
    const [aiLocale, setAiLocale] = useState<"en" | "th" | "lo" | null>(null)
    const { stars, spendStars, initialized: starsInitialized } = useStars()
    const [question, setQuestion] = useState("")
    const promptsRaw = tHome.raw("prompts")
    const prompts = Array.isArray(promptsRaw)
        ? promptsRaw.filter((p): p is string => typeof p === "string")
        : []
    const [activePromptIndex, setActivePromptIndex] = useState(0)
    const [showPrompt, setShowPrompt] = useState(false)
    const [showLearnMore, setShowLearnMore] = useState(false)
    const [consulting, setConsulting] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        const restored = Array.isArray(initialSession?.messages)
            ? normalizeRestoredMessages(initialSession.messages)
            : []
        // Backfill the per-message context snapshot from the session's
        // initial originContext for any user message that doesn't already
        // carry one — sessions opened from /calendar should keep showing
        // the day pill above the first user bubble.
        const sessionOrigin = initialSession?.originContext ?? null
        if (!sessionOrigin) return restored
        return restored.map((m) =>
            m.role === "user" && !m.originContextSnapshot
                ? { ...m, originContextSnapshot: sessionOrigin }
                : m,
        )
    })
    const [decision, setDecision] = useState<ChatDecision | null>(
        initialSession?.decision ?? null,
    )
    const [isInterpreting, setIsInterpreting] = useState(false)
    const [lastQuestion, setLastQuestion] = useState(
        initialSession?.question ?? "",
    )
    const lastUserPrivacyRef = useRef<{
        storageKey?: string
        rawText?: string
    }>({})
    const [selectedCount, setSelectedCount] = useState(0)
    const [cardCountOverride, setCardCountOverride] = useState<number | null>(
        null,
    )
    const [cardSelectionResetSignal, setCardSelectionResetSignal] = useState(0)
    const [shuffleFn, setShuffleFn] = useState<(() => void) | null>(null)
    const [pickFn, setPickFn] = useState<((times?: number) => void) | null>(
        null,
    )
    const [selectByIndicesFn, setSelectByIndicesFn] = useState<
        ((indices: number[]) => void) | null
    >(null)
    const [assistantReactions, setAssistantReactions] = useState<
        Record<string, "like" | "dislike" | null>
    >({})
    const [messageNotices, setMessageNotices] = useState<
        Record<string, string>
    >({})
    const [readAloudLoadingMessageId, setReadAloudLoadingMessageId] = useState<
        string | null
    >(null)
    const [readAloudPlayingMessageId, setReadAloudPlayingMessageId] = useState<
        string | null
    >(null)
    const [readAloudConfirmOpen, setReadAloudConfirmOpen] = useState(false)
    const [readAloudPending, setReadAloudPending] = useState<{
        id: string
        text: string
    } | null>(null)
    const [readAloudDoNotShowAgain, setReadAloudDoNotShowAgain] =
        useState(false)
    const [composerSuggestionsEnabled, setComposerSuggestionsEnabled] =
        useState(true)
    const [sessionId] = useState<string | null>(initialSession?.id ?? null)
    const [originContext, setOriginContext] = useState<OriginContext | null>(
        initialSession?.originContext ?? null,
    )
    // Mirror originContext into a ref so the user-message-add callbacks
    // (memoised with stable deps for perf) snapshot the latest context
    // onto the new message even after the calendar tool refreshes it
    // mid-session.
    const originContextRef = useRef<OriginContext | null>(originContext)
    useEffect(() => {
        originContextRef.current = originContext
    }, [originContext])
    const [privacyAliases, setPrivacyAliases] = useState<PromptAliasEntry[]>([])
    const unmask = useCallback(
        (text?: string | null): string => {
            if (typeof text !== "string" || !text) return text ?? ""
            return unmaskTextWithAliases(text, privacyAliases)
        },
        [privacyAliases],
    )
    const [horoscopeQuestion, setHoroscopeQuestion] = useState<string | null>(
        null,
    )
    const [horoscopeBirth, setHoroscopeBirth] =
        useState<HoroscopeBirthData | null>(null)
    const [horoscopeTransit, setHoroscopeTransit] =
        useState<HoroscopeTransitData | null>(null)
    const [horoscopeSystem, setHoroscopeSystem] = useState<
        "western_tropical" | "vedic_sidereal" | "both"
    >("both")
    const [currentLocationFallback, setCurrentLocationFallback] = useState<{
        country?: string
        state?: string
        lat?: number
        lng?: number
        timezone?: number
    } | null>(null)
    const [showLocationDialog, setShowLocationDialog] = useState(false)
    const [locationDraftCountry, setLocationDraftCountry] = useState("")
    const [locationDraftState, setLocationDraftState] = useState("")
    const abortControllerRef = useRef<AbortController | null>(null)
    const [showInsufficientStars, setShowInsufficientStars] = useState<boolean>(
        initialSession?.showInsufficientStars ?? false,
    )
    const [insufficientStarsType, setInsufficientStarsType] = useState<
        "tarot" | "horoscope" | null
    >(() =>
        initialSession?.showInsufficientStars &&
        initialSession?.decision?.type === "horoscope"
            ? "horoscope"
            : null,
    )
    const [showCardDraw, setShowCardDraw] = useState(
        initialSession?.showCardDraw ?? false,
    )

    // Compose-access gating: only the owner and explicitly granted users may
    // submit messages. Owner-by-auth and owner-by-device-id are known
    // synchronously; non-owner authenticated users may still have a grant,
    // which we resolve via /access.
    const isAuthOwner = !!(
        user &&
        initialSession?.owner_user_id &&
        user.id === initialSession.owner_user_id
    )
    const ownerKnownSync =
        isAuthOwner || Boolean(initialSession?.youAreCreatorDevice)
    const [isOwner, setIsOwner] = useState<boolean>(ownerKnownSync)
    const [canCompose, setCanCompose] = useState<boolean>(ownerKnownSync)
    const [composeAuthLoaded, setComposeAuthLoaded] =
        useState<boolean>(ownerKnownSync)
    const [shareDialogOpen, setShareDialogOpen] = useState(false)
    const [accessRequestSent, setAccessRequestSent] = useState(false)
    const [accessRequestSending, setAccessRequestSending] = useState(false)

    const handleRequestAccess = useCallback(async () => {
        if (!sessionId) return
        setAccessRequestSending(true)
        try {
            const { data: sess } = await supabase.auth.getSession()
            const token = sess.session?.access_token
            if (!token) {
                toast.error("Sign in to request access")
                return
            }
            const res = await fetch(
                `/api/chat-sessions/${sessionId}/access/request`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({}),
                },
            )
            if (!res.ok) {
                const json = await res.json().catch(() => ({}))
                if (json?.error === "ALREADY_HAS_ACCESS") {
                    toast.success("You already have access")
                    setAccessRequestSent(true)
                    return
                }
                if (json?.error === "OWNER_NOT_REACHABLE") {
                    toast.error(
                        "The session creator can't receive requests",
                    )
                    return
                }
                if (json?.error === "REQUESTER_NOT_AUTHENTICATED") {
                    toast.error("Sign in to request access")
                    return
                }
                toast.error("Failed to send request")
                return
            }
            const json = await res.json().catch(() => ({}))
            if (json?.alreadyExists) {
                toast.message("Request already pending")
            } else {
                toast.success("Request sent")
            }
            setAccessRequestSent(true)
        } finally {
            setAccessRequestSending(false)
        }
    }, [sessionId])

    useEffect(() => {
        if (ownerKnownSync) {
            setIsOwner(true)
            setCanCompose(true)
            setComposeAuthLoaded(true)
            return
        }
        // Wait for auth context to settle before declaring "denied", so an
        // authenticated owner doesn't briefly see the view-only banner.
        if (authLoading) return
        if (!sessionId || !user) {
            setIsOwner(false)
            setCanCompose(false)
            setComposeAuthLoaded(true)
            return
        }
        let cancelled = false
        ;(async () => {
            try {
                const { data: sess } = await supabase.auth.getSession()
                const token = sess.session?.access_token
                if (!token) {
                    if (!cancelled) {
                        setIsOwner(false)
                        setCanCompose(false)
                        setComposeAuthLoaded(true)
                    }
                    return
                }
                const res = await fetch(
                    `/api/chat-sessions/${sessionId}/access`,
                    { headers: { Authorization: `Bearer ${token}` } },
                )
                if (!res.ok) {
                    if (!cancelled) {
                        setIsOwner(false)
                        setCanCompose(false)
                        setComposeAuthLoaded(true)
                    }
                    return
                }
                const json = await res.json()
                if (cancelled) return
                setIsOwner(Boolean(json?.isOwner))
                setCanCompose(Boolean(json?.canCompose))
                setComposeAuthLoaded(true)
            } catch {
                if (!cancelled) {
                    setIsOwner(false)
                    setCanCompose(false)
                    setComposeAuthLoaded(true)
                }
            }
        })()
        return () => {
            cancelled = true
        }
    }, [ownerKnownSync, sessionId, user, authLoading])

    useEffect(() => {
        if (!isOwner) return
        if (typeof window === "undefined") return
        const params = new URLSearchParams(window.location.search)
        if (params.get("share") === "requests") {
            setShareDialogOpen(true)
        }
    }, [isOwner])

    const [autoPickOn, setAutoPickOn] = useState(false)
    const [interpretationMode, setInterpretationMode] =
        useState<InterpretationMode>("auto")
    const [savedBirth, setSavedBirth] = useState<HoroscopeBirthData | null>(
        null,
    )
    const [editingMessageId, setEditingMessageId] = useState<string | null>(
        null,
    )
    const [editingDraft, setEditingDraft] = useState("")
    const messagesEndRef = useRef<HTMLDivElement | null>(null)
    const lastAssistantMessageRef = useRef<HTMLDivElement | null>(null)
    const cardDrawTargetRef = useRef<HTMLDivElement | null>(null)
    const insufficientStarsRef = useRef<HTMLDivElement | null>(null)
    const fixedBarRef = useRef<HTMLDivElement | null>(null)
    const [fixedBarHeight, setFixedBarHeight] = useState(0)
    const [composerScrollDown, setComposerScrollDown] = useState<{
        visible: boolean
        scrollToBottom?: () => void
    }>({ visible: false })
    const prevMessagesLengthRef = useRef(0)
    const prevConsultingRef = useRef(false)
    const prevIsInterpretingRef = useRef(false)
    const hasBootstrapped = useRef(false)
    const persistTimeoutRef = useRef<number | null>(null)
    const consultingLoadingIdRef = useRef<string | null>(null)
    const interpretationLoadingIdRef = useRef<string | null>(null)
    const horoscopeTargetMessageIdRef = useRef<string | null>(null)
    const horoscopeVerdictTargetMessageIdRef = useRef<string | null>(null)
    const generalReplyTargetMessageIdRef = useRef<string | null>(null)
    const oracleReplyTargetMessageIdRef = useRef<string | null>(null)
    const horoscopeIsRefetchRef = useRef(false)
    const horoscopeRefetchSystemRef = useRef<
        "western_tropical" | "vedic_sidereal" | null
    >(null)
    const horoscopeCachedBeforeRefetchRef = useRef<
        "western_tropical" | "vedic_sidereal" | null
    >(null)
    const horoscopeLastTransitRef = useRef<HoroscopeTransitData | null>(null)
    /**
     * Latest question classification + resolved time range returned by
     * `/api/horoscope/extract`. We forward these to the downstream verdict,
     * question, timeline, and chart-data routes so they don't need to
     * re-run classification / `resolveQuestionTimeRangeAsync` themselves.
     */
    const horoscopeClassificationRef = useRef<Record<string, unknown> | null>(
        null,
    )
    const horoscopeQuestionRangeRef = useRef<Record<string, unknown> | null>(
        null,
    )
    /** When /verdict returns non-single-day first, we reuse prefetched /chart-data and skip a duplicate /verdict in the useObject sidecars. */
    const horoscopePrefetchBundleRef = useRef<{
        messageId: string
        chartData: Record<string, unknown> | null
        skipVerdictFetch: boolean
    } | null>(null)
    const autoPickTriggeredRef = useRef(false)
    const readAloudAudioRef = useRef<HTMLAudioElement | null>(null)
    const readAloudObjectUrlsRef = useRef<Record<string, string>>({})
    const pendingAspectDetailRef = useRef<{
        aspectKey: string
        event: SourceAspectEvent
    } | null>(null)

    const {
        submit: submitInterpretation,
        object: interpretationObject,
        stop: stopInterpretation,
    } = useObject({
        api: "/api/interpret-cards/question",
        schema: tarotInterpretationSchema,
        onFinish: ({ object }: { object: TarotInterpretation | undefined }) => {
            const lid = interpretationLoadingIdRef.current
            if (!lid || !object) return
            const insights = object.cardInsights?.filter(
                (s): s is string => typeof s === "string",
            )
            const detailedHtml =
                typeof object.detailedHtml === "string"
                    ? object.detailedHtml
                    : undefined
            const perCard = normalizeStreamedPerCard(object.perCard)
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === lid
                        ? {
                              ...m,
                              keyMessage:
                                  object.keyMessage?.trim() || m.keyMessage,
                              headline: object.headline?.trim() || m.headline,
                              subtitle: object.subtitle?.trim() || m.subtitle,
                              perCard: perCard ?? m.perCard,
                              nextStep: object.nextStep?.trim() || m.nextStep,
                              text: object.interpretation || m.text,
                              insights: insights ?? m.insights,
                              detailedHtml: detailedHtml ?? m.detailedHtml,
                              isLoading: false,
                              streamStopped: false,
                              followUpConclusion: object.conclusion?.trim(),
                              followUpSuggestions: object.suggestions
                                  ?.map((s) =>
                                      typeof s === "string" ? s.trim() : "",
                                  )
                                  .filter(Boolean)
                                  .slice(0, 4),
                              followUpLoading: false,
                          }
                        : m,
                ),
            )
            if (object.interpretation?.trim()) {
                fetch("/api/tarot/versions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        reading_id: lid,
                        content: object.interpretation,
                    }),
                }).catch(() => {})
            }

            interpretationLoadingIdRef.current = null
            setIsInterpreting(false)
        },
        onError: () => {
            const lid = interpretationLoadingIdRef.current
            if (lid) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === lid
                            ? {
                                  ...m,
                                  text: "Sorry, I couldn't interpret those cards. Please try again.",
                                  isLoading: false,
                              }
                            : m,
                    ),
                )
                interpretationLoadingIdRef.current = null
            }
            setIsInterpreting(false)
        },
    })

    const {
        submit: submitHoroscopeVerdict,
        object: horoscopeVerdictObject,
        stop: stopHoroscopeVerdict,
    } = useObject({
        api: "/api/horoscope/verdict",
        schema: horoscopeVerdictStreamSchema,
        onFinish: () => {
            horoscopeVerdictTargetMessageIdRef.current = null
        },
        onError: () => {
            horoscopeVerdictTargetMessageIdRef.current = null
        },
    })

    const {
        submit: submitGeneralReply,
        object: generalReplyObject,
        stop: stopGeneralReply,
    } = useObject({
        api: "/api/chat/question",
        schema: streamingGeneralReplySchema,
        // In parallel with the streamed reflection, fetch the full chart data
        // (birth chart + transit chart for the target date + personalized
        // transit aspects) so the Technical / Impacting-Aspects tabs of the
        // general hero can render. The body already carries birth + transit +
        // questionRange resolved by startGeneralReplyStream.
        fetch: async (url, options) => {
            const res = await fetch(url, options)
            const targetId = generalReplyTargetMessageIdRef.current
            if (targetId && options?.body) {
                try {
                    const bodyPayload =
                        typeof options.body === "string"
                            ? (JSON.parse(options.body) as Record<
                                  string,
                                  unknown
                              >)
                            : null
                    const birth = bodyPayload?.birth
                    if (bodyPayload && birth) {
                        fetch("/api/horoscope/chart-data", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                question: bodyPayload.question,
                                birth,
                                transit: bodyPayload.transit ?? null,
                                system: bodyPayload.system,
                                locale: bodyPayload.locale,
                                ...(bodyPayload.questionRange
                                    ? {
                                          questionRange:
                                              bodyPayload.questionRange,
                                      }
                                    : {}),
                            }),
                        })
                            .then((r) => r.json())
                            .then((chartData: Record<string, unknown>) => {
                                if (chartData.error) return
                                const fullAspects =
                                    (chartData.personalizedTransitAspects as ChatMessage["personalizedTransitAspects"]) ??
                                    null
                                setMessages((prev) =>
                                    prev.map((m) =>
                                        m.id === targetId
                                            ? {
                                                  ...m,
                                                  chartData,
                                                  personalizedTransitAspects:
                                                      fullAspects,
                                              }
                                            : m,
                                    ),
                                )
                            })
                            .catch(() => {
                                /* chart-data failed; tabs simply won't render */
                            })
                    }
                } catch {
                    /* body parse failed; skip the parallel chart-data fetch */
                }
            }
            return res
        },
        onFinish: ({ object }: { object: StreamingGeneralReply | undefined }) => {
            const targetId = generalReplyTargetMessageIdRef.current
            if (!targetId) return
            if (object) {
                const finalReply = mergeGeneralReplyForMessage(null, object)
                setMessages((prev) =>
                    prev.map((m) => {
                        if (m.id !== targetId) return m
                        const followUpSuggestions =
                            object.suggestions
                                ?.map((s) =>
                                    typeof s === "string" ? s.trim() : "",
                                )
                                .filter(Boolean)
                                .slice(0, 4) ?? m.followUpSuggestions
                        return {
                            ...m,
                            generalReply: finalReply,
                            followUpSuggestions,
                            isLoading: false,
                            streamStopped: false,
                            text:
                                finalReply?.reflection?.trim() ||
                                finalReply?.heroTitle ||
                                m.text,
                        }
                    }),
                )
            }
            generalReplyTargetMessageIdRef.current = null
            consultingLoadingIdRef.current = null
            setConsulting(false)
        },
        onError: (e: Error) => {
            console.error("[chat/question] stream error:", e)
            const targetId = generalReplyTargetMessageIdRef.current
            if (targetId && e?.name !== "AbortError") {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === targetId
                            ? {
                                  ...m,
                                  text:
                                      m.text ||
                                      "Sorry, something went wrong. Please try again.",
                                  isLoading: false,
                                  streamStopped: false,
                              }
                            : m,
                    ),
                )
            }
            generalReplyTargetMessageIdRef.current = null
            consultingLoadingIdRef.current = null
            setConsulting(false)
        },
    })

    const {
        submit: submitOracleReply,
        object: oracleReplyObject,
        stop: stopOracleReply,
    } = useObject({
        api: "/api/chat/oracle",
        schema: streamingOracleReadingSchema,
        onFinish: ({ object }) => {
            const targetId = oracleReplyTargetMessageIdRef.current
            if (!targetId) return
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === targetId
                        ? {
                              ...m,
                              oracleReading: object ?? m.oracleReading ?? null,
                              isLoading: false,
                              streamStopped: false,
                          }
                        : m,
                ),
            )
            oracleReplyTargetMessageIdRef.current = null
            consultingLoadingIdRef.current = null
            setConsulting(false)
        },
        onError: (e: unknown) => {
            console.error("[chat/oracle/useObject] stream error:", e)
            const targetId = oracleReplyTargetMessageIdRef.current
            if (targetId) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === targetId
                            ? {
                                  ...m,
                                  isLoading: false,
                                  streamStopped: false,
                              }
                            : m,
                    ),
                )
            }
            oracleReplyTargetMessageIdRef.current = null
            consultingLoadingIdRef.current = null
            setConsulting(false)
        },
    })

    const {
        submit: submitHoroscope,
        object: horoscopeObject,
        stop: stopHoroscope,
    } = useObject({
        api: "/api/horoscope/question",
        schema: horoscopeInterpretationSchema,
        fetch: async (url, options) => {
            let bodyPayload: Record<string, unknown> | null = null
            const nextOptions = { ...options }

            if (options?.body) {
                try {
                    bodyPayload =
                        typeof options.body === "string"
                            ? JSON.parse(options.body)
                            : (options.body as unknown as Record<
                                  string,
                                  unknown
                              >)
                    nextOptions.body = JSON.stringify({
                        ...bodyPayload,
                        planTier: subscription?.tier ?? "free",
                    })
                } catch {
                    bodyPayload = null
                }
            }

            const res = await fetch(url, nextOptions)
            const targetId = horoscopeTargetMessageIdRef.current
            if (targetId && bodyPayload) {
                try {
                    const {
                        question,
                        birth,
                        transit,
                        system,
                        locale,
                        classification,
                        questionRange,
                    } = bodyPayload ?? {}
                    const questionText =
                        typeof question === "string" ? question : ""
                    const replyStrategy =
                        (classification as { replyStrategy?: string } | undefined)
                            ?.replyStrategy ?? null
                    // Timing-mode questions get chartData + aspects from the
                    // verdict response; avoid racing chart-data with today's transit.
                    const skipParallelChartData =
                        replyStrategy === "timing" ||
                        (replyStrategy == null &&
                            looksLikeTimingQuestion(questionText))
                    if (question && birth) {
                        const bundle = horoscopePrefetchBundleRef.current
                        const prefetchedChart =
                            bundle?.messageId === targetId
                                ? bundle.chartData
                                : undefined
                        const skipVerdictFetch =
                            bundle?.messageId === targetId &&
                            bundle.skipVerdictFetch
                        if (bundle?.messageId === targetId) {
                            horoscopePrefetchBundleRef.current = null
                        }

                        const applyChartData = (
                            chartData: Record<string, unknown>,
                        ) => {
                            if (chartData.error) return
                            const msgId = targetId
                            const fullAspects =
                                (chartData.personalizedTransitAspects as ChatMessage["personalizedTransitAspects"]) ??
                                null
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === msgId
                                        ? {
                                              ...m,
                                              chartData,
                                              personalizedTransitAspects:
                                                  fullAspects,
                                              personalizedTransitAspectsMerged:
                                                  buildDiscussedAspectsFromInsights(
                                                      fullAspects,
                                                      m.aspectInsights,
                                                  ),
                                          }
                                        : m,
                                ),
                            )
                        }

                        if (
                            prefetchedChart &&
                            typeof prefetchedChart === "object" &&
                            !prefetchedChart.error
                        ) {
                            applyChartData(prefetchedChart)
                        } else if (!skipParallelChartData) {
                            fetch("/api/horoscope/chart-data", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    question,
                                    birth,
                                    transit,
                                    system,
                                    locale,
                                    ...(classification
                                        ? { classification }
                                        : {}),
                                    ...(questionRange
                                        ? { questionRange }
                                        : {}),
                                }),
                            })
                                .then((r) => r.json())
                                .then((chartData: Record<string, unknown>) => {
                                    applyChartData(chartData)
                                })
                                .catch(() => {
                                    /* chart-data fetch failed; cards just won't render */
                                })
                        }

                        // Dedicated VERDICT call — runs in parallel with the
                        // long-form question stream and chart-data fetch so
                        // the VerdictHero mounts as soon as the verdict
                        // endpoint resolves (typically well before the body
                        // stream completes). The server short-circuits to
                        // `{ dailyVerdict: null }` for non-single-day
                        // questions, so we don't need to gate here.
                        // When extract has classified the question, only
                        // call /verdict for the three flavors that produce
                        // a hero (daily/timing/natal). "timeline" and
                        // "general" never render a verdict, so skip the
                        // network round-trip entirely.
                        const verdictWouldRender =
                            replyStrategy == null ||
                            replyStrategy === "daily" ||
                            replyStrategy === "timing" ||
                            replyStrategy === "natal" ||
                            replyStrategy === "technical"
                        if (!skipVerdictFetch && verdictWouldRender) {
                            horoscopeVerdictTargetMessageIdRef.current =
                                targetId
                            submitHoroscopeVerdict({
                                question,
                                birth,
                                transit,
                                system,
                                locale,
                                conversationContext:
                                    bodyPayload?.conversationContext,
                                ...(classification ? { classification } : {}),
                                ...(questionRange ? { questionRange } : {}),
                            })
                        }

                        // Dedicated TIMELINE call — runs in parallel with the
                        // body stream and verdict. Only fire when extract
                        // selected the timeline strategy; legacy callers
                        // without classification still hit the route (the
                        // route will short-circuit when it isn't predictive).
                        const shouldFetchTimeline =
                            replyStrategy == null || replyStrategy === "timeline"
                        if (shouldFetchTimeline) {
                            fetch("/api/horoscope/timeline", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    question,
                                    birth,
                                    transit,
                                    system,
                                    locale,
                                    conversationContext:
                                        bodyPayload?.conversationContext,
                                    ...(classification
                                        ? { classification }
                                        : {}),
                                    ...(questionRange
                                        ? { questionRange }
                                        : {}),
                                }),
                            })
                            .then((r) => r.json())
                            .then((data: Record<string, unknown>) => {
                                if (data.error) return
                                const timeline = normalizePredictionTimeline(
                                    data.timeline as RawPredictionTimeline,
                                )
                                if (!timeline) return
                                const msgId = targetId
                                setMessages((prev) =>
                                    prev.map((m) => {
                                        if (m.id !== msgId) return m
                                        if (
                                            arePredictionTimelinesEqual(
                                                m.timeline,
                                                timeline,
                                            )
                                        ) {
                                            return m
                                        }
                                        return { ...m, timeline }
                                    }),
                                )
                            })
                            .catch(() => {
                                /* timeline fetch failed — overview just won't
                                 * render the timeline section */
                            })
                        }
                    }
                } catch {
                    /* body parse failed */
                }
            }
            return res
        },
        onFinish: ({
            object,
        }: {
            object: HoroscopeInterpretation | undefined
        }) => {
            const targetId = horoscopeTargetMessageIdRef.current
            if (!targetId || !object) return
            const interpretation =
                object.interpretation?.trim() ||
                tHoroscope("fallbackAnswerError")
            const conclusion = object.conclusion?.trim() ?? null
            const aspectInsights = normalizeAspectInsights(
                object.aspectInsights,
            )
            const relevance = normalizeRelevance(object.relevance)
            const dailyVerdict = normalizeDailyVerdict(
                (object as { dailyVerdict?: unknown }).dailyVerdict as
                    | Parameters<typeof normalizeDailyVerdict>[0]
                    | undefined,
            )
            const suggestions = (
                object.suggestions?.filter(
                    (s): s is string =>
                        typeof s === "string" && s.trim().length > 0,
                ) ?? []
            ).slice(0, 4)
            const refetchSystem = horoscopeRefetchSystemRef.current
            setMessages((prev) =>
                prev.map((m) => {
                    if (m.id !== targetId) return m
                    const fullAspects = m.personalizedTransitAspects ?? null
                    const mergedAspects = buildDiscussedAspectsFromInsights(
                        fullAspects,
                        aspectInsights,
                    )
                    const update: Partial<ChatMessage> = {
                        text: interpretation,
                        aspectInsights,
                        relevance,
                        dailyVerdict: dailyVerdict ?? null,
                        personalizedTransitAspects: fullAspects,
                        personalizedTransitAspectsMerged: mergedAspects,
                        followUpConclusion: conclusion ?? undefined,
                        followUpSuggestions:
                            suggestions.length > 0 ? suggestions : undefined,
                        isLoading: false,
                        streamStopped: false,
                    }
                    if (m.chartData) {
                        const chartDataObj = m.chartData as Record<
                            string,
                            unknown
                        >
                        const charts = chartDataObj?.charts as
                            | Array<{ system?: string }>
                            | undefined
                        const systemKey =
                            refetchSystem ??
                            (charts?.[0]?.system as
                                | "western_tropical"
                                | "vedic_sidereal"
                                | undefined) ??
                            "vedic_sidereal"
                        update.interpretationCache = {
                            ...m.interpretationCache,
                            [systemKey]: {
                                chartData: m.chartData,
                                text: interpretation,
                                aspectInsights,
                                relevance,
                                dailyVerdict: dailyVerdict ?? null,
                                timeline: m.timeline ?? null,
                                personalizedTransitAspects: fullAspects,
                                personalizedTransitAspectsMerged:
                                    mergedAspects ?? null,
                                followUpConclusion: conclusion ?? undefined,
                                followUpSuggestions:
                                    suggestions.length > 0
                                        ? suggestions
                                        : undefined,
                            },
                        }
                    }
                    return { ...m, ...update }
                }),
            )
            horoscopeTargetMessageIdRef.current = null
            horoscopeRefetchSystemRef.current = null
            horoscopeCachedBeforeRefetchRef.current = null
            setIsInterpreting(false)
        },
        onError: (e: Error) => {
            console.error("[horoscope/useObject] stream error:", e)
            const targetId = horoscopeTargetMessageIdRef.current
            if (!targetId) return
            const isAbort = e?.name === "AbortError"
            const isRefetch = horoscopeIsRefetchRef.current
            if (isAbort && !isRefetch) {
                setMessages((prev) => prev.filter((m) => m.id !== targetId))
            } else if (isAbort && isRefetch) {
                const cachedSystem = horoscopeCachedBeforeRefetchRef.current
                setMessages((prev) =>
                    prev.map((m) => {
                        if (m.id !== targetId) return m
                        if (
                            cachedSystem &&
                            m.interpretationCache?.[cachedSystem]
                        ) {
                            const cached = m.interpretationCache[cachedSystem]
                            return {
                                ...m,
                                chartData: cached.chartData,
                                personalizedTransitAspects:
                                    cached.personalizedTransitAspects ?? null,
                                personalizedTransitAspectsMerged:
                                    cached.personalizedTransitAspectsMerged ??
                                    null,
                                text: cached.text,
                                aspectInsights: cached.aspectInsights,
                                relevance: cached.relevance,
                                dailyVerdict: cached.dailyVerdict ?? null,
                                timeline: cached.timeline ?? null,
                                followUpConclusion: cached.followUpConclusion,
                                followUpSuggestions: cached.followUpSuggestions,
                                isLoading: false,
                            }
                        }
                        return { ...m, isLoading: false }
                    }),
                )
            } else {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === targetId
                            ? {
                                  ...m,
                                  text: tHoroscope("analysisFailed"),
                                  isLoading: false,
                              }
                            : m,
                    ),
                )
            }
            horoscopeTargetMessageIdRef.current = null
            horoscopeVerdictTargetMessageIdRef.current = null
            horoscopeRefetchSystemRef.current = null
            horoscopeCachedBeforeRefetchRef.current = null
            setIsInterpreting(false)
        },
    })

    const tryCompleteHoroscopeVerdictFirst = useCallback(
        async (
            loadingId: string,
            bodyPayload: {
                question: string
                locale?: string
                system?: "western_tropical" | "vedic_sidereal" | "both"
                birth: Record<string, unknown>
                transit: Record<string, unknown> | null
                conversationContext?: unknown
                classification?: Record<string, unknown>
                questionRange?: Record<string, unknown>
            },
        ): Promise<boolean> => {
            stopHoroscope()
            stopHoroscopeVerdict()
            horoscopeVerdictTargetMessageIdRef.current = null
            let verdictRes: Response
            let chartRes: Response
            try {
                ;[verdictRes, chartRes] = await Promise.all([
                    fetch("/api/horoscope/verdict", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            question: bodyPayload.question,
                            birth: bodyPayload.birth,
                            transit: bodyPayload.transit,
                            system: bodyPayload.system,
                            locale: bodyPayload.locale,
                            conversationContext:
                                bodyPayload.conversationContext,
                            ...(bodyPayload.classification
                                ? { classification: bodyPayload.classification }
                                : {}),
                            ...(bodyPayload.questionRange
                                ? { questionRange: bodyPayload.questionRange }
                                : {}),
                        }),
                    }),
                    fetch("/api/horoscope/chart-data", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            question: bodyPayload.question,
                            birth: bodyPayload.birth,
                            transit: bodyPayload.transit,
                            system: bodyPayload.system,
                            locale: bodyPayload.locale,
                            ...(bodyPayload.classification
                                ? { classification: bodyPayload.classification }
                                : {}),
                            ...(bodyPayload.questionRange
                                ? { questionRange: bodyPayload.questionRange }
                                : {}),
                        }),
                    }),
                ])
            } catch {
                return false
            }

            if (!verdictRes.ok) {
                return false
            }

            // Read chart-data in the background — we don't need it to start
            // streaming the verdict into the hero, only to finalize the
            // commit once the verdict text has finished arriving.
            const chartJsonPromise: Promise<Record<string, unknown>> =
                (async () => {
                    if (!chartRes.ok) return { error: "bad_status" }
                    try {
                        return (await chartRes.json()) as Record<
                            string,
                            unknown
                        >
                    } catch {
                        return { error: "parse_failed" }
                    }
                })()

            // Stream the verdict response body so the VerdictHero paints the
            // mood pill, headline, key message, and detailedHtml as they
            // arrive — instead of holding the cosmic loader until the whole
            // JSON object has finished. We accumulate the raw text deltas
            // and parse them with the AI SDK's `parsePartialJson` helper,
            // which gracefully repairs unfinished JSON.
            let accumulatedText = ""
            let lastDispatchedVerdict: ChatMessage["dailyVerdict"] | null =
                null
            if (verdictRes.body) {
                const reader = verdictRes.body.getReader()
                const decoder = new TextDecoder()
                try {
                    while (true) {
                        const { value, done } = await reader.read()
                        if (done) break
                        if (!value || value.byteLength === 0) continue
                        accumulatedText += decoder.decode(value, {
                            stream: true,
                        })

                        const parsed = await parsePartialJson(accumulatedText)
                        if (
                            parsed.state !== "successful-parse" &&
                            parsed.state !== "repaired-parse"
                        ) {
                            continue
                        }
                        const payload = (parsed.value ?? null) as
                            | Record<string, unknown>
                            | null
                        if (!payload || typeof payload !== "object") continue
                        const extracted = extractVerdictPayload(
                            payload as {
                                dailyVerdict?: unknown
                            } & Record<string, unknown>,
                        ) as
                            | Parameters<typeof normalizeDailyVerdict>[0]
                            | undefined
                        const partialVerdict = normalizeDailyVerdict(
                            extracted,
                            { allowPartialDetailedHtml: true },
                        )
                        if (!partialVerdict) continue
                        if (
                            areDailyVerdictsEqual(
                                lastDispatchedVerdict,
                                partialVerdict,
                            )
                        ) {
                            continue
                        }
                        lastDispatchedVerdict = partialVerdict
                        // Keep `isLoading: true` while we're still streaming so
                        // the cancel button stays visible at the top of the
                        // reading. VerdictHero hides its inner loader as soon
                        // as `dailyVerdict.headline` is non-empty.
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === loadingId
                                    ? {
                                          ...m,
                                          dailyVerdict: partialVerdict,
                                      }
                                    : m,
                            ),
                        )
                    }
                    accumulatedText += decoder.decode()
                } catch {
                    return false
                }
            } else {
                try {
                    accumulatedText = await verdictRes.text()
                } catch {
                    return false
                }
            }

            let verdictJson: Record<string, unknown>
            try {
                verdictJson =
                    accumulatedText.trim().length > 0
                        ? (JSON.parse(accumulatedText) as Record<
                              string,
                              unknown
                          >)
                        : {}
            } catch {
                return false
            }

            const chartJson = await chartJsonPromise

            const verdict = normalizeDailyVerdict(
                extractVerdictPayload(verdictJson) as
                    | Parameters<typeof normalizeDailyVerdict>[0]
                    | undefined,
            )

            if (!verdict) {
                // The verdict endpoint returned an empty / unusable payload
                // (e.g. multi-day window the hero can't summarize). Roll back
                // any partial verdict we may have streamed in so the question
                // route doesn't render a half-built hero, and hand off to the
                // long-form interpretation stream.
                if (lastDispatchedVerdict) {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === loadingId
                                ? { ...m, dailyVerdict: null }
                                : m,
                        ),
                    )
                }
                horoscopePrefetchBundleRef.current = {
                    messageId: loadingId,
                    chartData: chartJson,
                    skipVerdictFetch: true,
                }
                return false
            }

            // Timing verdicts embed chartData + personalizedTransitAspects
            // computed at the AI-picked peak window. The parallel /chart-data
            // call uses the wide forward search window, which isn't useful
            // for the Technical Information / Aspect tabs — so when verdict
            // ships its own chart payload we prefer that.
            const verdictEmbeddedChart =
                verdictJson &&
                typeof verdictJson.chartData === "object" &&
                verdictJson.chartData !== null
                    ? (verdictJson.chartData as Record<string, unknown>)
                    : null
            const verdictEmbeddedAspects =
                verdictJson &&
                "personalizedTransitAspects" in verdictJson
                    ? (verdictJson.personalizedTransitAspects as ChatMessage["personalizedTransitAspects"]) ??
                      null
                    : null

            const chartOk =
                chartRes.ok &&
                chartJson &&
                typeof chartJson === "object" &&
                !chartJson.error
            const chartDataObj =
                verdictEmbeddedChart ?? (chartOk ? chartJson : null)
            const fullAspects =
                verdictEmbeddedAspects ??
                ((chartDataObj?.personalizedTransitAspects as ChatMessage["personalizedTransitAspects"]) ??
                    null)
            const overviewText = plainSummaryFromVerdict(verdict)
            const charts = chartDataObj?.charts as
                | Array<{ system?: string }>
                | undefined
            const systemKey =
                (charts?.[0]?.system as
                    | "western_tropical"
                    | "vedic_sidereal"
                    | undefined) ??
                (bodyPayload.system as
                    | "western_tropical"
                    | "vedic_sidereal"
                    | undefined) ??
                "vedic_sidereal"

            setMessages((prev) =>
                prev.map((m) => {
                    if (m.id !== loadingId) return m
                    const interpretationCache = chartDataObj
                        ? {
                              ...(m.interpretationCache ?? {}),
                              [systemKey]: {
                                  chartData: chartDataObj,
                                  text: overviewText,
                                  aspectInsights: undefined,
                                  relevance: undefined,
                                  dailyVerdict: verdict,
                                  timeline: null,
                                  personalizedTransitAspects: fullAspects,
                                  personalizedTransitAspectsMerged: null,
                                  followUpConclusion: undefined,
                                  followUpSuggestions: undefined,
                              },
                          }
                        : m.interpretationCache

                    return {
                        ...m,
                        isLoading: false,
                        streamStopped: false,
                        text: overviewText,
                        dailyVerdict: verdict,
                        chartData: chartDataObj,
                        aspectInsights: undefined,
                        relevance: undefined,
                        timeline: null,
                        personalizedTransitAspects: fullAspects,
                        personalizedTransitAspectsMerged: null,
                        followUpConclusion: undefined,
                        followUpSuggestions: undefined,
                        interpretationCache,
                    }
                }),
            )

            horoscopeTargetMessageIdRef.current = null
            horoscopeVerdictTargetMessageIdRef.current = null
            horoscopeIsRefetchRef.current = false
            horoscopeRefetchSystemRef.current = null
            horoscopeCachedBeforeRefetchRef.current = null
            setIsInterpreting(false)
            stopHoroscope()
            return true
        },
        [stopHoroscope, stopHoroscopeVerdict],
    )

    /**
     * Timeline-mode entry point. Fires /timeline (streaming JSON) and
     * /chart-data in parallel, streams the timeline slots into the
     * loading message as they arrive, and attaches chart data once
     * available. /question is NOT called — the timeline slots are the
     * reading.
     */
    const tryCompleteTimelineFirst = useCallback(
        async (
            loadingId: string,
            bodyPayload: {
                question: string
                locale?: string
                system?: "western_tropical" | "vedic_sidereal" | "both"
                birth: Record<string, unknown>
                transit: Record<string, unknown> | null
                conversationContext?: unknown
                classification?: Record<string, unknown>
                questionRange?: Record<string, unknown>
            },
        ): Promise<boolean> => {
            stopHoroscope()
            stopHoroscopeVerdict()
            horoscopeVerdictTargetMessageIdRef.current = null

            let timelineRes: Response
            let chartRes: Response
            try {
                ;[timelineRes, chartRes] = await Promise.all([
                    fetch("/api/horoscope/timeline", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            question: bodyPayload.question,
                            birth: bodyPayload.birth,
                            transit: bodyPayload.transit,
                            system: bodyPayload.system,
                            locale: bodyPayload.locale,
                            conversationContext:
                                bodyPayload.conversationContext,
                            ...(bodyPayload.classification
                                ? { classification: bodyPayload.classification }
                                : {}),
                            ...(bodyPayload.questionRange
                                ? { questionRange: bodyPayload.questionRange }
                                : {}),
                        }),
                    }),
                    fetch("/api/horoscope/chart-data", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            question: bodyPayload.question,
                            birth: bodyPayload.birth,
                            transit: bodyPayload.transit,
                            system: bodyPayload.system,
                            locale: bodyPayload.locale,
                            ...(bodyPayload.classification
                                ? { classification: bodyPayload.classification }
                                : {}),
                            ...(bodyPayload.questionRange
                                ? { questionRange: bodyPayload.questionRange }
                                : {}),
                        }),
                    }),
                ])
            } catch {
                return false
            }

            if (!timelineRes.ok) return false

            const chartJsonPromise: Promise<Record<string, unknown>> =
                (async () => {
                    if (!chartRes.ok) return { error: "bad_status" }
                    try {
                        return (await chartRes.json()) as Record<
                            string,
                            unknown
                        >
                    } catch {
                        return { error: "parse_failed" }
                    }
                })()

            // Stream the timeline body and update message.timeline slot-by-slot.
            let accumulatedText = ""
            if (timelineRes.body) {
                const reader = timelineRes.body.getReader()
                const decoder = new TextDecoder()
                try {
                    while (true) {
                        const { value, done } = await reader.read()
                        if (done) break
                        if (!value || value.byteLength === 0) continue
                        accumulatedText += decoder.decode(value, {
                            stream: true,
                        })

                        const parsed = await parsePartialJson(accumulatedText)
                        if (
                            parsed.state !== "successful-parse" &&
                            parsed.state !== "repaired-parse"
                        ) {
                            continue
                        }
                        const payload = (parsed.value ?? null) as
                            | Record<string, unknown>
                            | null
                        if (!payload || typeof payload !== "object") continue
                        const partialTimeline = normalizePredictionTimeline(
                            payload as RawPredictionTimeline,
                        )
                        if (!partialTimeline) continue
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === loadingId
                                    ? { ...m, timeline: partialTimeline }
                                    : m,
                            ),
                        )
                    }
                    accumulatedText += decoder.decode()
                } catch {
                    return false
                }
            } else {
                try {
                    accumulatedText = await timelineRes.text()
                } catch {
                    return false
                }
            }

            let finalTimeline: ChatMessage["timeline"] = null
            if (accumulatedText.trim().length > 0) {
                try {
                    const parsed = JSON.parse(accumulatedText) as unknown
                    finalTimeline = normalizePredictionTimeline(
                        parsed as RawPredictionTimeline,
                    )
                } catch {
                    /* keep the partial timeline already attached */
                }
            }

            const chartJson = await chartJsonPromise
            const chartOk =
                chartRes.ok &&
                chartJson &&
                typeof chartJson === "object" &&
                !chartJson.error
            const chartDataObj = chartOk ? chartJson : null
            const fullAspects =
                (chartDataObj?.personalizedTransitAspects as ChatMessage["personalizedTransitAspects"]) ??
                null

            setMessages((prev) =>
                prev.map((m) => {
                    if (m.id !== loadingId) return m
                    return {
                        ...m,
                        isLoading: false,
                        streamStopped: false,
                        text: "",
                        dailyVerdict: null,
                        chartData: chartDataObj,
                        aspectInsights: undefined,
                        relevance: undefined,
                        timeline: finalTimeline ?? m.timeline ?? null,
                        personalizedTransitAspects: fullAspects,
                        personalizedTransitAspectsMerged: null,
                        followUpConclusion: undefined,
                        followUpSuggestions: undefined,
                    }
                }),
            )

            horoscopeTargetMessageIdRef.current = null
            horoscopeIsRefetchRef.current = false
            setIsInterpreting(false)
            return true
        },
        [stopHoroscope, stopHoroscopeVerdict],
    )

    const buildConversationContext = useCallback(
        (currentQuestion?: string) =>
            buildConversationContextFromMessages(messages, currentQuestion),
        [messages],
    )

    const buildHoroscopeConversationContext = useCallback(
        (question: string) => buildConversationContext(question.trim()),
        [buildConversationContext],
    )

    // Stream interpretation object updates to the loading message
    useEffect(() => {
        const el = fixedBarRef.current
        if (!el) return
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setFixedBarHeight(entry.contentRect.height - 160)
            }
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    useEffect(() => {
        const lid = interpretationLoadingIdRef.current
        if (!lid || !interpretationObject) return
        const insights =
            interpretationObject.cardInsights?.filter(
                (s): s is string => typeof s === "string",
            ) ?? undefined
        const suggestions =
            interpretationObject.suggestions
                ?.map((s) => (typeof s === "string" ? s.trim() : ""))
                .filter(Boolean)
                .slice(0, 4) ?? undefined
        const detailedHtml =
            typeof interpretationObject.detailedHtml === "string"
                ? interpretationObject.detailedHtml
                : undefined
        const perCard = normalizeStreamedPerCard(interpretationObject.perCard)
        setMessages((prev) => {
            const m = prev.find((x) => x.id === lid)
            if (!m) return prev

            const nextText = interpretationObject.interpretation ?? m.text ?? ""
            const nextKeyMessage =
                interpretationObject.keyMessage?.trim() ?? m.keyMessage
            const nextHeadline =
                interpretationObject.headline?.trim() ?? m.headline
            const nextSubtitle =
                interpretationObject.subtitle?.trim() ?? m.subtitle
            const nextNextStep =
                interpretationObject.nextStep?.trim() ?? m.nextStep
            const nextPerCard = perCard ?? m.perCard
            const nextInsights = insights ?? m.insights
            const nextDetailedHtml = detailedHtml ?? m.detailedHtml
            const nextConclusion =
                interpretationObject.conclusion?.trim() ?? m.followUpConclusion
            const nextSuggestions = suggestions ?? m.followUpSuggestions

            const changed =
                nextKeyMessage !== m.keyMessage ||
                nextHeadline !== m.headline ||
                nextSubtitle !== m.subtitle ||
                nextNextStep !== m.nextStep ||
                !arePerCardEqual(nextPerCard, m.perCard) ||
                nextText !== m.text ||
                !areStringArraysEqual(nextInsights, m.insights) ||
                nextDetailedHtml !== m.detailedHtml ||
                nextConclusion !== m.followUpConclusion ||
                !areStringArraysEqual(nextSuggestions, m.followUpSuggestions)
            if (!changed) return prev

            return prev.map((mm) =>
                mm.id === lid
                    ? {
                          ...m,
                          keyMessage: nextKeyMessage,
                          headline: nextHeadline,
                          subtitle: nextSubtitle,
                          nextStep: nextNextStep,
                          perCard: nextPerCard,
                          text: nextText,
                          insights: nextInsights,
                          detailedHtml: nextDetailedHtml,
                          followUpConclusion: nextConclusion,
                          followUpSuggestions: nextSuggestions,
                      }
                    : mm,
            )
        })
    }, [interpretationObject])

    // Stream horoscope object updates to the loading message
    useEffect(() => {
        const targetId = horoscopeTargetMessageIdRef.current
        if (!targetId || !horoscopeObject) return
        const suggestions =
            horoscopeObject.suggestions
                ?.map((s) => (typeof s === "string" ? s.trim() : ""))
                .filter(Boolean)
                .slice(0, 4) ?? undefined
        const streamedInterpretation =
            horoscopeObject.interpretation ?? undefined
        const streamedAspectInsights = normalizeAspectInsights(
            horoscopeObject.aspectInsights,
        )
        const streamedRelevance = normalizeRelevance(horoscopeObject.relevance)
        const streamedConclusion =
            horoscopeObject.conclusion?.trim() ?? undefined
        const streamedDailyVerdict = normalizeDailyVerdict(
            (horoscopeObject as { dailyVerdict?: unknown }).dailyVerdict as
                | Parameters<typeof normalizeDailyVerdict>[0]
                | undefined,
        )
        setMessages((prev) => {
            const m = prev.find((x) => x.id === targetId)
            if (!m) return prev

            const nextText = streamedInterpretation ?? m.text ?? ""
            const nextAspectInsights =
                streamedAspectInsights ?? m.aspectInsights
            const shouldMergeAspects =
                !!streamedAspectInsights &&
                !areAspectInsightsEqual(
                    streamedAspectInsights,
                    m.aspectInsights,
                )
            const nextPersonalizedTransitAspectsMerged = shouldMergeAspects
                ? buildDiscussedAspectsFromInsights(
                      m.personalizedTransitAspects,
                      streamedAspectInsights,
                  )
                : m.personalizedTransitAspectsMerged
            const nextConclusion = streamedConclusion ?? m.followUpConclusion
            const nextSuggestions = suggestions ?? m.followUpSuggestions
            const nextRelevance = streamedRelevance ?? m.relevance
            const nextDailyVerdict = streamedDailyVerdict ?? m.dailyVerdict

            const changed =
                nextText !== m.text ||
                !areAspectInsightsEqual(nextAspectInsights, m.aspectInsights) ||
                nextPersonalizedTransitAspectsMerged !==
                    m.personalizedTransitAspectsMerged ||
                nextConclusion !== m.followUpConclusion ||
                !areStringArraysEqual(nextSuggestions, m.followUpSuggestions) ||
                !areRelevanceEqual(nextRelevance, m.relevance) ||
                !areDailyVerdictsEqual(nextDailyVerdict, m.dailyVerdict)
            if (!changed) return prev

            const nextMessage = {
                ...m,
                text: nextText,
                aspectInsights: nextAspectInsights,
                relevance: nextRelevance,
                dailyVerdict: nextDailyVerdict,
                personalizedTransitAspectsMerged:
                    nextPersonalizedTransitAspectsMerged,
                followUpConclusion: nextConclusion,
                followUpSuggestions: nextSuggestions,
            }
            return prev.map((mm) => (mm.id === targetId ? nextMessage : mm))
        })
    }, [horoscopeObject])

    useEffect(() => {
        const targetId = horoscopeVerdictTargetMessageIdRef.current
        if (!targetId || !horoscopeVerdictObject) return

        const verdict = normalizeDailyVerdict(
            extractVerdictPayload(
                horoscopeVerdictObject as Record<string, unknown>,
            ) as Parameters<typeof normalizeDailyVerdict>[0],
            {
                allowPartialDetailedHtml: true,
            },
        )
        const bundledChartData =
            horoscopeVerdictObject.chartData &&
            typeof horoscopeVerdictObject.chartData === "object"
                ? (horoscopeVerdictObject.chartData as Record<string, unknown>)
                : null
        const bundledAspects =
            horoscopeVerdictObject.personalizedTransitAspects as
                | ChatMessage["personalizedTransitAspects"]
                | undefined

        if (!verdict && !bundledChartData && bundledAspects === undefined)
            return

        setMessages((prev) =>
            prev.map((m) => {
                if (m.id !== targetId) return m

                const nextDailyVerdict = verdict ?? m.dailyVerdict
                const nextChartData = bundledChartData ?? m.chartData
                const nextAspects =
                    bundledAspects !== undefined
                        ? bundledAspects
                        : m.personalizedTransitAspects
                const nextMergedAspects =
                    bundledAspects !== undefined
                        ? buildDiscussedAspectsFromInsights(
                              bundledAspects ?? null,
                              m.aspectInsights,
                          )
                        : m.personalizedTransitAspectsMerged

                const changed =
                    !areDailyVerdictsEqual(nextDailyVerdict, m.dailyVerdict) ||
                    nextChartData !== m.chartData ||
                    nextAspects !== m.personalizedTransitAspects ||
                    nextMergedAspects !== m.personalizedTransitAspectsMerged

                if (!changed) return m

                return {
                    ...m,
                    dailyVerdict: nextDailyVerdict,
                    chartData: nextChartData,
                    personalizedTransitAspects: nextAspects,
                    personalizedTransitAspectsMerged: nextMergedAspects,
                }
            }),
        )
    }, [horoscopeVerdictObject])

    useEffect(() => {
        const targetId = generalReplyTargetMessageIdRef.current
        if (!targetId || !generalReplyObject) return
        setMessages((prev) => {
            const m = prev.find((x) => x.id === targetId)
            if (!m) return prev
            const next = mergeGeneralReplyForMessage(
                m.generalReply,
                generalReplyObject as StreamingGeneralReply,
            )
            if (areGeneralRepliesEqual(next, m.generalReply)) return prev
            return prev.map((mm) =>
                mm.id === targetId
                    ? {
                          ...m,
                          generalReply: next,
                      }
                    : mm,
            )
        })
    }, [generalReplyObject])

    useEffect(() => {
        const targetId = oracleReplyTargetMessageIdRef.current
        if (!targetId || !oracleReplyObject) return
        setMessages((prev) => {
            const m = prev.find((x) => x.id === targetId)
            if (!m) return prev
            const incoming = oracleReplyObject as StreamingOracleReading
            const current = m.oracleReading ?? null
            if (
                current &&
                current.energy === incoming.energy &&
                current.energyLabel === incoming.energyLabel &&
                current.message === incoming.message &&
                current.deeperMeaning === incoming.deeperMeaning &&
                current.closing === incoming.closing &&
                (current.guidance?.length ?? 0) ===
                    (incoming.guidance?.length ?? 0) &&
                (current.guidance ?? []).every(
                    (g, i) => g === incoming.guidance?.[i],
                )
            ) {
                return prev
            }
            return prev.map((mm) =>
                mm.id === targetId
                    ? {
                          ...mm,
                          oracleReading: incoming,
                      }
                    : mm,
            )
        })
    }, [oracleReplyObject])

    const freezeStoppedPlainMessage = useCallback((targetId: string) => {
        setMessages((prev) => {
            const target = prev.find((m) => m.id === targetId)
            if (!target) return prev
            if (!target.text?.trim()) {
                return prev.filter((m) => m.id !== targetId)
            }
            return prev.map((m) =>
                m.id === targetId
                    ? {
                          ...m,
                          isLoading: false,
                          streamStopped: true,
                      }
                    : m,
            )
        })
    }, [])

    const finalizeConsultingStream = useCallback(() => {
        const targetId = consultingLoadingIdRef.current
        if (!targetId) return false

        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }

        freezeStoppedPlainMessage(targetId)
        consultingLoadingIdRef.current = null
        setConsulting(false)
        setIsInterpreting(false)
        return true
    }, [freezeStoppedPlainMessage])

    const finalizeTarotInterpretationStream = useCallback(() => {
        const targetId = interpretationLoadingIdRef.current
        if (!targetId) return false

        const insights =
            interpretationObject?.cardInsights?.filter(
                (s): s is string => typeof s === "string",
            ) ?? undefined
        const suggestions =
            interpretationObject?.suggestions
                ?.map((s) => (typeof s === "string" ? s.trim() : ""))
                .filter(Boolean)
                .slice(0, 4) ?? undefined
        const detailedHtml =
            typeof interpretationObject?.detailedHtml === "string"
                ? interpretationObject.detailedHtml
                : undefined
        const perCard = normalizeStreamedPerCard(interpretationObject?.perCard)

        setMessages((prev) =>
            prev.map((m) =>
                m.id === targetId
                    ? {
                          ...m,
                          keyMessage:
                              interpretationObject?.keyMessage?.trim() ??
                              m.keyMessage,
                          headline:
                              interpretationObject?.headline?.trim() ??
                              m.headline,
                          subtitle:
                              interpretationObject?.subtitle?.trim() ??
                              m.subtitle,
                          perCard: perCard ?? m.perCard,
                          nextStep:
                              interpretationObject?.nextStep?.trim() ??
                              m.nextStep,
                          text:
                              interpretationObject?.interpretation ??
                              m.text ??
                              "",
                          insights: insights ?? m.insights,
                          detailedHtml: detailedHtml ?? m.detailedHtml,
                          followUpConclusion:
                              interpretationObject?.conclusion?.trim() ??
                              m.followUpConclusion,
                          followUpSuggestions:
                              suggestions ?? m.followUpSuggestions,
                          followUpLoading: false,
                          isLoading: false,
                          streamStopped: true,
                      }
                    : m,
            ),
        )

        interpretationLoadingIdRef.current = null
        setIsInterpreting(false)
        stopInterpretation()
        return true
    }, [interpretationObject, stopInterpretation])

    const finalizeHoroscopeStream = useCallback(() => {
        const targetId = horoscopeTargetMessageIdRef.current
        if (!targetId) return false

        const suggestions =
            horoscopeObject?.suggestions
                ?.map((s) => (typeof s === "string" ? s.trim() : ""))
                .filter(Boolean)
                .slice(0, 4) ?? undefined
        const streamedAspectInsights = normalizeAspectInsights(
            horoscopeObject?.aspectInsights,
        )
        const streamedRelevance = normalizeRelevance(horoscopeObject?.relevance)
        const streamedInterpretation =
            horoscopeObject?.interpretation ?? undefined
        const streamedConclusion =
            horoscopeObject?.conclusion?.trim() ?? undefined
        const streamedDailyVerdict = normalizeDailyVerdict(
            (horoscopeObject as { dailyVerdict?: unknown } | undefined)
                ?.dailyVerdict as
                | Parameters<typeof normalizeDailyVerdict>[0]
                | undefined,
        )

        setMessages((prev) =>
            prev.map((m) => {
                if (m.id !== targetId) return m

                const nextAspectInsights =
                    streamedAspectInsights ?? m.aspectInsights
                const nextPersonalizedTransitAspectsMerged =
                    streamedAspectInsights
                        ? buildDiscussedAspectsFromInsights(
                              m.personalizedTransitAspects,
                              streamedAspectInsights,
                          )
                        : m.personalizedTransitAspectsMerged

                return {
                    ...m,
                    text: streamedInterpretation ?? m.text ?? "",
                    aspectInsights: nextAspectInsights,
                    relevance: streamedRelevance ?? m.relevance,
                    dailyVerdict: streamedDailyVerdict ?? m.dailyVerdict,
                    personalizedTransitAspectsMerged:
                        nextPersonalizedTransitAspectsMerged,
                    followUpConclusion:
                        streamedConclusion ?? m.followUpConclusion,
                    followUpSuggestions: suggestions ?? m.followUpSuggestions,
                    followUpLoading: false,
                    isLoading: false,
                    streamStopped: true,
                }
            }),
        )

        horoscopeTargetMessageIdRef.current = null
        horoscopeVerdictTargetMessageIdRef.current = null
        horoscopeIsRefetchRef.current = false
        horoscopeRefetchSystemRef.current = null
        horoscopeCachedBeforeRefetchRef.current = null
        setIsInterpreting(false)
        stopHoroscope()
        stopHoroscopeVerdict()
        return true
    }, [horoscopeObject, stopHoroscope, stopHoroscopeVerdict])

    const finalizeGeneralReplyStream = useCallback(() => {
        const targetId = generalReplyTargetMessageIdRef.current
        if (!targetId) return false

        setMessages((prev) =>
            prev.map((m) => {
                if (m.id !== targetId) return m
                const merged = mergeGeneralReplyForMessage(
                    m.generalReply,
                    generalReplyObject as StreamingGeneralReply | undefined,
                )
                const followUpSuggestions =
                    (generalReplyObject as StreamingGeneralReply | undefined)
                        ?.suggestions?.map((s) =>
                            typeof s === "string" ? s.trim() : "",
                        )
                        .filter(Boolean)
                        .slice(0, 4) ?? m.followUpSuggestions
                return {
                    ...m,
                    generalReply: merged,
                    followUpSuggestions,
                    text:
                        merged?.reflection?.trim() ||
                        merged?.heroTitle ||
                        m.text ||
                        "",
                    isLoading: false,
                    streamStopped: true,
                }
            }),
        )

        generalReplyTargetMessageIdRef.current = null
        consultingLoadingIdRef.current = null
        setConsulting(false)
        stopGeneralReply()
        return true
    }, [generalReplyObject, stopGeneralReply])

    const finalizeOracleReplyStream = useCallback(() => {
        const targetId = oracleReplyTargetMessageIdRef.current
        if (!targetId) return false

        setMessages((prev) =>
            prev.map((m) => {
                if (m.id !== targetId) return m
                const merged =
                    (oracleReplyObject as StreamingOracleReading | undefined) ??
                    m.oracleReading ??
                    null
                return {
                    ...m,
                    oracleReading: merged,
                    text: merged?.message?.trim() || m.text || "",
                    isLoading: false,
                    streamStopped: true,
                }
            }),
        )

        oracleReplyTargetMessageIdRef.current = null
        consultingLoadingIdRef.current = null
        setConsulting(false)
        stopOracleReply()
        return true
    }, [oracleReplyObject, stopOracleReply])

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
            stopInterpretation()
            stopHoroscope()
            stopHoroscopeVerdict()
            stopGeneralReply()
            stopOracleReply()
        }
    }, [
        stopInterpretation,
        stopHoroscope,
        stopHoroscopeVerdict,
        stopGeneralReply,
        stopOracleReply,
    ])

    useEffect(() => {
        return () => {
            if (readAloudAudioRef.current) {
                readAloudAudioRef.current.pause()
                readAloudAudioRef.current.src = ""
            }
            Object.values(readAloudObjectUrlsRef.current).forEach((url) => {
                URL.revokeObjectURL(url)
            })
            readAloudObjectUrlsRef.current = {}
        }
    }, [])

    const persistSession = useCallback(
        async ({
            question: currentQuestion,
            messages: currentMessages,
            decision: currentDecision,
            showInsufficientStars: currentShowInsufficientStars,
            showCardDraw: currentShowCardDraw,
        }: {
            question: string
            messages: ChatMessage[]
            decision: ChatDecision | null
            showInsufficientStars: boolean
            showCardDraw: boolean
        }) => {
            if (!sessionId) return
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            }
            const { data: sess } = await supabase.auth.getSession()
            const token = sess.session?.access_token
            if (token) headers["Authorization"] = `Bearer ${token}`
            await fetch(`/api/chat-sessions/${sessionId}`, {
                method: "PATCH",
                headers,
                body: JSON.stringify({
                    question: currentQuestion,
                    messages: currentMessages,
                    decision: currentDecision,
                    showInsufficientStars: currentShowInsufficientStars,
                    showCardDraw: currentShowCardDraw,
                }),
            })
        },
        [sessionId],
    )

    const hasAssistantResponse = messages.some(
        (message) => message.role === "assistant",
    )
    const planTier = subscription?.tier ?? "free"
    const defaultCardsToSelect = useMemo(
        () => clampCardCountToTier(decision?.cardCount ?? 0, planTier),
        [decision, planTier],
    )
    const cardsToSelect = useMemo(
        () =>
            clampCardCountToTier(
                cardCountOverride ?? defaultCardsToSelect,
                planTier,
            ),
        [cardCountOverride, defaultCardsToSelect, planTier],
    )
    const isChatLoading = consulting || isInterpreting

    const effectiveLocale = normalizeLocale(aiLocale ?? locale)
    const cardUi = CARD_UI_TEXT[effectiveLocale]
    // Check if user has enough stars (at least 1) for card draw
    // Returns null while loading, true/false once initialized
    const hasEnoughStars = useMemo(() => {
        if (!starsInitialized) return null // Return null while loading to show loading state
        if (!Number.isFinite(stars as number)) return true
        return (stars as number) >= 1
    }, [stars, starsInitialized])

    // Track if we need to show star checking state
    const isCheckingStars =
        showCardDraw && cardsToSelect > 0 && hasEnoughStars === null
    const shortQuestion =
        lastQuestion.trim().length > 80
            ? `${lastQuestion.trim().slice(0, 77)}...`
            : lastQuestion.trim()

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setShowPrompt(true)
            setShowLearnMore(true)
        }, 3000)
        if (prompts.length === 0) {
            return () => {
                window.clearTimeout(timer)
            }
        }

        const interval = window.setInterval(() => {
            setActivePromptIndex((prev) => (prev + 1) % prompts.length)
        }, 6000)

        return () => {
            window.clearTimeout(timer)
            window.clearInterval(interval)
        }
    }, [prompts.length])

    useEffect(() => {
        setCardCountOverride(null)
        setSelectedCount(0)
        setCardSelectionResetSignal((prev) => prev + 1)
    }, [decision])

    useEffect(() => {
        const prevLen = prevMessagesLengthRef.current
        const prevConsulting = prevConsultingRef.current
        const prevIsInterpreting = prevIsInterpretingRef.current

        prevMessagesLengthRef.current = messages.length
        prevConsultingRef.current = consulting
        prevIsInterpretingRef.current = isInterpreting

        // When an AI response arrives (consulting/interpreting just finished and a
        // new assistant message has been appended), scroll to the *top* of that
        // assistant message so the user starts reading from the beginning.
        const lastMessage = messages[messages.length - 1]
        const didAppendMessage = messages.length > prevLen
        const didFinishLoading =
            (prevConsulting && !consulting) ||
            (prevIsInterpreting && !isInterpreting)

        if (
            didAppendMessage &&
            didFinishLoading &&
            lastMessage?.role === "assistant" &&
            lastAssistantMessageRef.current
        ) {
            lastAssistantMessageRef.current.scrollIntoView({
                behavior: "smooth",
                block: "start",
            })
            return
        }

        // Don't auto-scroll during streaming - keep viewport fixed
        if (consulting || isInterpreting) return
    }, [messages, consulting, showCardDraw, isInterpreting])

    useEffect(() => {
        const lastAssistant = [...messages]
            .reverse()
            .find((message) => message.role === "assistant" && message.text)
        if (!lastAssistant?.text) return
        const hasLao = /[\u0E80-\u0EFF]/.test(lastAssistant.text)
        const hasThai = /[\u0E00-\u0E7F]/.test(lastAssistant.text)
        const nextLocale = hasLao ? "lo" : hasThai ? "th" : "en"
        setAiLocale((prev) => (prev === nextLocale ? prev : nextLocale))
    }, [messages])

    useEffect(() => {
        if (!showCardDraw) {
            setSelectedCount(0)
            setShuffleFn(null)
            setPickFn(null)
        }
    }, [showCardDraw, cardsToSelect])

    // Update showInsufficientStars based on star balance (tarot draw)
    useEffect(() => {
        if (hasEnoughStars === true) {
            setShowInsufficientStars(false)
            setInsufficientStarsType(null)
        } else if (
            showCardDraw &&
            cardsToSelect > 0 &&
            hasEnoughStars === false
        ) {
            setShowInsufficientStars(true)
            setInsufficientStarsType("tarot")
        }
    }, [hasEnoughStars, showCardDraw, cardsToSelect])

    // Auto-pick flow: when auto pick is ON and cards need drawing with enough stars
    const runInterpretationForCards = useCallback(
        async (cards: { name: string; isReversed: boolean }[]) => {
            if (!lastQuestion) return

            const drawnCards: TarotCard[] = cards.map((card, index) => ({
                id: index + 1,
                name: card.name,
                image: `assets/rider-waite-tarot/${card.name
                    .toLowerCase()
                    .replace(/\s+/g, "-")}.png`,
                meaning: card.isReversed
                    ? `${card.name} (Reversed)`
                    : card.name,
                isReversed: card.isReversed,
            }))

            const cardNames = cards.map((card) =>
                card.isReversed ? `${card.name} (Reversed)` : card.name,
            )

            const loadingId = `assistant-interpretation-loading-${Date.now()}`
            const userPrivacy = lastUserPrivacyRef.current
            setMessages((prev) => [
                ...prev,
                {
                    id: loadingId,
                    role: "assistant",
                    text: "",
                    keyMessage: "",
                    variant: "box",
                    cards: drawnCards,
                    insights: [],
                    isLoading: true,
                    question: lastQuestion,
                    ...(userPrivacy?.storageKey && {
                        questionPrivacyStorageKey: userPrivacy.storageKey,
                        displayQuestion: userPrivacy.rawText,
                    }),
                    spreadType: decision?.spreadType ?? null,
                },
            ])

            const lastInterpretationMsg = [...messages]
                .reverse()
                .find(
                    (m) =>
                        m.variant === "box" &&
                        !m.isLoading &&
                        m.question &&
                        m.text?.trim(),
                )
            const isFollowUp =
                Boolean(decision?.isFollowUp) && !!lastInterpretationMsg
            const previousQuestion = isFollowUp
                ? (lastInterpretationMsg?.question ?? null)
                : null
            const previousInterpretation = isFollowUp
                ? (lastInterpretationMsg?.text?.trim() ?? null)
                : null
            const conversationContext = buildConversationContext(lastQuestion)

            let situationData: {
                topic: string
                intent: string
                emotion: string
                focus: string
                questionDomain?: string
                cardMeanings: string[][]
                cardReadingDirection?: string
            } | null = null

            try {
                const res = await fetch("/api/situation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        question: lastQuestion,
                        cards: cardNames,
                        conversationContext:
                            conversationContext?.contextText ?? null,
                        previousInterpretation: previousInterpretation ?? null,
                    }),
                })
                if (res.ok) {
                    situationData = await res.json()
                }
            } catch (err) {
                console.error("[situation] extraction failed:", err)
            }

            const parsedQuestionDomain = parseQuestionDomain(
                situationData?.questionDomain,
            )
            if (situationData && parsedQuestionDomain !== undefined) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === loadingId
                            ? { ...m, questionDomain: parsedQuestionDomain }
                            : m,
                    ),
                )
            }

            interpretationLoadingIdRef.current = loadingId
            submitInterpretation({
                question: lastQuestion,
                cards: cardNames,
                readingType: decision?.spreadType ?? null,
                isFollowUp,
                previousQuestion,
                previousInterpretation,
                conversationContext,
                locale,
                situation: situationData
                    ? {
                          topic: situationData.topic,
                          intent: situationData.intent,
                          emotion: situationData.emotion,
                          focus: situationData.focus,
                          questionDomain: parsedQuestionDomain,
                          cardReadingDirection:
                              situationData.cardReadingDirection,
                      }
                    : undefined,
                cardEnergies: situationData?.cardMeanings,
            })
        },
        [
            lastQuestion,
            decision?.spreadType,
            decision?.isFollowUp,
            messages,
            buildConversationContext,
            locale,
            submitInterpretation,
        ],
    )

    // Reset auto-pick triggered when we leave draw state
    useEffect(() => {
        if (!showCardDraw) {
            autoPickTriggeredRef.current = false
        }
    }, [showCardDraw])

    useEffect(() => {
        setComposerSuggestionsEnabled(
            loadComposerSuggestionsEnabledFromStorage(),
        )
        setAutoPickOn(loadAutoPickFromStorage())
        setInterpretationMode(loadInterpretationModeFromStorage())
        setPrivacyAliases(loadSessionAliases(sessionId))
        const birth = loadBirthFromStorage()
        setSavedBirth(birth)
        if (
            birth?.country &&
            birth.lat != null &&
            birth.lng != null &&
            birth.timezone != null
        ) {
            setCurrentLocationFallback({
                country: birth.country,
                state: birth.state ?? undefined,
                lat: birth.lat,
                lng: birth.lng,
                timezone: birth.timezone,
            })
        } else {
            setCurrentLocationFallback(null)
        }
    }, [sessionId])

    useEffect(() => {
        if (user) return
        if (interpretationMode !== "horoscope") return
        setInterpretationMode("auto")
        saveInterpretationModeToStorage("auto")
    }, [user, interpretationMode])

    useEffect(() => {
        if (
            !autoPickOn ||
            !showCardDraw ||
            cardsToSelect <= 0 ||
            hasEnoughStars !== true ||
            autoPickTriggeredRef.current
        )
            return

        const starSuccess = spendStars(1)
        if (!starSuccess) return

        autoPickTriggeredRef.current = true
        setShowCardDraw(false)
        setIsInterpreting(true)

        const cards = pickRandomCards(cardsToSelect)
        runInterpretationForCards(cards)
    }, [
        autoPickOn,
        showCardDraw,
        cardsToSelect,
        hasEnoughStars,
        spendStars,
        runInterpretationForCards,
    ])

    useEffect(() => {
        if (!sessionId) return
        if (persistTimeoutRef.current) {
            window.clearTimeout(persistTimeoutRef.current)
        }
        persistTimeoutRef.current = window.setTimeout(() => {
            void persistSession({
                question: lastQuestion,
                messages,
                decision,
                showInsufficientStars,
                showCardDraw,
            })
        }, 400)
        return () => {
            if (persistTimeoutRef.current) {
                window.clearTimeout(persistTimeoutRef.current)
            }
        }
    }, [
        sessionId,
        lastQuestion,
        messages,
        decision,
        persistSession,
        showInsufficientStars,
        showCardDraw,
    ])

    const heroText = consulting
        ? `${tHome("consulting")}...`
        : tHome("hero.line1")

    const parseDecision = useCallback((raw: string): ChatDecision | null => {
        const start = raw.indexOf("{")
        const end = raw.lastIndexOf("}")
        if (start < 0 || end < 0 || end <= start) return null
        const jsonText = raw.slice(start, end + 1)
        try {
            return JSON.parse(jsonText) as ChatDecision
        } catch {
            return null
        }
    }, [])

    /**
     * Build the data the inline "horoscope requires sign in" block needs:
     * a sign-in href that returns to the current page after auth, and a
     * randomly picked teaser tarot card to invite the user to fall back to
     * a tarot draw.
     */
    const buildHoroscopeAuthGate = useCallback(
        (question: string): HoroscopeAuthGate => {
            const [picked] = pickRandomCards(1)
            const cardName = picked?.name ?? "The Star"
            const cardSlug = cardName.toLowerCase().replace(/\s+/g, "-")
            const callback = pathname && pathname.length > 0 ? pathname : "/"
            return {
                signInHref: `/signin?callbackUrl=${encodeURIComponent(callback)}`,
                question,
                cardName,
                cardSlug,
                cardIsReversed: Boolean(picked?.isReversed),
            }
        },
        [pathname],
    )

    /**
     * Detects the case where the classifier picked `horoscope` for a visitor
     * who is not signed in. Horoscope readings require an account, so we
     * downgrade the type to `chat` (no AI text streamed) and attach a gate
     * marker the UI uses to render an inline sign-in CTA + tarot fallback.
     * Returns `null` when no gate is required.
     */
    const detectHoroscopeAuthGate = useCallback(
        (decision: ChatDecision): HoroscopeAuthGate | null => {
            if (user) return null
            if (decision.type !== "horoscope") return null
            return buildHoroscopeAuthGate("")
        },
        [user, buildHoroscopeAuthGate],
    )

    const applyInterpretationModeOverride = useCallback(
        (decision: ChatDecision): ChatDecision => {
            if (interpretationMode === "auto") return decision
            // The "chat" interpretation mode is the merged chat+support mode:
            // the AI may pick either `chat` (plain knowledge answer) or
            // `support` (inline tool block for product topics like pricing,
            // contact, a specific tarot card, etc.). Anything else gets
            // downgraded to `chat` so reading flows are disabled here.
            if (interpretationMode === "chat") {
                if (decision.type === "chat" || decision.type === "support") {
                    return decision
                }
                return {
                    ...decision,
                    type: "chat",
                    spreadType: undefined,
                    cardCount: undefined,
                    spreadReason: undefined,
                    supportTopic: undefined,
                    supportCardSlug: undefined,
                }
            }
            // Support-mode answers about the product itself bypass tarot /
            // horoscope / oracle mode locks so users keep getting the right
            // inline tool block.
            if (decision.type === "support") return decision
            if (interpretationMode === "tarot") {
                return { ...decision, type: "draw" }
            }
            if (interpretationMode === "horoscope") {
                if (!user) return decision
                return { ...decision, type: "horoscope" }
            }
            if (interpretationMode === "oracle") {
                return {
                    ...decision,
                    type: "oracle",
                    spreadType: undefined,
                    cardCount: undefined,
                    spreadReason: undefined,
                    supportTopic: undefined,
                    supportCardSlug: undefined,
                }
            }
            return decision
        },
        [interpretationMode, user],
    )

    // Question phrasings that should force the calendar tool regardless of
    // how the classifier labels the decision. Matches Thai (both common
    // spellings), Lao, and several English variants.
    const CALENDAR_KEYWORDS = useMemo(
        () => [
            "ปฏิทินดวง",
            "ปฎิทินดวง",
            "ปฏิทินดวง",
            "ປະຕິທິນດວງ",
            "ປະຕິທິນ",
            "calendar year",
            "cosmic calendar",
            "year ahead",
            "year-ahead",
            "12-month view",
            "12 month view",
            "show me my calendar",
            "show my calendar",
        ],
        [],
    )
    const questionMatchesCalendarIntent = useCallback(
        (question: string) => {
            const lower = (question ?? "").toLowerCase()
            return CALENDAR_KEYWORDS.some((k) => lower.includes(k.toLowerCase()))
        },
        [CALENDAR_KEYWORDS],
    )
    const applyCalendarModeOverride = useCallback(
        (decision: ChatDecision, question: string): ChatDecision => {
            if (!questionMatchesCalendarIntent(question)) return decision
            return {
                ...decision,
                type: "horoscope",
                horoscopeMode: "calendar",
                // Don't carry over a stale spread choice from a draw classification.
                spreadType: undefined,
                spreadReason: undefined,
                cardCount: undefined,
                supportTopic: undefined,
                supportCardSlug: undefined,
            }
        },
        [questionMatchesCalendarIntent],
    )

    const normalizeDrawDecision = useCallback(
        (decision: ChatDecision) => {
            if (decision.type !== "draw") {
                return {
                    ...decision,
                    spreadType: undefined,
                    cardCount: undefined,
                    spreadReason: undefined,
                }
            }

            const rawSpreadType = decision.spreadType ?? "simple"
            const rawCount = getTarotCardCount(rawSpreadType)
            const tierMax = getMaxCardsForTier(planTier)
            if (rawCount <= tierMax) {
                return {
                    ...decision,
                    spreadType: rawSpreadType,
                    cardCount: rawCount,
                }
            }
            // Free tier hit: collapse to the largest spread that fits.
            // Allowed spread types (in ascending card count): simple(1), general(3).
            const downgradedSpread = tierMax >= 3 ? "general" : "simple"
            return {
                ...decision,
                spreadType: downgradedSpread,
                cardCount: getTarotCardCount(downgradedSpread),
            }
        },
        [planTier],
    )

    const getDefaultSystemByLocale = useCallback(() => {
        return getDefaultAstrologySystem(
            locale,
            currentLocationFallback?.country,
        ) as "western_tropical" | "vedic_sidereal"
    }, [locale, currentLocationFallback?.country])

    const ensureBirthTimeDefaults = useCallback(
        (data: HoroscopeBirthData | null): HoroscopeBirthData | null => {
            if (!data) return null
            if (data.hour != null && data.minute != null) return data
            return {
                ...data,
                hour: 0,
                minute: 0,
                timeHint: data.timeHint ?? "unknown",
            }
        },
        [],
    )

    const hasBirthDate = useCallback((data: HoroscopeBirthData | null) => {
        return Boolean(data?.day && data?.month && data?.year)
    }, [])

    /**
     * Kicks off the structured general (chat) reply via /api/chat/question.
     * The assistant message is then progressively populated by the streaming
     * `useObject` effect that watches `generalReplyObject`. Returns the
     * loadingId the caller already pushed so it can clear local refs in its
     * own finalization step.
     */
    const startGeneralReplyStream = useCallback(
        ({
            question,
            assistantLoadingId,
            isFollowUp,
            historyOverride,
        }: {
            question: string
            assistantLoadingId: string
            isFollowUp?: boolean
            historyOverride?: { role: string; text: string }[]
        }) => {
            const history =
                historyOverride ??
                messages.map((m) => ({
                    role: m.role,
                    text: m.text,
                }))
            const contextSummary = mergeOriginContextIntoSummary(
                originContext,
                buildSessionContextSummary(messages),
            )

            // Ground the inner-energy reflection in the asker's real
            // astrology when we have their birth data: prefer the signed-in
            // profile, fall back to the locally saved birth. The server
            // builds the birth chart, today's transit chart, and the live
            // transit activities from this. When no birth data exists the
            // reflection stays purely intuitive.
            const profileBirth = profileToHoroscopeBirthData(
                user ? profile : null,
            )
            const resolvedBirth = ensureBirthTimeDefaults(
                profileBirth
                    ? applyEphemerisLocationTimeDefaults(profileBirth)
                    : loadBirthFromStorage(),
            )
            const birthPayload =
                resolvedBirth && hasBirthDate(resolvedBirth)
                    ? {
                          day: resolvedBirth.day as number,
                          month: resolvedBirth.month as number,
                          year: resolvedBirth.year as number,
                          hour: resolvedBirth.hour,
                          minute: resolvedBirth.minute,
                          timeHint: resolvedBirth.timeHint,
                          timezone: resolvedBirth.timezone ?? 0,
                          lat: resolvedBirth.lat ?? 0,
                          lng: resolvedBirth.lng ?? 0,
                          country: resolvedBirth.country,
                          state: resolvedBirth.state,
                          usedLocationFallback:
                              resolvedBirth.usedLocationFallback,
                      }
                    : undefined

            // Resolve the "target date" the Technical / Aspect tabs anchor
            // on: a date explicitly mentioned in the question, otherwise
            // today. We send it as both an explicit transit (so the transit
            // chart is built for that day) and a single-day questionRange (so
            // the personalized aspects resolve exactly on that day).
            const targetDate =
                resolveDeterministicTransitDate(question) ??
                (() => {
                    const now = new Date()
                    return {
                        day: now.getUTCDate(),
                        month: now.getUTCMonth() + 1,
                        year: now.getUTCFullYear(),
                    }
                })()
            const targetIso = `${String(targetDate.year).padStart(4, "0")}-${String(
                targetDate.month,
            ).padStart(2, "0")}-${String(targetDate.day).padStart(2, "0")}`
            const transitPayload = birthPayload
                ? {
                      day: targetDate.day,
                      month: targetDate.month,
                      year: targetDate.year,
                      hour: 12,
                      minute: 0,
                      timezone: birthPayload.timezone,
                      lat: birthPayload.lat,
                      lng: birthPayload.lng,
                      country: birthPayload.country,
                      state: birthPayload.state,
                  }
                : undefined
            const questionRangePayload = birthPayload
                ? {
                      startDateIso: targetIso,
                      endDateIso: targetIso,
                      durationDays: 1,
                      source: "explicit" as const,
                      granularity: "daily" as const,
                  }
                : undefined

            generalReplyTargetMessageIdRef.current = assistantLoadingId
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantLoadingId
                        ? {
                              ...m,
                              variant: "plain" as const,
                              generalReply: null,
                              isLoading: true,
                              streamStopped: false,
                          }
                        : m,
                ),
            )
            submitGeneralReply({
                question,
                isFollowUp,
                history,
                contextSummary: contextSummary || undefined,
                locale,
                system: getDefaultSystemByLocale(),
                birth: birthPayload,
                transit: transitPayload,
                questionRange: questionRangePayload,
            })
        },
        [
            ensureBirthTimeDefaults,
            getDefaultSystemByLocale,
            hasBirthDate,
            locale,
            messages,
            originContext,
            profile,
            submitGeneralReply,
            user,
        ],
    )

    /**
     * Kicks off the streaming oracle reading via /api/chat/oracle. Mirrors
     * startGeneralReplyStream but routes the assistant message through
     * OracleHero. The streamed object is piped into `message.oracleReading`
     * by the live-sync effect above.
     */
    const startOracleReplyStream = useCallback(
        ({
            question,
            assistantLoadingId,
            isFollowUp,
            historyOverride,
        }: {
            question: string
            assistantLoadingId: string
            isFollowUp?: boolean
            historyOverride?: { role: string; text: string }[]
        }) => {
            const history =
                historyOverride ??
                messages.map((m) => ({
                    role: m.role,
                    text: m.text,
                }))
            const contextSummary = mergeOriginContextIntoSummary(
                originContext,
                buildSessionContextSummary(messages),
            )

            oracleReplyTargetMessageIdRef.current = assistantLoadingId
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantLoadingId
                        ? {
                              ...m,
                              variant: "oracle" as const,
                              oracleReading: null,
                              isLoading: true,
                              streamStopped: false,
                          }
                        : m,
                ),
            )
            submitOracleReply({
                question,
                isFollowUp,
                history,
                contextSummary: contextSummary || undefined,
                locale,
            })
        },
        [locale, messages, originContext, submitOracleReply],
    )

    const runHoroscopeReading = useCallback(
        async (
            birth: HoroscopeBirthData,
            questionText: string,
            transit?: HoroscopeTransitData | null,
        ) => {
            if (!user) return
            const normalizedBirth = ensureBirthTimeDefaults(birth) ?? birth
            setIsInterpreting(true)
            const loadingId = `assistant-horoscope-loading-${Date.now()}`
            horoscopeIsRefetchRef.current = false
            horoscopeTargetMessageIdRef.current = loadingId
            horoscopeLastTransitRef.current = transit ?? null
            setMessages((prev) => {
                const last = prev[prev.length - 1]
                const withoutBridgeLoading =
                    last?.role === "assistant" &&
                    (last.variant === "plain" || !last.variant) &&
                    last.isLoading === true
                        ? prev.slice(0, -1)
                        : prev
                const pendingAspect = pendingAspectDetailRef.current
                const userPrivacy = lastUserPrivacyRef.current
                const strategy = (
                    horoscopeClassificationRef.current as
                        | { replyStrategy?: ChatMessage["replyStrategy"] }
                        | null
                )?.replyStrategy
                return [
                    ...withoutBridgeLoading,
                    {
                        id: loadingId,
                        role: "assistant" as const,
                        text: "",
                        variant: "horoscope" as const,
                        isLoading: true,
                        question: questionText,
                        ...(userPrivacy?.storageKey && {
                            questionPrivacyStorageKey: userPrivacy.storageKey,
                            displayQuestion: userPrivacy.rawText,
                        }),
                        horoscopeBirthData: normalizedBirth,
                        ...(strategy && { replyStrategy: strategy }),
                        ...(pendingAspect && {
                            sourceAspectKey: pendingAspect.aspectKey,
                            sourceAspectEvent: pendingAspect.event,
                        }),
                    },
                ]
            })
            const classification = horoscopeClassificationRef.current
            const questionRange = horoscopeQuestionRangeRef.current
            const prefetchBody = {
                question: questionText,
                locale,
                system: horoscopeSystem,
                birth: {
                    day: normalizedBirth.day,
                    month: normalizedBirth.month,
                    year: normalizedBirth.year,
                    hour: normalizedBirth.hour,
                    minute: normalizedBirth.minute,
                    timeHint: normalizedBirth.timeHint,
                    timezone: normalizedBirth.timezone,
                    lat: normalizedBirth.lat,
                    lng: normalizedBirth.lng,
                    country: normalizedBirth.country,
                    state: normalizedBirth.state,
                    usedLocationFallback: normalizedBirth.usedLocationFallback,
                },
                transit: transit
                    ? {
                          day: transit.day,
                          month: transit.month,
                          year: transit.year,
                          hour: transit.hour,
                          minute: transit.minute,
                          timezone: transit.timezone,
                          lat: transit.lat,
                          lng: transit.lng,
                          country: transit.country,
                          state: transit.state,
                      }
                    : null,
                conversationContext:
                    buildHoroscopeConversationContext(questionText),
                ...(classification ? { classification } : {}),
                ...(questionRange ? { questionRange } : {}),
            }
            const strategy = (
                classification as
                    | { replyStrategy?: ChatMessage["replyStrategy"] }
                    | null
            )?.replyStrategy

            const finishHandled = () => {
                setHoroscopeBirth(null)
                setHoroscopeQuestion(null)
                setHoroscopeTransit(null)
            }

            const surfaceError = () => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === loadingId
                            ? {
                                  ...m,
                                  text: tHoroscope("analysisFailed"),
                                  isLoading: false,
                              }
                            : m,
                    ),
                )
                setIsInterpreting(false)
            }

            // Strategy router: /question is only invoked for the "general"
            // fallback. Daily / timing / natal each go through the verdict
            // path; timeline streams /timeline + /chart-data and skips the
            // long-form interpretation entirely.
            if (strategy === "timeline") {
                const ok = await tryCompleteTimelineFirst(
                    loadingId,
                    prefetchBody,
                )
                if (!ok) surfaceError()
                finishHandled()
                return
            }

            if (
                strategy === "daily" ||
                strategy === "timing" ||
                strategy === "natal" ||
                strategy === "technical"
            ) {
                const ok = await tryCompleteHoroscopeVerdictFirst(
                    loadingId,
                    prefetchBody,
                )
                if (!ok) surfaceError()
                finishHandled()
                return
            }

            // General / unknown classification: the question doesn't fit a
            // specific astrology lens (daily / timing / natal / technical /
            // timeline). Instead of streaming the long-form horoscope answer
            // (which renders as a bare key-message block), fall back to the
            // general "inner energy reflection" hero — still grounded in the
            // user's birth chart, transit chart, and live aspects via
            // /api/chat/question. We reuse the existing loading message,
            // converting it from a horoscope reading into a general reply.
            horoscopeTargetMessageIdRef.current = null
            setIsInterpreting(false)
            startGeneralReplyStream({
                question: questionText,
                assistantLoadingId: loadingId,
            })
            finishHandled()
        },
        [
            buildHoroscopeConversationContext,
            ensureBirthTimeDefaults,
            horoscopeSystem,
            locale,
            startGeneralReplyStream,
            tHoroscope,
            tryCompleteHoroscopeVerdictFirst,
            tryCompleteTimelineFirst,
            user,
        ],
    )

    const regenerateHoroscopeAt = useCallback(
        async (messageId: string) => {
            const msg = messages.find((m) => m.id === messageId)
            if (!msg || msg.variant !== "horoscope" || !msg.chartData) return
            if (!user) return

            const birth = chartDataToBirth(
                msg.chartData as Record<string, unknown>,
            )
            if (!birth) return
            const transit = chartDataToTransit(
                msg.chartData as Record<string, unknown>,
            )
            const questionText = msg.question || "General horoscope reading"

            const chartDataObj = msg.chartData as Record<string, unknown>
            const charts = chartDataObj?.charts as
                | Array<{ system?: string }>
                | undefined
            const currentSystem =
                (charts?.[0]?.system as
                    | "western_tropical"
                    | "vedic_sidereal"
                    | undefined) ?? "vedic_sidereal"

            horoscopeIsRefetchRef.current = true
            horoscopeRefetchSystemRef.current = currentSystem
            horoscopeCachedBeforeRefetchRef.current = currentSystem
            horoscopeTargetMessageIdRef.current = messageId
            setIsInterpreting(true)

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId
                        ? {
                              ...m,
                              text: "",
                              aspectInsights: undefined,
                              relevance: undefined,
                              dailyVerdict: null,
                              timeline: null,
                              sourceAspectKey: undefined,
                              sourceAspectEvent: undefined,
                              personalizedTransitAspectsMerged: null,
                              followUpConclusion: undefined,
                              followUpSuggestions: undefined,
                              isLoading: true,
                              streamStopped: false,
                          }
                        : m,
                ),
            )
            const prefetchBody = {
                question: questionText,
                locale,
                system: currentSystem,
                birth: {
                    day: birth.day,
                    month: birth.month,
                    year: birth.year,
                    hour: birth.hour,
                    minute: birth.minute,
                    timeHint: birth.timeHint,
                    timezone: birth.timezone,
                    lat: birth.lat,
                    lng: birth.lng,
                    country: birth.country,
                    state: birth.state,
                    usedLocationFallback: birth.usedLocationFallback,
                },
                transit: transit
                    ? {
                          day: transit.day,
                          month: transit.month,
                          year: transit.year,
                          hour: transit.hour,
                          minute: transit.minute,
                          timezone: transit.timezone,
                          lat: transit.lat,
                          lng: transit.lng,
                          country: transit.country,
                          state: transit.state,
                      }
                    : null,
                conversationContext:
                    buildHoroscopeConversationContext(questionText),
            }
            const verdictOnly = await tryCompleteHoroscopeVerdictFirst(
                messageId,
                prefetchBody,
            )
            if (verdictOnly) {
                return
            }

            submitHoroscope({
                question: questionText,
                conversationContext:
                    buildHoroscopeConversationContext(questionText),
                locale,
                system: currentSystem,
                birth: {
                    day: birth.day,
                    month: birth.month,
                    year: birth.year,
                    hour: birth.hour,
                    minute: birth.minute,
                    timeHint: birth.timeHint,
                    timezone: birth.timezone,
                    lat: birth.lat,
                    lng: birth.lng,
                    country: birth.country,
                    state: birth.state,
                    usedLocationFallback: birth.usedLocationFallback,
                },
                transit: transit
                    ? {
                          day: transit.day,
                          month: transit.month,
                          year: transit.year,
                          hour: transit.hour,
                          minute: transit.minute,
                          timezone: transit.timezone,
                          lat: transit.lat,
                          lng: transit.lng,
                          country: transit.country,
                          state: transit.state,
                      }
                    : null,
                storedBirthChart: storedBirthChartPayload,
            })
        },
        [
            buildHoroscopeConversationContext,
            locale,
            messages,
            storedBirthChartPayload,
            submitHoroscope,
            tryCompleteHoroscopeVerdictFirst,
            user,
        ],
    )

    const regenerateTarotAt = useCallback(
        async (messageId: string) => {
            const msg = messages.find((m) => m.id === messageId)
            if (!msg || msg.variant !== "box" || !msg.cards?.length) return

            const questionText = msg.question || lastQuestion || ""
            const cardNames = msg.cards.map((c) => c.meaning)

            setIsInterpreting(true)
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId
                        ? {
                              ...m,
                              keyMessage: undefined,
                              headline: undefined,
                              subtitle: undefined,
                              perCard: undefined,
                              nextStep: undefined,
                              text: "",
                              insights: [],
                              detailedHtml: undefined,
                              followUpConclusion: undefined,
                              followUpSuggestions: undefined,
                              followUpLoading: false,
                              questionDomain: undefined,
                              isLoading: true,
                              streamStopped: false,
                          }
                        : m,
                ),
            )

            const lastInterpretationMsg = [...messages]
                .reverse()
                .find(
                    (m) =>
                        m.id !== messageId &&
                        m.variant === "box" &&
                        !m.isLoading &&
                        m.question &&
                        m.text?.trim(),
                )
            const isFollowUp =
                Boolean(decision?.isFollowUp) && !!lastInterpretationMsg
            const previousQuestion = isFollowUp
                ? (lastInterpretationMsg?.question ?? null)
                : null
            const previousInterpretation = isFollowUp
                ? (lastInterpretationMsg?.text?.trim() ?? null)
                : null
            const conversationContext = buildConversationContext(questionText)

            let situationData: {
                topic: string
                intent: string
                emotion: string
                focus: string
                questionDomain?: string
                cardMeanings: string[][]
                cardReadingDirection?: string
            } | null = null

            try {
                const res = await fetch("/api/situation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        question: questionText,
                        cards: cardNames,
                        conversationContext:
                            conversationContext?.contextText ?? null,
                        previousInterpretation: previousInterpretation ?? null,
                    }),
                })
                if (res.ok) {
                    situationData = await res.json()
                }
            } catch (err) {
                console.error("[situation] extraction failed:", err)
            }

            const parsedQuestionDomain = parseQuestionDomain(
                situationData?.questionDomain,
            )
            if (situationData && parsedQuestionDomain !== undefined) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? { ...m, questionDomain: parsedQuestionDomain }
                            : m,
                    ),
                )
            }

            interpretationLoadingIdRef.current = messageId
            submitInterpretation({
                question: questionText,
                cards: cardNames,
                readingType: msg.spreadType ?? null,
                isFollowUp,
                previousQuestion,
                previousInterpretation,
                conversationContext,
                locale,
                situation: situationData
                    ? {
                          topic: situationData.topic,
                          intent: situationData.intent,
                          emotion: situationData.emotion,
                          focus: situationData.focus,
                          questionDomain: parsedQuestionDomain,
                          cardReadingDirection:
                              situationData.cardReadingDirection,
                      }
                    : undefined,
                cardEnergies: situationData?.cardMeanings,
            })
        },
        [
            messages,
            lastQuestion,
            decision?.isFollowUp,
            buildConversationContext,
            locale,
            submitInterpretation,
        ],
    )

    const refetchHoroscopeWithSystem = useCallback(
        async (
            messageId: string,
            newSystem: "western_tropical" | "vedic_sidereal",
        ) => {
            const msg = messages.find((m) => m.id === messageId)
            if (!msg || msg.variant !== "horoscope" || !msg.chartData) return

            // Restore from cache if we have it
            const cached = msg.interpretationCache?.[newSystem]
            if (cached) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? {
                                  ...m,
                                  chartData: cached.chartData,
                                  personalizedTransitAspects:
                                      cached.personalizedTransitAspects ?? null,
                                  personalizedTransitAspectsMerged:
                                      cached.personalizedTransitAspectsMerged ??
                                      null,
                                  text: cached.text,
                                  aspectInsights: cached.aspectInsights,
                                  relevance: cached.relevance,
                                  dailyVerdict: cached.dailyVerdict ?? null,
                                  timeline: cached.timeline ?? null,
                                  followUpConclusion: cached.followUpConclusion,
                                  followUpSuggestions:
                                      cached.followUpSuggestions,
                                  isLoading: false,
                              }
                            : m,
                    ),
                )
                return
            }

            if (!user) return

            const birth = chartDataToBirth(
                msg.chartData as Record<string, unknown>,
            )
            if (!birth) return
            const transit = chartDataToTransit(
                msg.chartData as Record<string, unknown>,
            )
            const questionText = msg.question || "General horoscope reading"

            // Cache current interpretation before refetching
            const chartDataObj = msg.chartData as Record<string, unknown>
            const charts = chartDataObj?.charts as
                | Array<{ system?: string }>
                | undefined
            const currentSystem =
                (charts?.[0]?.system as
                    | "western_tropical"
                    | "vedic_sidereal"
                    | undefined) ?? "vedic_sidereal"
            const cacheEntry = {
                chartData: chartDataObj,
                text: msg.text ?? "",
                aspectInsights: msg.aspectInsights,
                relevance: msg.relevance,
                dailyVerdict: msg.dailyVerdict ?? null,
                timeline: msg.timeline ?? null,
                personalizedTransitAspects:
                    msg.personalizedTransitAspects ?? null,
                personalizedTransitAspectsMerged:
                    msg.personalizedTransitAspectsMerged ?? null,
                followUpConclusion: msg.followUpConclusion,
                followUpSuggestions: msg.followUpSuggestions,
            }

            horoscopeIsRefetchRef.current = true
            horoscopeRefetchSystemRef.current = newSystem
            horoscopeCachedBeforeRefetchRef.current = currentSystem
            horoscopeTargetMessageIdRef.current = messageId
            setIsInterpreting(true)

            // Clear old text, keep chart visible until new data arrives
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId
                        ? {
                              ...m,
                              text: "",
                              aspectInsights: undefined,
                              relevance: undefined,
                              dailyVerdict: null,
                              timeline: null,
                              personalizedTransitAspectsMerged: null,
                              followUpConclusion: undefined,
                              followUpSuggestions: undefined,
                              isLoading: true,
                              streamStopped: false,
                              interpretationCache: {
                                  ...m.interpretationCache,
                                  [currentSystem]: cacheEntry,
                              },
                          }
                        : m,
                ),
            )
            const prefetchBody = {
                question: questionText,
                locale,
                system: newSystem,
                birth: {
                    day: birth.day,
                    month: birth.month,
                    year: birth.year,
                    hour: birth.hour,
                    minute: birth.minute,
                    timeHint: birth.timeHint,
                    timezone: birth.timezone,
                    lat: birth.lat,
                    lng: birth.lng,
                    country: birth.country,
                    state: birth.state,
                    usedLocationFallback: birth.usedLocationFallback,
                },
                transit: transit
                    ? {
                          day: transit.day,
                          month: transit.month,
                          year: transit.year,
                          hour: transit.hour,
                          minute: transit.minute,
                          timezone: transit.timezone,
                          lat: transit.lat,
                          lng: transit.lng,
                          country: transit.country,
                          state: transit.state,
                      }
                    : null,
                conversationContext:
                    buildHoroscopeConversationContext(questionText),
            }
            const verdictOnly = await tryCompleteHoroscopeVerdictFirst(
                messageId,
                prefetchBody,
            )
            if (verdictOnly) {
                return
            }

            submitHoroscope({
                question: questionText,
                conversationContext:
                    buildHoroscopeConversationContext(questionText),
                locale,
                system: newSystem,
                birth: {
                    day: birth.day,
                    month: birth.month,
                    year: birth.year,
                    hour: birth.hour,
                    minute: birth.minute,
                    timeHint: birth.timeHint,
                    timezone: birth.timezone,
                    lat: birth.lat,
                    lng: birth.lng,
                    country: birth.country,
                    state: birth.state,
                    usedLocationFallback: birth.usedLocationFallback,
                },
                transit: transit
                    ? {
                          day: transit.day,
                          month: transit.month,
                          year: transit.year,
                          hour: transit.hour,
                          minute: transit.minute,
                          timezone: transit.timezone,
                          lat: transit.lat,
                          lng: transit.lng,
                          country: transit.country,
                          state: transit.state,
                      }
                    : null,
                storedBirthChart: storedBirthChartPayload,
            })
        },
        [
            buildHoroscopeConversationContext,
            locale,
            messages,
            storedBirthChartPayload,
            submitHoroscope,
            tryCompleteHoroscopeVerdictFirst,
            user,
        ],
    )

    const handleHoroscopeInput = useCallback(
        async (
            value: string,
            options: {
                appendUserMessage?: boolean
                birthDetailsOnly?: boolean
                preparedUserMessage?: ChatMessage
            } = {},
        ) => {
            const trimmed = value.trim()
            if (!trimmed) return
            if (!user) return
            setConsulting(true)
            try {
                const appendUserMessage = options.appendUserMessage !== false
                if (appendUserMessage) {
                    const preparedUserMessage = options.preparedUserMessage
                    setMessages((prev) => [
                        ...prev,
                        preparedUserMessage ?? {
                            id: `user-${Date.now()}`,
                            role: "user",
                            text: trimmed,
                            originContextSnapshot: originContextRef.current,
                        },
                    ])
                }

                const profilePayload = profile
                    ? {
                          name: profile.name ?? null,
                          birthDate: (() => {
                              const match = profile.birth_date
                                  ? /^(\d{4})-(\d{2})-(\d{2})/.exec(
                                        profile.birth_date.trim(),
                                    )
                                  : null
                              if (!match) return null
                              return {
                                  year: Number.parseInt(match[1], 10),
                                  month: Number.parseInt(match[2], 10),
                                  day: Number.parseInt(match[3], 10),
                              }
                          })(),
                          birthPlace: (() => {
                              const parts = (profile.birth_place || "")
                                  .split(",")
                                  .map((p) => p.trim())
                                  .filter(Boolean)
                              if (parts.length === 0) return null
                              return {
                                  country: parts[parts.length - 1] || null,
                                  state:
                                      parts.length > 1
                                          ? parts[parts.length - 2]
                                          : null,
                              }
                          })(),
                      }
                    : null

                const response = await fetch("/api/horoscope/extract", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: trimmed,
                        locale,
                        profile: profilePayload,
                        planTier: subscription?.tier ?? "free",
                    }),
                })

                if (!response.ok) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: `assistant-error-${Date.now()}`,
                            role: "assistant",
                            text: tHoroscope("parseFailed"),
                            variant: "plain",
                        },
                    ])
                    return
                }

                const extracted = await response.json()

                // Paywall gate: free-tier users asking about another person's
                // chart get a red badge instead of the interpretation. We
                // accept either the explicit paywall field or the unified
                // `replyStrategy === "rejected"` strategy from extract.
                if (
                    extracted?.paywall ||
                    extracted?.classification?.replyStrategy === "rejected"
                ) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: `assistant-paywall-${Date.now()}`,
                            role: "assistant",
                            text: "",
                            variant: "paywall",
                            paywall:
                                extracted.paywall ?? {
                                    reason: "other_person",
                                    requiredTier: "basic",
                                },
                        },
                    ])
                    return
                }

                horoscopeClassificationRef.current =
                    extracted?.classification ?? null
                horoscopeQuestionRangeRef.current =
                    extracted?.questionRange ?? null

                // Onboarding makes birth data mandatory, so the profile is
                // the single source of truth. If it's somehow missing, the
                // reading can't run — surface a generic failure.
                const profileBirth = profileToHoroscopeBirthData(
                    user ? profile : null,
                )
                const birthToUse = profileBirth
                    ? applyEphemerisLocationTimeDefaults(profileBirth)
                    : null
                if (!birthToUse) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: `assistant-error-${Date.now()}`,
                            role: "assistant",
                            text: tHoroscope("processFailed"),
                            variant: "plain",
                        },
                    ])
                    return
                }
                setHoroscopeBirth(birthToUse)

                if (
                    extracted?.systemPreference &&
                    extracted.systemPreference !== "unknown"
                ) {
                    if (extracted.systemPreference === "both") {
                        setHoroscopeSystem("both")
                    } else {
                        setHoroscopeSystem(extracted.systemPreference)
                    }
                } else {
                    setHoroscopeSystem(
                        getDefaultAstrologySystem(
                            locale,
                            birthToUse.country ?? undefined,
                        ) as "western_tropical" | "vedic_sidereal",
                    )
                }

                const transitMentioned = Boolean(extracted?.transit?.mentioned)
                const hasTransitFromExtract =
                    transitMentioned &&
                    extracted?.transit?.day != null &&
                    extracted?.transit?.month != null &&
                    extracted?.transit?.year != null
                const transitToUse: HoroscopeTransitData | null =
                    hasTransitFromExtract
                        ? {
                              day: extracted!.transit!.day!,
                              month: extracted!.transit!.month!,
                              year: extracted!.transit!.year!,
                              hour: null,
                              minute: null,
                              timezone: birthToUse.timezone,
                              lat: birthToUse.lat,
                              lng: birthToUse.lng,
                              country: birthToUse.country,
                              state: birthToUse.state,
                          }
                        : horoscopeTransit
                if (hasTransitFromExtract) {
                    setHoroscopeTransit(transitToUse)
                }

                const questionText = options.birthDetailsOnly
                    ? horoscopeQuestion ||
                      lastQuestion ||
                      "General horoscope reading"
                    : trimmed ||
                      horoscopeQuestion ||
                      lastQuestion ||
                      "General horoscope reading"
                const normalizedBirth =
                    ensureBirthTimeDefaults(birthToUse) ?? birthToUse
                const starOk = spendStars(1)
                if (!starOk) {
                    setShowInsufficientStars(true)
                    setInsufficientStarsType("horoscope")
                    return
                }
                await runHoroscopeReading(
                    normalizedBirth,
                    questionText,
                    transitToUse,
                )
            } catch {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `assistant-error-${Date.now()}`,
                        role: "assistant",
                        text: tHoroscope("processFailed"),
                        variant: "plain",
                    },
                ])
            } finally {
                setConsulting(false)
            }
        },
        [
            horoscopeQuestion,
            lastQuestion,
            locale,
            ensureBirthTimeDefaults,
            runHoroscopeReading,
            spendStars,
            tHoroscope,
            horoscopeTransit,
            user,
            profile,
            subscription,
        ],
    )

    const fetchDecision = useCallback(
        async (
            value: string,
            historyOverride?: { role: string; text: string }[],
            savedBirthInfo?: string | null,
        ) => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
            abortControllerRef.current = new AbortController()

            const history =
                historyOverride ??
                messages.map((m) => ({
                    role: m.role,
                    text: m.text,
                }))
            const contextSummary = mergeOriginContextIntoSummary(
                originContext,
                buildSessionContextSummary(messages),
            )
            let modeForApi =
                interpretationMode !== "auto" ? interpretationMode : undefined
            if (!user && modeForApi === "horoscope") {
                modeForApi = undefined
            }

            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            }
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`
            }

            const response = await fetch("/api/chat", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    question: value,
                    history,
                    savedBirthInfo: savedBirthInfo ?? undefined,
                    hasStoredBirthChart: Boolean(storedBirthChart),
                    interpretationMode: modeForApi,
                    contextSummary: contextSummary || undefined,
                    planTier,
                }),
                signal: abortControllerRef.current.signal,
            })

            console.log(contextSummary)

            if (!response.ok || !response.body) {
                throw new Error("Failed to consult")
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ""

            try {
                while (true) {
                    const { done, value: chunk } = await reader.read()
                    if (done) break
                    buffer += decoder.decode(chunk, { stream: true })
                }
                buffer += decoder.decode()
            } finally {
                reader.releaseLock()
            }

            const parsed = parseDecision(buffer)
            if (!parsed) throw new Error("Invalid decision payload")
            return parsed
        },
        [
            messages,
            parseDecision,
            interpretationMode,
            storedBirthChart,
            user,
            originContext,
            planTier,
        ],
    )

    const streamAssistantResponse = useCallback(
        async ({
            question,
            type,
            isFollowUp,
            supportTopic,
            historyOverride,
            savedBirthInfo,
            onChunk,
        }: {
            question: string
            type: ChatDecision["type"]
            isFollowUp?: boolean
            supportTopic?: string | null
            historyOverride?: { role: string; text: string }[]
            savedBirthInfo?: string | null
            onChunk?: (text: string) => void
        }) => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
            abortControllerRef.current = new AbortController()

            const history =
                historyOverride ??
                messages.map((m) => ({
                    role: m.role,
                    text: m.text,
                }))
            const contextSummary = mergeOriginContextIntoSummary(
                originContext,
                buildSessionContextSummary(messages),
            )
            const response = await fetch("/api/chat/respond", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                    type,
                    isFollowUp,
                    supportTopic: supportTopic ?? undefined,
                    history,
                    savedBirthInfo: savedBirthInfo ?? undefined,
                    contextSummary: contextSummary || undefined,
                }),
                signal: abortControllerRef.current.signal,
            })

            if (!response.ok || !response.body) {
                throw new Error("Failed to generate chat response")
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let text = ""

            try {
                while (true) {
                    const { done, value: chunk } = await reader.read()
                    if (done) break
                    text += decoder.decode(chunk, { stream: true })
                    onChunk?.(text)
                }
                text += decoder.decode()
                onChunk?.(text)
            } finally {
                reader.releaseLock()
            }

            return text
        },
        [messages, originContext],
    )

    const handleStopStreaming = useCallback(() => {
        if (generalReplyTargetMessageIdRef.current) {
            finalizeGeneralReplyStream()
            return
        }

        if (oracleReplyTargetMessageIdRef.current) {
            finalizeOracleReplyStream()
            return
        }

        if (consultingLoadingIdRef.current) {
            finalizeConsultingStream()
            return
        }

        if (interpretationLoadingIdRef.current) {
            finalizeTarotInterpretationStream()
            return
        }

        if (horoscopeTargetMessageIdRef.current) {
            finalizeHoroscopeStream()
            return
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        setConsulting(false)
        setIsInterpreting(false)
    }, [
        finalizeConsultingStream,
        finalizeGeneralReplyStream,
        finalizeHoroscopeStream,
        finalizeOracleReplyStream,
        finalizeTarotInterpretationStream,
    ])

    const handleCancelHoroscopeLoading = useCallback(() => {
        stopHoroscope()
        stopHoroscopeVerdict()
        horoscopeVerdictTargetMessageIdRef.current = null
    }, [stopHoroscope, stopHoroscopeVerdict])

    /**
     * Re-fetch /chart-data for a timeline slot's date and replace the
     * message's chartData / personalizedTransitAspects so the Transit and
     * Aspect tabs re-render against the picked day. Hourly timelines pass a
     * full ISO timestamp (with hour); daily timelines pass a date-only ISO.
     */
    const handlePickTransitDate = useCallback(
        async (messageId: string, datetimeIso: string) => {
            const msg = messages.find((m) => m.id === messageId)
            if (!msg || msg.variant !== "horoscope") return
            const chart = msg.chartData as
                | {
                      birth?: {
                          date?: { day: number; month: number; year: number }
                          time?: { hour: number; minute: number }
                          location?: {
                              country?: string | null
                              state?: string | null
                              lat?: number | null
                              lng?: number | null
                              timezone?: number | null
                          }
                      }
                  }
                | null
                | undefined
            if (!chart?.birth?.date || !chart.birth.location) return
            const datePart = datetimeIso.slice(0, 10)
            const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
            if (!dateMatch) return
            const transitDay = Number.parseInt(dateMatch[3], 10)
            const transitMonth = Number.parseInt(dateMatch[2], 10)
            const transitYear = Number.parseInt(dateMatch[1], 10)
            const isoHasTime = datetimeIso.length > 10
            const timeMatch = isoHasTime
                ? /T(\d{2}):(\d{2})/.exec(datetimeIso)
                : null
            const transitHour = timeMatch
                ? Number.parseInt(timeMatch[1], 10)
                : 12
            const transitMinute = timeMatch
                ? Number.parseInt(timeMatch[2], 10)
                : 0
            const transitBody = {
                question: msg.question ?? "",
                birth: {
                    day: chart.birth.date.day,
                    month: chart.birth.date.month,
                    year: chart.birth.date.year,
                    hour: chart.birth.time?.hour ?? null,
                    minute: chart.birth.time?.minute ?? null,
                    timezone: chart.birth.location.timezone ?? 0,
                    lat: chart.birth.location.lat ?? 0,
                    lng: chart.birth.location.lng ?? 0,
                    country: chart.birth.location.country ?? null,
                    state: chart.birth.location.state ?? null,
                },
                transit: {
                    day: transitDay,
                    month: transitMonth,
                    year: transitYear,
                    hour: transitHour,
                    minute: transitMinute,
                    timezone: chart.birth.location.timezone ?? 0,
                    lat: chart.birth.location.lat ?? 0,
                    lng: chart.birth.location.lng ?? 0,
                    country: chart.birth.location.country ?? null,
                    state: chart.birth.location.state ?? null,
                },
                locale,
            }

            try {
                const res = await fetch("/api/horoscope/chart-data", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(transitBody),
                })
                if (!res.ok) return
                const data = (await res.json()) as Record<string, unknown>
                if (data.error) return
                const fullAspects =
                    (data.personalizedTransitAspects as ChatMessage["personalizedTransitAspects"]) ??
                    null
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? {
                                  ...m,
                                  chartData: data,
                                  personalizedTransitAspects: fullAspects,
                                  personalizedTransitAspectsMerged: null,
                              }
                            : m,
                    ),
                )
            } catch {
                /* swallow — old chart stays visible */
            }
        },
        [locale, messages],
    )

    const setNotice = (id: string, text: string) => {
        setMessageNotices((prev) => ({ ...prev, [id]: text }))
        window.setTimeout(() => {
            setMessageNotices((prev) => {
                const next = { ...prev }
                delete next[id]
                return next
            })
        }, 2200)
    }

    const stopReadAloud = useCallback(() => {
        const audio = readAloudAudioRef.current
        if (!audio) return
        audio.pause()
        audio.currentTime = 0
        setReadAloudPlayingMessageId(null)
    }, [])

    const TTS_MAX_LENGTH = 2500

    const proceedReadAloud = useCallback(
        async (id: string, text: string) => {
            const trimmed = (unmask(text)?.trim() ?? "").slice(
                0,
                TTS_MAX_LENGTH,
            )
            if (!trimmed) return

            if (readAloudAudioRef.current) {
                readAloudAudioRef.current.pause()
                readAloudAudioRef.current.currentTime = 0
            }
            setReadAloudPlayingMessageId(null)
            setReadAloudLoadingMessageId(id)

            try {
                let audioUrl = readAloudObjectUrlsRef.current[id]
                if (!audioUrl) {
                    const starSuccess = spendStars(1)
                    if (!starSuccess) {
                        setNotice(id, tHome("readAloud.insufficientStars"))
                        setReadAloudLoadingMessageId((prev) =>
                            prev === id ? null : prev,
                        )
                        return
                    }
                    const response = await fetch("/api/tts", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: trimmed, locale }),
                    })
                    if (!response.ok) {
                        throw new Error("TTS request failed")
                    }
                    const blob = await response.blob()
                    audioUrl = URL.createObjectURL(blob)
                    readAloudObjectUrlsRef.current[id] = audioUrl
                }

                if (!readAloudAudioRef.current) {
                    const audio = new Audio()
                    audio.onended = () => {
                        setReadAloudPlayingMessageId(null)
                    }
                    readAloudAudioRef.current = audio
                }

                const audio = readAloudAudioRef.current
                audio.src = audioUrl
                await audio.play()
                setReadAloudPlayingMessageId(id)
            } catch {
                setNotice(id, tHome("readAloud.error"))
                setReadAloudPlayingMessageId(null)
            } finally {
                setReadAloudLoadingMessageId((prev) =>
                    prev === id ? null : prev,
                )
            }
        },
        [locale, tHome, spendStars, unmask],
    )

    const handleReadAloud = useCallback(
        (id: string, text: string) => {
            const trimmed = (text?.trim() ?? "").slice(0, TTS_MAX_LENGTH)
            if (!trimmed) return

            if (readAloudPlayingMessageId === id) {
                stopReadAloud()
                return
            }

            const hasCached = !!readAloudObjectUrlsRef.current[id]
            if (hasCached || getSkipReadAloudConfirm()) {
                void proceedReadAloud(id, text)
                return
            }

            const hasEnoughForVoice =
                !starsInitialized ||
                !Number.isFinite(stars as number) ||
                (stars as number) >= 1
            if (!hasEnoughForVoice) {
                setNotice(id, tHome("readAloud.insufficientStars"))
                return
            }

            setReadAloudPending({ id, text })
            setReadAloudDoNotShowAgain(false)
            setReadAloudConfirmOpen(true)
        },
        [
            readAloudPlayingMessageId,
            stopReadAloud,
            proceedReadAloud,
            starsInitialized,
            stars,
            tHome,
        ],
    )

    const handleReadAloudConfirm = useCallback(() => {
        if (readAloudPending) {
            if (readAloudDoNotShowAgain) {
                setSkipReadAloudConfirm(true)
            }
            void proceedReadAloud(readAloudPending.id, readAloudPending.text)
            setReadAloudPending(null)
        }
        setReadAloudConfirmOpen(false)
    }, [readAloudPending, readAloudDoNotShowAgain, proceedReadAloud])

    const focusInput = () => {
        window.requestAnimationFrame(() => {
            const input = document.getElementById("home-question-input")
            if (input && "focus" in input) {
                ;(input as HTMLTextAreaElement).focus()
            }
        })
    }

    const resetInteractiveStateForRewrite = () => {
        setDecision(null)
        setShowCardDraw(false)
        setIsInterpreting(false)
        setSelectedCount(0)
        setCardCountOverride(null)
        setCardSelectionResetSignal((prev) => prev + 1)
        setShuffleFn(null)
        setPickFn(null)
        setShowInsufficientStars(false)
        setInsufficientStarsType(null)
        setHoroscopeBirth(null)
        setHoroscopeQuestion(null)
        setHoroscopeTransit(null)
    }

    const runDecisionFlowFromMessages = useCallback(
        async ({
            baseMessages,
            questionText,
        }: {
            baseMessages: ChatMessage[]
            questionText: string
        }) => {
            const trimmed = (questionText ?? "").trim()
            if (!trimmed) return
            if (consulting || isInterpreting) return

            const lastUserMsg = [...baseMessages]
                .reverse()
                .find((m) => m.role === "user")
            if (lastUserMsg) {
                lastUserPrivacyRef.current = {
                    storageKey: lastUserMsg.privacyStorageKey,
                    rawText: lastUserMsg.displayText,
                }
            }

            setEditingMessageId(null)
            setEditingDraft("")
            setQuestion("")
            setConsulting(true)
            setLastQuestion(trimmed)
            setShowPrompt(false)
            setShowLearnMore(false)
            resetInteractiveStateForRewrite()

            const assistantLoadingId = `assistant-${Date.now()}`
            consultingLoadingIdRef.current = assistantLoadingId
            setMessages([
                ...baseMessages,
                {
                    id: assistantLoadingId,
                    role: "assistant",
                    text: "",
                    variant: "plain",
                    isLoading: true,
                },
            ])

            /** Set after classification so abort mid-stream can still open the draw UI for tarot. */
            let flowDecision: ChatDecision | null = null

            try {
                const history = baseMessages.slice(0, -1).map((m) => ({
                    role: m.role,
                    text: m.text,
                }))
                const savedBirth = loadBirthFromStorage()
                const savedBirthInfo = hasBirthDate(savedBirth)
                    ? "saved_profile_in_action_trigger"
                    : null

                let nextDecision = await fetchDecision(
                    trimmed,
                    history,
                    savedBirthInfo,
                )
                const horoscopeAuthGate = detectHoroscopeAuthGate(nextDecision)
                if (horoscopeAuthGate) {
                    horoscopeAuthGate.question = trimmed
                    nextDecision = {
                        ...nextDecision,
                        type: "chat",
                        spreadType: undefined,
                        cardCount: undefined,
                        spreadReason: undefined,
                    }
                }
                nextDecision = applyInterpretationModeOverride(nextDecision)
                nextDecision = normalizeDrawDecision(nextDecision)
                nextDecision = applyCalendarModeOverride(nextDecision, trimmed)
                flowDecision = nextDecision
                setDecision(nextDecision)

                // Calendar-mode horoscope: render the inline calendar tool
                // instead of streaming a reading, and don't spend a star.
                // The follow-up question fired by a chip click goes through
                // the normal horoscope flow and spends one star then.
                if (
                    nextDecision.type === "horoscope" &&
                    nextDecision.horoscopeMode === "calendar"
                ) {
                    setConsulting(false)
                    const detectedFromQuestion = detectInputLanguage(trimmed)
                    const calendarResponseLocale: SupportedLocale =
                        detectedFromQuestion && isSupportedLocale(detectedFromQuestion)
                            ? detectedFromQuestion
                            : isSupportedLocale(locale)
                              ? (locale as SupportedLocale)
                              : "en"
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantLoadingId
                                ? {
                                      ...m,
                                      text: "",
                                      isLoading: false,
                                      streamStopped: false,
                                      variant: "horoscope-calendar",
                                      responseLocale: calendarResponseLocale,
                                  }
                                : m,
                        ),
                    )
                    consultingLoadingIdRef.current = null
                    return
                }

                if (horoscopeAuthGate) {
                    setConsulting(false)
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantLoadingId
                                ? {
                                      ...m,
                                      text: "",
                                      isLoading: false,
                                      streamStopped: false,
                                      horoscopeAuthGate,
                                  }
                                : m,
                        ),
                    )
                    consultingLoadingIdRef.current = null
                    return
                }

                const supportBlock = buildSupportBlockFromDecision(
                    nextDecision,
                    trimmed,
                )

                // General/chat answers go through /api/chat/question for a
                // structured "inner energy reflection" rendered by
                // InnerEnergyHero. Oracle answers go through /api/chat/oracle
                // for a premium-feel symbolic oracle card rendered by
                // OracleHero. Bridge replies (draw / horoscope) and support
                // acknowledgments keep the lightweight text stream from
                // /api/chat/respond.
                const useGeneralReplyStream =
                    nextDecision.type === "chat" && !supportBlock
                const useOracleReplyStream =
                    nextDecision.type === "oracle" && !supportBlock

                if (useOracleReplyStream) {
                    startOracleReplyStream({
                        question: trimmed,
                        assistantLoadingId,
                        isFollowUp: nextDecision.isFollowUp,
                        historyOverride: history,
                    })
                } else if (useGeneralReplyStream) {
                    startGeneralReplyStream({
                        question: trimmed,
                        assistantLoadingId,
                        isFollowUp: nextDecision.isFollowUp,
                        historyOverride: history,
                    })
                } else {
                    const assistantText = await streamAssistantResponse({
                        question: trimmed,
                        type: nextDecision.type,
                        isFollowUp: nextDecision.isFollowUp,
                        supportTopic: supportBlock?.topic ?? null,
                        historyOverride: history,
                        savedBirthInfo,
                        onChunk: (partial) => {
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantLoadingId
                                        ? { ...m, text: partial }
                                        : m,
                                ),
                            )
                        },
                    })
                    setConsulting(false)

                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantLoadingId
                                ? {
                                      ...m,
                                      text: assistantText || m.text,
                                      isLoading: false,
                                      streamStopped: false,
                                      supportTopic:
                                          supportBlock?.topic ?? undefined,
                                      supportBlock: supportBlock ?? undefined,
                                  }
                                : m,
                        ),
                    )
                    consultingLoadingIdRef.current = null
                }

                if (nextDecision.type === "draw") {
                    setShowCardDraw(true)
                } else if (nextDecision.type === "horoscope") {
                    setHoroscopeQuestion(trimmed)
                    setHoroscopeSystem(getDefaultSystemByLocale())
                    await handleHoroscopeInput(trimmed, {
                        appendUserMessage: false,
                    })
                }
            } catch (err) {
                setConsulting(false)
                if (err instanceof Error && err.name === "AbortError") {
                    freezeStoppedPlainMessage(assistantLoadingId)
                    if (consultingLoadingIdRef.current === assistantLoadingId) {
                        consultingLoadingIdRef.current = null
                    }
                    if (flowDecision?.type === "draw") {
                        setShowCardDraw(true)
                    }
                    return
                }

                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantLoadingId
                            ? {
                                  ...m,
                                  text: "Sorry, something went wrong. Please try again.",
                                  isLoading: false,
                                  streamStopped: false,
                              }
                            : m,
                    ),
                )
                if (consultingLoadingIdRef.current === assistantLoadingId) {
                    consultingLoadingIdRef.current = null
                }
            }
        },
        [
            applyInterpretationModeOverride,
            applyCalendarModeOverride,
            consulting,
            detectHoroscopeAuthGate,
            fetchDecision,
            freezeStoppedPlainMessage,
            getDefaultSystemByLocale,
            handleHoroscopeInput,
            hasBirthDate,
            isInterpreting,
            normalizeDrawDecision,
            startGeneralReplyStream,
            startOracleReplyStream,
            streamAssistantResponse,
            locale,
        ],
    )

    const handleRegenerateAt = (messageIndex: number) => {
        if (consulting || isInterpreting) return
        const target = messages[messageIndex]
        if (!target || target.role !== "user") return

        const baseMessages = messages.slice(0, messageIndex + 1)
        void runDecisionFlowFromMessages({
            baseMessages,
            questionText: target.text,
        })
    }

    const handleStartEditAt = (messageIndex: number) => {
        if (consulting || isInterpreting) return
        const target = messages[messageIndex]
        if (!target || target.role !== "user") return
        setEditingMessageId(target.id)
        setEditingDraft(target.displayText ?? target.text)
    }

    const handleCancelEdit = () => {
        setEditingMessageId(null)
        setEditingDraft("")
    }

    const handleSendEditAt = async (messageIndex: number) => {
        if (consulting || isInterpreting) return
        const target = messages[messageIndex]
        if (!target || target.role !== "user") return
        const trimmed = (editingDraft ?? "").trim()
        if (!trimmed) return

        setEditingMessageId(null)
        setEditingDraft("")

        setMessages((prev) =>
            prev.map((m, idx) =>
                idx === messageIndex
                    ? {
                          ...m,
                          text: trimmed,
                          displayText: trimmed,
                          isSanitizing: true,
                          privacyRedacted: false,
                          privacyStorageKey: undefined,
                          privacyRedactionTypes: undefined,
                      }
                    : m,
            ),
        )

        try {
            const prepared = await prepareUserSubmission(trimmed, {
                messageId: target.id,
            })
            const editedUserMessage: ChatMessage = {
                ...target,
                ...prepared.userMessage,
                isSanitizing: false,
                // Non-redacted prepareUserSubmission omits displayText; spreading
                // target would otherwise keep a stale displayText while text updates.
                ...(!prepared.redacted
                    ? {
                          displayText: trimmed,
                          // Clear privacy pointers so persisted messages + refresh
                          // do not rehydrate stale sessionStorage over the new text.
                          privacyStorageKey: undefined,
                          privacyRedacted: false,
                          privacyRedactionTypes: undefined,
                      }
                    : {}),
            }
            if (!prepared.redacted && target.privacyStorageKey) {
                removeRawPromptFromSession(target.privacyStorageKey)
            }
            setMessages((prev) =>
                prev.map((m, idx) =>
                    idx === messageIndex ? editedUserMessage : m,
                ),
            )
            // Build the snapshot synchronously here (instead of inside the
            // setMessages updater above) because React 18 may not have
            // executed that updater yet by the time we call
            // runDecisionFlowFromMessages — and that flow REPLACES the
            // messages array with [...baseMessages, loadingAssistant], so an
            // empty baseSnapshot would wipe out the just-edited user bubble.
            const baseSnapshot: ChatMessage[] = [
                ...messages.slice(0, messageIndex),
                editedUserMessage,
            ]
            void runDecisionFlowFromMessages({
                baseMessages: baseSnapshot,
                questionText: prepared.sanitized,
            })
        } catch {
            setMessages((prev) =>
                prev.map((m, idx) =>
                    idx === messageIndex ? { ...m, isSanitizing: false } : m,
                ),
            )
        }
    }

    const applySuggestedQuestion = (value: string) => {
        setQuestion(value)
        focusInput()
    }

    const tHoroscopeCalendar = useTranslations("HoroscopeCalendar")
    const handleCalendarChipClick = (
        _chipId: HoroscopeCalendarChipId | string,
        topicLabel: string,
        date: Date,
    ) => {
        const formattedDate = new Intl.DateTimeFormat(locale, {
            month: "short",
            day: "numeric",
            year: "numeric",
        }).format(date)
        const followUpQuestion = tHoroscopeCalendar("followUpQuestion", {
            topic: topicLabel,
            date: formattedDate,
        })
        void handleSubmit(followUpQuestion)
    }
    // Memoised so the calendar tool's onSelectionChange-effect deps stay
    // stable; otherwise a fresh function reference each render kicks off
    // a setState loop (React #185) — especially obvious when an unrelated
    // re-render hits, e.g. opening the composer settings popover.
    const handleCalendarSelectionChange = useCallback(
        (
            date: Date | null,
            dayData: import("@/lib/calendar-helper").DayData | null,
        ) => {
            if (!date) {
                setOriginContext((prev) => (prev === null ? prev : null))
                return
            }
            const next = buildCalendarDayOriginContext(date, dayData, locale)
            setOriginContext((prev) => {
                if (
                    prev &&
                    prev.kind === "calendar-day" &&
                    prev.isoDate === next.isoDate &&
                    prev.label === next.label &&
                    prev.summary === next.summary
                ) {
                    return prev
                }
                return next
            })
        },
        [locale],
    )
    // Bump to clear the inline calendar tool's selection (in response to
    // the X button on the OriginContextStrip).
    const [calendarToolResetSignal, setCalendarToolResetSignal] = useState(0)
    const handleClearOriginContext = useCallback(() => {
        setOriginContext(null)
        setCalendarToolResetSignal((n) => n + 1)
    }, [])

    const handleAskAspectDetail = async (
        question: string,
        aspectKey: string,
        event: SourceAspectEvent,
    ) => {
        const ok = spendStars(1)
        if (!ok) {
            setShowInsufficientStars(true)
            setInsufficientStarsType("horoscope")
            return
        }
        pendingAspectDetailRef.current = { aspectKey, event }
        await startDecisionFlow(question, { forceChatOnly: true })
        pendingAspectDetailRef.current = null
    }

    const toggleReaction = (id: string, next: "like" | "dislike") => {
        setAssistantReactions((prev) => ({
            ...prev,
            [id]: prev[id] === next ? null : next,
        }))
    }

    const handleShare = async (id: string, text: string) => {
        const unmaskedText = unmask(text)
        try {
            if (navigator.share) {
                await navigator.share({
                    title: "AskingFate",
                    text: unmaskedText,
                })
                setNotice(id, "Shared.")
                return
            }
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(unmaskedText)
                setNotice(id, "Copied.")
                return
            }
            setNotice(id, "Copy not supported.")
        } catch {
            setNotice(id, "Share canceled.")
        }
    }

    const handleReadingTextDownloaded = (id: string) => {
        setNotice(id, "Downloaded.")
    }

    const handleReadingTextDownloadFailed = (id: string) => {
        setNotice(id, "Download failed.")
    }

    const handleReport = (id: string, text: string) => {
        const unmaskedText = unmask(text)
        const subject = encodeURIComponent("Report AI response")
        const body = encodeURIComponent(
            `Message:\n${unmaskedText}\n\nPlease describe the issue:`,
        )
        window.location.href = `mailto:admin@askingfate.com?subject=${subject}&body=${body}`
        setNotice(id, "Report draft opened.")
    }

    const startDecisionFlow = useCallback(
        async (
            value: string,
            options: {
                appendUserMessage?: boolean
                forceChatOnly?: boolean
                preparedUserMessage?: ChatMessage
                /** Prior conversation turns for /api/chat when user msg was already appended (avoids stale closure). */
                decisionHistory?: { role: "user" | "assistant"; text: string }[]
            } = {},
        ) => {
            const trimmed = value.trim()
            if (!trimmed) return

            const shouldAppendUserMessage = options.appendUserMessage !== false
            setQuestion("")
            setConsulting(true)
            setLastQuestion(trimmed)
            setShowPrompt(false)
            setShowLearnMore(false)
            resetInteractiveStateForRewrite()

            const assistantLoadingId = `assistant-${Date.now()}`
            consultingLoadingIdRef.current = assistantLoadingId

            if (shouldAppendUserMessage) {
                const preparedUserMessage = options.preparedUserMessage
                setMessages((prev) => [
                    ...prev,
                    preparedUserMessage ?? {
                        id: `user-${Date.now()}`,
                        role: "user",
                        text: trimmed,
                        originContextSnapshot: originContextRef.current,
                    },
                ])
            }

            const pending = pendingAspectDetailRef.current
            setMessages((prev) => [
                ...prev,
                {
                    id: assistantLoadingId,
                    role: "assistant",
                    text: "",
                    variant: "plain",
                    isLoading: true,
                    ...(pending && {
                        sourceAspectKey: pending.aspectKey,
                        sourceAspectEvent: pending.event,
                    }),
                },
            ])

            /** After classification so abort mid-stream can still open the draw UI for tarot. */
            let flowDecision: ChatDecision | null = null

            try {
                const history =
                    options.decisionHistory !== undefined
                        ? options.decisionHistory
                        : shouldAppendUserMessage || messages.length === 0
                          ? undefined
                          : messages.slice(0, -1).map((m) => ({
                                role: m.role,
                                text: m.text,
                            }))
                const savedBirth = loadBirthFromStorage()
                const savedBirthInfo = hasBirthDate(savedBirth)
                    ? "saved_profile_in_action_trigger"
                    : null

                let nextDecision = await fetchDecision(
                    trimmed,
                    history,
                    savedBirthInfo,
                )
                const horoscopeAuthGate = options.forceChatOnly
                    ? null
                    : detectHoroscopeAuthGate(nextDecision)
                if (horoscopeAuthGate) {
                    horoscopeAuthGate.question = trimmed
                    nextDecision = {
                        ...nextDecision,
                        type: "chat",
                        spreadType: undefined,
                        cardCount: undefined,
                        spreadReason: undefined,
                    }
                }
                nextDecision = applyInterpretationModeOverride(nextDecision)
                if (options.forceChatOnly) {
                    nextDecision = {
                        ...nextDecision,
                        type: "chat",
                        spreadType: undefined,
                        cardCount: undefined,
                        spreadReason: undefined,
                    }
                }
                nextDecision = normalizeDrawDecision(nextDecision)
                flowDecision = nextDecision
                setDecision(nextDecision)

                if (horoscopeAuthGate) {
                    setConsulting(false)
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantLoadingId
                                ? {
                                      ...m,
                                      text: "",
                                      isLoading: false,
                                      streamStopped: false,
                                      horoscopeAuthGate,
                                  }
                                : m,
                        ),
                    )
                    consultingLoadingIdRef.current = null
                    return
                }

                const supportBlock = buildSupportBlockFromDecision(
                    nextDecision,
                    trimmed,
                )

                // See runDecisionFlowFromMessages — same branching:
                // structured inner-energy reflection / oracle reading vs.
                // plain text bridge.
                const useGeneralReplyStream =
                    nextDecision.type === "chat" && !supportBlock
                const useOracleReplyStream =
                    nextDecision.type === "oracle" && !supportBlock

                if (useOracleReplyStream) {
                    startOracleReplyStream({
                        question: trimmed,
                        assistantLoadingId,
                        isFollowUp: nextDecision.isFollowUp,
                        historyOverride: history,
                    })
                } else if (useGeneralReplyStream) {
                    startGeneralReplyStream({
                        question: trimmed,
                        assistantLoadingId,
                        isFollowUp: nextDecision.isFollowUp,
                        historyOverride: history,
                    })
                } else {
                    const assistantText = await streamAssistantResponse({
                        question: trimmed,
                        type: nextDecision.type,
                        isFollowUp: nextDecision.isFollowUp,
                        supportTopic: supportBlock?.topic ?? null,
                        historyOverride: history,
                        savedBirthInfo,
                        onChunk: (partial) => {
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantLoadingId
                                        ? { ...m, text: partial }
                                        : m,
                                ),
                            )
                        },
                    })
                    setConsulting(false)

                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantLoadingId
                                ? {
                                      ...m,
                                      text: assistantText || m.text,
                                      isLoading: false,
                                      streamStopped: false,
                                      supportTopic:
                                          supportBlock?.topic ?? undefined,
                                      supportBlock: supportBlock ?? undefined,
                                  }
                                : m,
                        ),
                    )
                    consultingLoadingIdRef.current = null
                }

                if (nextDecision.type === "draw") {
                    setShowCardDraw(true)
                } else if (nextDecision.type === "horoscope") {
                    setHoroscopeQuestion(trimmed)
                    setHoroscopeSystem(getDefaultSystemByLocale())
                    await handleHoroscopeInput(trimmed, {
                        appendUserMessage: false,
                    })
                }
            } catch (err) {
                setConsulting(false)
                if (err instanceof Error && err.name === "AbortError") {
                    freezeStoppedPlainMessage(assistantLoadingId)
                    if (consultingLoadingIdRef.current === assistantLoadingId) {
                        consultingLoadingIdRef.current = null
                    }
                    if (flowDecision?.type === "draw") {
                        setShowCardDraw(true)
                    }
                    return
                }

                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantLoadingId
                            ? {
                                  ...m,
                                  text: "Sorry, something went wrong. Please try again.",
                                  isLoading: false,
                                  streamStopped: false,
                              }
                            : m,
                    ),
                )
                if (consultingLoadingIdRef.current === assistantLoadingId) {
                    consultingLoadingIdRef.current = null
                }
            }
        },
        [
            applyInterpretationModeOverride,
            detectHoroscopeAuthGate,
            fetchDecision,
            freezeStoppedPlainMessage,
            getDefaultSystemByLocale,
            handleHoroscopeInput,
            hasBirthDate,
            messages,
            normalizeDrawDecision,
            startGeneralReplyStream,
            startOracleReplyStream,
            streamAssistantResponse,
        ],
    )

    useEffect(() => {
        if (hasBootstrapped.current) return
        if (!sessionId) return
        if (decision) {
            hasBootstrapped.current = true
            return
        }
        if (messages.length === 1 && messages[0].role === "user") {
            hasBootstrapped.current = true
            void startDecisionFlow(messages[0].text, {
                appendUserMessage: false,
            })
        }
    }, [sessionId, decision, messages, startDecisionFlow])

    // Rehydrate raw prompts from sessionStorage so the UI shows the user's
    // original wording while the persisted/text fields stay redacted.
    const hasRehydratedPrivacyRef = useRef(false)
    useEffect(() => {
        if (hasRehydratedPrivacyRef.current) return
        if (typeof window === "undefined") return
        if (!messages.length) return
        const sessionAliases = loadSessionAliases(sessionId)
        if (sessionAliases.length) {
            setPrivacyAliases((prev) =>
                prev.length === sessionAliases.length ? prev : sessionAliases,
            )
        }
        let mutated = false
        const next = messages.map((m) => {
            const userRaw = m.privacyStorageKey
                ? loadRawPromptFromSession(m.privacyStorageKey)
                : null
            const questionRaw = m.questionPrivacyStorageKey
                ? loadRawPromptFromSession(m.questionPrivacyStorageKey)
                : null
            if (!userRaw && !questionRaw) return m
            const update: ChatMessage = { ...m }
            if (userRaw && !update.displayText) {
                update.displayText = userRaw
                mutated = true
            }
            if (questionRaw && !update.displayQuestion) {
                update.displayQuestion = questionRaw
                mutated = true
            }
            return update
        })
        hasRehydratedPrivacyRef.current = true
        const sourceMessages = mutated ? next : messages
        if (mutated) setMessages(next)
        const lastUser = [...sourceMessages]
            .reverse()
            .find((m) => m.role === "user" && m.privacyStorageKey)
        if (lastUser?.privacyStorageKey) {
            lastUserPrivacyRef.current = {
                storageKey: lastUser.privacyStorageKey,
                rawText:
                    lastUser.displayText ??
                    loadRawPromptFromSession(lastUser.privacyStorageKey) ??
                    undefined,
            }
        }
    }, [messages, sessionId])

    // For signed-in users: fetch the encrypted alias vault from the server so
    // unmasking works on any device, even after sessionStorage is cleared.
    const hasHydratedServerAliasesRef = useRef(false)
    useEffect(() => {
        if (hasHydratedServerAliasesRef.current) return
        if (typeof window === "undefined") return
        if (!sessionId) return
        if (!user?.id) return

        let cancelled = false
        const run = async () => {
            try {
                const { data } = await supabase.auth.getSession()
                const token = data.session?.access_token
                if (!token) return
                const resp = await fetch(
                    `/api/privacy-aliases?sessionId=${encodeURIComponent(sessionId)}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    },
                )
                if (!resp.ok) return
                const payload = (await resp.json()) as {
                    items?: Array<{
                        type?: unknown
                        placeholder?: unknown
                        original?: unknown
                    }>
                }
                if (cancelled) return
                const serverEntries: PromptAliasEntry[] = []
                for (const raw of payload.items ?? []) {
                    if (
                        !raw ||
                        typeof raw.type !== "string" ||
                        typeof raw.placeholder !== "string" ||
                        typeof raw.original !== "string"
                    ) {
                        continue
                    }
                    serverEntries.push({
                        type: raw.type as PromptAliasEntry["type"],
                        placeholder: raw.placeholder,
                        original: raw.original,
                    })
                }
                if (!serverEntries.length) return
                setPrivacyAliases((prev) => {
                    const merged = [...prev]
                    let changed = false
                    for (const entry of serverEntries) {
                        const exists = merged.some(
                            (e) =>
                                e.placeholder === entry.placeholder &&
                                e.type === entry.type,
                        )
                        if (!exists) {
                            merged.push(entry)
                            changed = true
                        }
                    }
                    if (!changed) return prev
                    saveSessionAliases(sessionId, merged)
                    return merged
                })
            } catch {
                /* network or auth issues are non-fatal */
            }
        }
        void run()
        hasHydratedServerAliasesRef.current = true
        return () => {
            cancelled = true
        }
    }, [sessionId, user?.id])

    /**
     * Sanitize a user-typed value before it reaches the backend, persists in
     * the database, or is sent to the AI. The original raw text stays only on
     * this device, in `sessionStorage`, so the UI can keep displaying it.
     */
    const prepareUserSubmission = useCallback(
        async (rawValue: string, options: { messageId?: string } = {}) => {
            const result = await sanitizePromptOnClient(rawValue, {
                sessionId: sessionId ?? "",
                locale,
                userId: user?.id ?? null,
            })
            if (result.aliases.length) {
                setPrivacyAliases(result.aliases)
            }
            const userMessageId = options.messageId ?? `user-${Date.now()}`
            let privacyStorageKey: string | undefined
            if (result.redacted) {
                privacyStorageKey = buildPrivacyStorageKey(userMessageId)
                saveRawPromptToSession(privacyStorageKey, rawValue)
            }
            const userMessage: ChatMessage = {
                id: userMessageId,
                role: "user",
                text: result.sanitized,
                isSanitizing: false,
                originContextSnapshot: originContextRef.current,
                ...(privacyStorageKey && {
                    displayText: rawValue,
                    privacyStorageKey,
                    privacyRedacted: true,
                    privacyRedactionTypes: result.redactionTypes,
                }),
            }
            lastUserPrivacyRef.current = {
                storageKey: privacyStorageKey,
                rawText: result.redacted ? rawValue : undefined,
            }
            return {
                rawValue,
                sanitized: result.sanitized,
                userMessage,
                privacyStorageKey,
                redactionTypes: result.redactionTypes as PromptRedactionType[],
                redacted: result.redacted,
            }
        },
        [locale, sessionId, user?.id],
    )

    const handleSubmit = async (value: string) => {
        if (showCardDraw && cardsToSelect > 0 && hasEnoughStars === true) {
            const matches = value.match(/\d+/g) ?? []
            const indices = matches
                .map((match) => Number(match))
                .filter((num) => Number.isFinite(num) && num > 0)
            if (indices.length > 0 && selectByIndicesFn) {
                selectByIndicesFn(indices)
                setQuestion("")
                return
            }

            const remaining = Math.max(0, cardsToSelect - selectedCount)
            if (remaining > 0 && pickFn && isPickForMeIntent(value)) {
                pickFn(remaining)
                setQuestion("")
                return
            }
        }
        const trimmed = value.trim()
        if (!trimmed) return
        setQuestion("")

        const userId = `user-${Date.now()}`
        let decisionHistory: { role: "user" | "assistant"; text: string }[] = []

        setMessages((prev) => {
            decisionHistory = prev.map((m) => ({
                role: m.role,
                text: m.text,
            }))
            return [
                ...prev,
                {
                    id: userId,
                    role: "user",
                    text: trimmed,
                    displayText: trimmed,
                    isSanitizing: true,
                    originContextSnapshot: originContextRef.current,
                },
            ]
        })

        try {
            const prepared = await prepareUserSubmission(trimmed, {
                messageId: userId,
            })
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === userId
                        ? { ...prepared.userMessage, isSanitizing: false }
                        : m,
                ),
            )

            if (isHoroscopeIntakeActive) {
                await handleHoroscopeInput(prepared.sanitized, {
                    birthDetailsOnly: true,
                    appendUserMessage: false,
                })
                return
            }
            if (horoscopeQuestion || horoscopeBirth) {
                await handleHoroscopeInput(prepared.sanitized, {
                    appendUserMessage: false,
                })
                return
            }
            await startDecisionFlow(prepared.sanitized, {
                appendUserMessage: false,
                decisionHistory,
            })
        } catch {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === userId ? { ...m, isSanitizing: false } : m,
                ),
            )
        }
    }

    const handleCardsSelected = useCallback(
        (cards: { name: string; isReversed: boolean }[]) => {
            if (!lastQuestion) return

            const starSuccess = spendStars(1)
            if (!starSuccess) {
                setShowInsufficientStars(true)
                setInsufficientStarsType("tarot")
                return
            }

            setShowCardDraw(false)
            setIsInterpreting(true)
            runInterpretationForCards(cards)
        },
        [lastQuestion, spendStars, runInterpretationForCards],
    )

    const handleTarotInterpretationChange = useCallback(
        (messageId: string, text: string) => {
            setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, text } : m)),
            )
        },
        [],
    )

    const handleToggleAutoPick = useCallback(() => {
        setAutoPickOn((prev) => {
            const next = !prev
            saveAutoPickToStorage(next)
            return next
        })
    }, [])

    const handleComposerSuggestionsEnabledChange = useCallback(
        (enabled: boolean) => {
            setComposerSuggestionsEnabled(enabled)
            saveComposerSuggestionsEnabledToStorage(enabled)
        },
        [],
    )

    // Form-card intake was removed — there are no longer any intake
    // messages to clear, so this is a no-op kept only because callers
    // still invoke it on flow transitions.
    const clearHoroscopeIntakeMessages = useCallback(() => {}, [])

    const hasMessages = messages.length > 0
    const hasInterpretation = messages.some(
        (message) =>
            (message.variant === "box" || message.variant === "horoscope") &&
            !message.isLoading,
    )
    const shouldShowHero = !hasMessages
    const shouldShowPrompts =
        showPrompt && !hasMessages && !consulting && prompts.length > 0
    const shouldShowLearnMore = showLearnMore && !hasMessages && !consulting

    const disclaimerText = tHome("disclaimer")
    const isInputFixed = true
    const canShowCardDrawSection =
        showCardDraw &&
        cardsToSelect > 0 &&
        !showInsufficientStars &&
        hasEnoughStars === true &&
        !autoPickOn
    const showDrawTrigger =
        showCardDraw &&
        cardsToSelect > 0 &&
        hasEnoughStars !== null &&
        !canShowCardDrawSection

    const handleScrollToDraw = () => {
        const target = showInsufficientStars
            ? insufficientStarsRef.current
            : cardDrawTargetRef.current
        target?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    const handleCardsToSelectChange = useCallback(
        (nextCount: number) => {
            const tierMax = getMaxCardsForTier(planTier)
            const boundedCount = Math.max(
                1,
                Math.min(tierMax, Math.floor(nextCount)),
            )
            setCardCountOverride(
                boundedCount === defaultCardsToSelect ? null : boundedCount,
            )
            if (selectedCount > boundedCount) {
                setSelectedCount(0)
                setCardSelectionResetSignal((prev) => prev + 1)
            }
        },
        [defaultCardsToSelect, selectedCount, planTier],
    )

    const cardDrawSection = canShowCardDrawSection ? (
        <DrawCardSection
            containerRef={cardDrawTargetRef}
            cardsToSelect={cardsToSelect}
            shortQuestion={shortQuestion}
            selectedCount={selectedCount}
            cardUi={cardUi}
            shuffleFn={shuffleFn}
            pickFn={pickFn}
            onCardsSelected={handleCardsSelected}
            onSelectedCountChange={setSelectedCount}
            onCardsToSelectChange={handleCardsToSelectChange}
            onProvideShuffle={(fn) => setShuffleFn(() => fn)}
            onProvideRandomPick={(fn) => setPickFn(() => fn)}
            onProvideSelectByIndices={(fn) => setSelectByIndicesFn(() => fn)}
            selectionResetSignal={cardSelectionResetSignal}
            planTier={planTier}
        />
    ) : null

    // Form-card intake was removed — onboarding makes birth data mandatory,
    // so the chat never asks for it. The flag is a constant `false` so
    // downstream UI code that branched on intake mode collapses to its
    // normal path.
    const isHoroscopeIntakeActive = false

    const composerFollowUpHost = useMemo(() => {
        if (messages.length === 0) return null
        const last = messages[messages.length - 1]
        if (last.role !== "assistant") return null
        if (last.followUpLoading) return null
        const sugg = last.followUpSuggestions
        if (!Array.isArray(sugg) || sugg.length === 0) return null
        return last
    }, [messages])

    const composerFollowUpsVisible =
        !isHoroscopeIntakeActive &&
        Boolean(composerFollowUpHost) &&
        composerSuggestionsEnabled

    const hideComposerActionTriggerRow =
        Boolean(composerFollowUpHost) &&
        !isHoroscopeIntakeActive &&
        composerSuggestionsEnabled

    // Above the chat-session composer, reuse the /calendar page's
    // PageContextComposer "context chip + suggestions" strip whenever a
    // calendar-day originContext is active — typically right after the
    // inline horoscope calendar tool turn. Mirrors what /calendar shows
    // so the chip + suggestion chips travel between surfaces without
    // visual breaks.
    const tCalendarShared = useTranslations("Calendar")
    const showOriginContextStrip = Boolean(
        originContext?.kind === "calendar-day" && !isHoroscopeIntakeActive,
    )
    const originContextStripSuggestions = useMemo(() => {
        if (!showOriginContextStrip) return null
        return [
            tCalendarShared("suggestions.focusToday"),
            tCalendarShared("suggestions.goodDecisionDay"),
            tCalendarShared("suggestions.activitiesForToday"),
            tCalendarShared("suggestions.warnings"),
        ]
    }, [showOriginContextStrip, tCalendarShared])

    const formattedCurrentLocationLabel = useMemo(() => {
        if (
            !currentLocationFallback?.country &&
            !currentLocationFallback?.state
        ) {
            return tActionTrigger("locationUnknown")
        }
        if (
            currentLocationFallback?.state &&
            currentLocationFallback?.country
        ) {
            return `${currentLocationFallback.state}, ${currentLocationFallback.country}`
        }
        return (
            currentLocationFallback?.country ||
            currentLocationFallback?.state ||
            tActionTrigger("locationUnknown")
        )
    }, [currentLocationFallback, tActionTrigger])

    const resolvedDraftLocation = useMemo(() => {
        const country = locationDraftCountry.trim()
        const state = locationDraftState.trim()
        if (!country) return null
        return resolveLocationFromCountryState(country, state || undefined)
    }, [locationDraftCountry, locationDraftState])

    const openLocationDialog = useCallback(() => {
        setLocationDraftCountry(currentLocationFallback?.country ?? "")
        setLocationDraftState(currentLocationFallback?.state ?? "")
        setShowLocationDialog(true)
    }, [currentLocationFallback])

    const handleSaveLocationDialog = useCallback(() => {
        const country = locationDraftCountry.trim()
        const state = locationDraftState.trim()
        if (!country) {
            setShowLocationDialog(false)
            return
        }
        if (resolvedDraftLocation) {
            setCurrentLocationFallback({
                country: resolvedDraftLocation.countryName,
                state: resolvedDraftLocation.stateName || undefined,
                lat: resolvedDraftLocation.latitude,
                lng: resolvedDraftLocation.longitude,
                timezone: resolvedDraftLocation.timezone,
            })
        } else {
            setCurrentLocationFallback({
                country,
                state: state || undefined,
            })
        }
        setShowLocationDialog(false)
    }, [locationDraftCountry, locationDraftState, resolvedDraftLocation])

    const handleCancelHoroscopeIntake = useCallback(() => {
        clearHoroscopeIntakeMessages()
        setHoroscopeQuestion(null)
        setHoroscopeBirth(null)
        setHoroscopeTransit(null)
        setQuestion("")
    }, [clearHoroscopeIntakeMessages])

    const handleChooseCardInstead = useCallback(async () => {
        const tarotQuestion =
            horoscopeQuestion || lastQuestion || question.trim()
        if (!tarotQuestion) return
        clearHoroscopeIntakeMessages()
        setHoroscopeQuestion(null)
        setHoroscopeBirth(null)
        setHoroscopeTransit(null)
        setInterpretationMode("tarot")
        try {
            const savedBirth = loadBirthFromStorage()
            const savedBirthInfo = hasBirthDate(savedBirth)
                ? "saved_profile_in_action_trigger"
                : null
            const aiDecision = await fetchDecision(
                tarotQuestion,
                undefined,
                savedBirthInfo,
            )
            setDecision({
                ...normalizeDrawDecision({
                    ...aiDecision,
                    type: "draw",
                }),
                assistantText: "",
            })
        } catch {
            setDecision({
                type: "draw",
                assistantText: "",
                spreadType: "simple",
                cardCount: getTarotCardCount("simple"),
            })
        }
        setShowCardDraw(true)
        setLastQuestion(tarotQuestion)
        setQuestion("")
    }, [
        clearHoroscopeIntakeMessages,
        fetchDecision,
        hasBirthDate,
        horoscopeQuestion,
        lastQuestion,
        normalizeDrawDecision,
        question,
    ])

    /**
     * Triggered from the rejection paywall block (free-tier user asking
     * about another person's chart). Same draw-card flow as
     * `handleChooseCardInstead` but only nudges the interpretation mode
     * back to "auto" when the user is currently in "horoscope" — so the
     * mode preference isn't clobbered to "tarot" if they actively chose
     * something else.
     */
    const handlePaywallDrawCardInstead = useCallback(async () => {
        const tarotQuestion =
            horoscopeQuestion || lastQuestion || question.trim()
        if (!tarotQuestion) return
        clearHoroscopeIntakeMessages()
        setHoroscopeQuestion(null)
        setHoroscopeBirth(null)
        setHoroscopeTransit(null)
        if (interpretationMode === "horoscope") {
            setInterpretationMode("auto")
            saveInterpretationModeToStorage("auto")
        }
        try {
            const savedBirth = loadBirthFromStorage()
            const savedBirthInfo = hasBirthDate(savedBirth)
                ? "saved_profile_in_action_trigger"
                : null
            const aiDecision = await fetchDecision(
                tarotQuestion,
                undefined,
                savedBirthInfo,
            )
            setDecision({
                ...normalizeDrawDecision({
                    ...aiDecision,
                    type: "draw",
                }),
                assistantText: "",
            })
        } catch {
            setDecision({
                type: "draw",
                assistantText: "",
                spreadType: "simple",
                cardCount: getTarotCardCount("simple"),
            })
        }
        setShowCardDraw(true)
        setLastQuestion(tarotQuestion)
        setQuestion("")
    }, [
        clearHoroscopeIntakeMessages,
        fetchDecision,
        hasBirthDate,
        horoscopeQuestion,
        interpretationMode,
        lastQuestion,
        normalizeDrawDecision,
        question,
    ])

    const inputSection = (
        <>
            <Dialog
                open={readAloudConfirmOpen}
                onOpenChange={(o) => {
                    if (!o) {
                        setReadAloudConfirmOpen(false)
                        setReadAloudPending(null)
                    }
                }}
            >
                <DialogContent className='sm:max-w-md border border-yellow-400/20 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 backdrop-blur-xl'>
                    <DialogHeader>
                        <DialogTitle className='text-yellow-200 font-serif text-xl flex items-center gap-2'>
                            <Star className='w-5 h-5 text-yellow-400 fill-yellow-400 shrink-0' />
                            {tHome("readAloud.confirmTitle")}
                        </DialogTitle>
                        <DialogDescription className='text-white/80 text-sm'>
                            {tHome("readAloud.confirmDescription")}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className='gap-2 sm:gap-0'>
                        <button
                            type='button'
                            onClick={handleReadAloudConfirm}
                            className='mb-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90'
                        >
                            {tHome("readAloud.confirm")}
                        </button>
                        <button
                            type='button'
                            onClick={() => {
                                setReadAloudConfirmOpen(false)
                                setReadAloudPending(null)
                            }}
                            className='rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10'
                        >
                            {tHome("readAloud.cancel")}
                        </button>

                        <label className='flex items-center gap-2 cursor-pointer text-sm text-white/80 hover:text-white mt-4'>
                            <Checkbox
                                checked={readAloudDoNotShowAgain}
                                onCheckedChange={(c) =>
                                    setReadAloudDoNotShowAgain(c === true)
                                }
                            />
                            {tHome("readAloud.doNotShowAgain")}
                        </label>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={showLocationDialog}
                onOpenChange={setShowLocationDialog}
            >
                <DialogContent className='sm:max-w-lg border-white/10 bg-[#0a0912]'>
                    <DialogHeader>
                        <DialogTitle>
                            {tActionTrigger("locationDialogTitle")}
                        </DialogTitle>
                        <DialogDescription>
                            {tActionTrigger("locationDialogDescription")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className='space-y-4'>
                        <LocationSelector
                            selectedCountry={locationDraftCountry}
                            selectedState={locationDraftState}
                            onCountryChange={setLocationDraftCountry}
                            onStateChange={setLocationDraftState}
                        />
                        <div className='grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70'>
                            <div>
                                <span className='text-white/50'>
                                    {tActionTrigger("latitude")}
                                </span>
                                <p className='mt-1 text-white'>
                                    {resolvedDraftLocation?.latitude?.toFixed(
                                        4,
                                    ) ??
                                        currentLocationFallback?.lat?.toFixed(
                                            4,
                                        ) ??
                                        "-"}
                                </p>
                            </div>
                            <div>
                                <span className='text-white/50'>
                                    {tActionTrigger("longitude")}
                                </span>
                                <p className='mt-1 text-white'>
                                    {resolvedDraftLocation?.longitude?.toFixed(
                                        4,
                                    ) ??
                                        currentLocationFallback?.lng?.toFixed(
                                            4,
                                        ) ??
                                        "-"}
                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className='gap-2'>
                        <button
                            type='button'
                            onClick={() => setShowLocationDialog(false)}
                            className='rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white'
                        >
                            {tActionTrigger("cancelIntake")}
                        </button>
                        <button
                            type='button'
                            onClick={handleSaveLocationDialog}
                            className='rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90'
                        >
                            {tActionTrigger("saveLocation")}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {sessionId && isOwner ? (
                <ShareAccessDialog
                    sessionId={sessionId}
                    open={shareDialogOpen}
                    onOpenChange={setShareDialogOpen}
                />
            ) : null}

            {composeAuthLoaded && !canCompose && !authLoading ? (
                <div className='mx-auto flex max-w-md flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/70 backdrop-blur-md sm:flex-row sm:justify-between'>
                    <div className='flex items-center gap-2 text-center sm:text-left'>
                        <EyeOff className='h-3.5 w-3.5 shrink-0 text-white/55' />
                        <span>
                            View-only conversation — only the creator and
                            invited people can continue this chat.
                        </span>
                    </div>
                    {user && initialSession?.owner_user_id ? (
                        <button
                            type='button'
                            onClick={() => void handleRequestAccess()}
                            disabled={
                                accessRequestSending || accessRequestSent
                            }
                            className='inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed'
                        >
                            {accessRequestSent
                                ? "Request sent"
                                : accessRequestSending
                                  ? "Sending…"
                                  : "Request access"}
                        </button>
                    ) : !user && initialSession?.owner_user_id ? (
                        <a
                            href={`/signin?callbackUrl=/${sessionId ?? ""}`}
                            className='inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/85 hover:bg-white/10 hover:text-white'
                        >
                            Sign in to request access
                        </a>
                    ) : null}
                </div>
            ) : null}

            {canCompose ? (
            <QuestionInput
                id='home-question-input'
                value={question}
                onChange={setQuestion}
                onSubmit={handleSubmit}
                onStop={handleStopStreaming}
                isLoading={isChatLoading}
                centered
                placeholder={
                    isHoroscopeIntakeActive
                        ? tHoroscope("composerBirthPlaceholder")
                        : canShowCardDrawSection
                          ? cardUi.pickAllPlaceholder
                          : undefined
                }
                className='w-full'
                interpretationMode={
                    isHoroscopeIntakeActive ? undefined : interpretationMode
                }
                onInterpretationModeChange={
                    isHoroscopeIntakeActive ? undefined : setInterpretationMode
                }
                composerSettings={
                    isHoroscopeIntakeActive
                        ? null
                        : {
                              showAutoPick: true,
                              autoPickOn,
                              onToggleAutoPick: handleToggleAutoPick,
                              exposeBirthDrawInMenu: Boolean(
                                  composerFollowUpHost &&
                                      !composerSuggestionsEnabled,
                              ),
                              showComposerSuggestionsToggle: true,
                              composerSuggestionsEnabled,
                              onComposerSuggestionsEnabledChange:
                                  handleComposerSuggestionsEnabledChange,
                              savedBirth,
                              onBirthInfoClick: () => {
                                  router.push(`/${locale}/profile`)
                              },
                              showDrawTrigger,
                              showInsufficientStars,
                              cardsToSelect,
                              cardUi,
                              onScrollToDraw: handleScrollToDraw,
                              showShareAccess: Boolean(
                                  isOwner && sessionId,
                              ),
                              onShareAccessClick: () =>
                                  setShareDialogOpen(true),
                          }
                }
                composerFollowUps={
                    composerFollowUpsVisible && composerFollowUpHost
                        ? {
                              messageId: composerFollowUpHost.id,
                              items: composerFollowUpHost.followUpSuggestions!.slice(
                                  0,
                                  4,
                              ),
                              onSelect: (text: string) => {
                                  applySuggestedQuestion(unmask(text))
                              },
                              onDismissStrip: () => {
                                  handleComposerSuggestionsEnabledChange(false)
                              },
                              privacyAliases,
                          }
                        : null
                }
                actionTrigger={
                    hideComposerActionTriggerRow ? null : (
                        <div className='space-y-3'>
                            {showOriginContextStrip && originContext ? (
                                <OriginContextStrip
                                    originContext={originContext}
                                    suggestions={
                                        originContextStripSuggestions ??
                                        undefined
                                    }
                                    onSuggestionClick={(suggestion) =>
                                        applySuggestedQuestion(
                                            unmask(suggestion),
                                        )
                                    }
                                    onCancel={handleClearOriginContext}
                                />
                            ) : null}
                            <ActionTrigger
                                autoPickOn={autoPickOn}
                                showDrawTrigger={showDrawTrigger}
                                showInsufficientStars={showInsufficientStars}
                                cardsToSelect={cardsToSelect}
                                cardUi={cardUi}
                                onScrollToDraw={handleScrollToDraw}
                                intakeMode={isHoroscopeIntakeActive}
                                intakeHelperText={tActionTrigger(
                                    "birthTimeHelper",
                                )}
                                currentLocationLabel={
                                    formattedCurrentLocationLabel
                                }
                                onLocationClick={openLocationDialog}
                                onCancelIntake={handleCancelHoroscopeIntake}
                                onChooseCardInstead={handleChooseCardInstead}
                            />
                        </div>
                    )
                }
                disclaimerText={disclaimerText}
                showDisclaimer={!hasAssistantResponse}
                inputWrapperClassName={
                    hasMessages ? "max-w-3xl" : "max-w-sm md:max-w-md"
                }
            />
            ) : null}
        </>
    )

    return (
        <div
            className='w-full h-full min-h-[calc(100dvh-65px)] flex flex-col overflow-hidden relative'
            style={{ paddingBottom: fixedBarHeight || 40 }}
        >
            {shouldShowHero && (
                <div
                    className={`flex-1 flex items-center justify-center px-6 ${
                        isInputFixed ? "pb-32" : ""
                    }`}
                >
                    <div className='text-center space-y-4'>
                        {!consulting && (
                            <h1 className='font-playfair font-bold text-4xl sm:text-5xl md:text-6xl text-white'>
                                <TypewriterText
                                    text={heroText}
                                    speed={50}
                                    className='font-playfair text-white bg-gradient-to-r from-primary via-accent to-primary bg-clip-text'
                                />
                            </h1>
                        )}
                        {!consulting && (
                            <h1 className='font-playfair font-bold text-4xl sm:text-5xl md:text-6xl text-white'>
                                <TypewriterText
                                    text={tHome("hero.line2")}
                                    speed={50}
                                    delay={1000}
                                    className='font-playfair text-transparent bg-gradient-to-r from-primary via-accent to-primary bg-clip-text'
                                />
                            </h1>
                        )}
                        {shouldShowLearnMore && (
                            <button
                                type='button'
                                className='animate-fade-swap text-xs sm:text-sm uppercase tracking-widest text-white/70 hover:text-white transition-colors'
                                onClick={() => {
                                    window.location.href = "/about"
                                }}
                            >
                                <span className='flex items-center gap-4'>
                                    <span className='h-px w-10 bg-white/30' />
                                    {tHome("learnMore")}
                                    <span className='h-px w-10 bg-white/30' />
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            <MessageList
                hasMessages={hasMessages}
                messages={messages}
                editingMessageId={editingMessageId}
                editingDraft={editingDraft}
                setEditingDraft={setEditingDraft}
                isChatLoading={isChatLoading}
                consulting={consulting}
                isInterpreting={isInterpreting}
                positionMeanings={POSITION_MEANINGS}
                hasInterpretation={hasInterpretation}
                assistantReactions={assistantReactions}
                messageNotices={messageNotices}
                isHoroscopeIntakeActive={isHoroscopeIntakeActive}
                isCheckingStars={isCheckingStars}
                checkingStarsText={tHome("checkingStars")}
                showInsufficientStars={showInsufficientStars}
                insufficientStarsType={
                    insufficientStarsType ??
                    (decision?.type === "horoscope" ? "horoscope" : "tarot")
                }
                cardDrawSection={cardDrawSection}
                hasAssistantResponse={hasAssistantResponse}
                disclaimerText={disclaimerText}
                onRegenerateAt={handleRegenerateAt}
                onCalendarChipClick={handleCalendarChipClick}
                onCalendarSelectionChange={handleCalendarSelectionChange}
                calendarToolResetSignal={calendarToolResetSignal}
                onStartEditAt={handleStartEditAt}
                onCancelEdit={handleCancelEdit}
                onSendEditAt={handleSendEditAt}
                onAskAspectDetail={handleAskAspectDetail}
                onPickTransitDate={handlePickTransitDate}
                onHoroscopeAuthGateCardsSelected={handleCardsSelected}
                onPaywallDrawCardInstead={handlePaywallDrawCardInstead}
                onCancelHoroscopeLoading={handleCancelHoroscopeLoading}
                onRegenerateHoroscope={regenerateHoroscopeAt}
                onRegenerateTarot={regenerateTarotAt}
                onTarotInterpretationChange={handleTarotInterpretationChange}
                onRefetchHoroscopeWithSystem={refetchHoroscopeWithSystem}
                onToggleReaction={toggleReaction}
                onReport={handleReport}
                onShare={handleShare}
                onReadingTextDownloaded={handleReadingTextDownloaded}
                onReadingTextDownloadFailed={handleReadingTextDownloadFailed}
                onReadAloud={handleReadAloud}
                unmask={unmask}
                privacyAliases={privacyAliases}
                readAloudLoadingMessageId={readAloudLoadingMessageId}
                readAloudPlayingMessageId={readAloudPlayingMessageId}
                lastAssistantMessageRef={lastAssistantMessageRef}
                insufficientStarsRef={insufficientStarsRef}
                messagesEndRef={messagesEndRef}
                composerRef={fixedBarRef}
                onComposerScrollDownChange={setComposerScrollDown}
            />

            <div className='sticky bottom-0 w-full bg-gradient-to-t from-black/90 via-black/60 to-transparent backdrop-blur-xl pt-4 transition-all duration-500'>
                <div
                    className={`w-full max-w-3xl mx-auto px-4 space-y-4 transition-all duration-500 ${
                        hasMessages ? "pb-8" : "pb-4"
                    }`}
                >
                    {shouldShowPrompts && (
                        <button
                            type='button'
                            onClick={() =>
                                setQuestion(prompts[activePromptIndex] ?? "")
                            }
                            className='animate-fade-swap text-sm sm:text-base text-white/70 hover:text-white transition-colors underline underline-offset-4 decoration-white/30 hover:decoration-white/70'
                            key={prompts[activePromptIndex]}
                        >
                            {prompts[activePromptIndex]}
                        </button>
                    )}
                </div>
                <div
                    className={`transition-all duration-500 ease-in-out ${
                        hasMessages
                            ? "opacity-0 h-0 overflow-hidden pointer-events-none"
                            : "opacity-100"
                    }`}
                >
                    <Footer />
                </div>
            </div>
            {isInputFixed && (
                <div className='fixed bottom-0 left-0 right-0 z-30'>
                    <div ref={fixedBarRef} className='relative'>
                        {composerScrollDown.visible &&
                        composerScrollDown.scrollToBottom ? (
                            <button
                                type='button'
                                onClick={() =>
                                    composerScrollDown.scrollToBottom?.()
                                }
                                className='absolute left-1/2 z-40 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-white/20 bg-[#0a0f26]/95 text-white shadow-[0_8px_28px_-8px_rgba(0,0,0,0.75)] backdrop-blur-md transition-colors hover:border-white/35 hover:bg-[#121a32] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 bottom-full mb-2'
                                aria-label={tHome("scrollToBottomAria")}
                                title={tHome("scrollToBottom")}
                            >
                                <ArrowDown
                                    className='size-5 shrink-0'
                                    strokeWidth={2.25}
                                    aria-hidden
                                />
                            </button>
                        ) : null}
                        {inputSection}
                        <CookiesBanner inline />
                    </div>
                </div>
            )}
        </div>
    )
}
