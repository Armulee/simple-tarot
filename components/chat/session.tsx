"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import { experimental_useObject as useObject } from "@ai-sdk/react"
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
    type HoroscopeInterpretation,
} from "@/lib/astrology/schema"
import {
    mergeAspectKeywordsIntoAspects,
    type AspectKeywordItem,
} from "@/lib/astrology/transit-aspects"
import { getDefaultAstrologySystem } from "@/lib/astrology/intake"
import {
    buildConversationContextFromMessages,
    buildSessionContextSummary,
} from "@/lib/astrology/question-context"
import { chartDataToBirth, chartDataToTransit } from "@/lib/chart-data-to-birth"
import { loadBirthFromStorage, saveBirthToStorage } from "@/lib/birth-storage"
import {
    applyEphemerisLocationTimeDefaults,
    hasHoroscopeBirthDate,
    mergeHoroscopeBirthWithProfile,
} from "@/lib/horoscope-profile-birth"
import {
    loadAutoPickFromStorage,
    saveAutoPickToStorage,
} from "@/lib/auto-pick-storage"
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
import MessageList from "@/components/chat/message-list"
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
import { Star } from "lucide-react"
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
    HoroscopeExtractResponse,
    SourceAspectEvent,
} from "@/components/chat/types"

import { getTarotCardCount } from "@/lib/chat/decision-schema"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/contexts/profile-context"
import { supabase } from "@/lib/supabase"
import { sanitizePromptOnClient } from "@/lib/privacy/sanitize-client"
import {
    buildPrivacyStorageKey,
    loadRawPromptFromSession,
    loadSessionAliases,
    removeRawPromptFromSession,
    saveRawPromptToSession,
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
        const capped =
            cleaned.length > 4 ? cleaned.slice(0, 4) : cleaned
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
              subtext?: string | null
              actions?: Array<string | null | undefined> | null
              watchOut?: string | null
              focusArea?: string | null
          }
        | null
        | undefined,
): ChatMessage["dailyVerdict"] | undefined {
    if (!verdict) return undefined
    const mood = verdict.mood
    if (mood !== "good" && mood !== "caution" && mood !== "rest") return undefined
    const headline = (verdict.headline ?? "").trim()
    if (!headline) return undefined
    const subtext = (verdict.subtext ?? "").trim()
    const actions = (verdict.actions ?? [])
        .map((a) => (typeof a === "string" ? a.trim() : ""))
        .filter(Boolean)
        .slice(0, 3)
    if (actions.length === 0) return undefined
    const watchOut = verdict.watchOut?.trim() || undefined
    const focusArea = verdict.focusArea?.trim() || undefined
    return { mood, headline, subtext, actions, watchOut, focusArea }
}

function areDailyVerdictsEqual(
    a: ChatMessage["dailyVerdict"] | null | undefined,
    b: ChatMessage["dailyVerdict"] | null | undefined,
) {
    if (a === b) return true
    if (!a || !b) return false
    if (a.mood !== b.mood) return false
    if (a.headline !== b.headline) return false
    if (a.subtext !== b.subtext) return false
    if ((a.watchOut ?? "") !== (b.watchOut ?? "")) return false
    if ((a.focusArea ?? "") !== (b.focusArea ?? "")) return false
    if (a.actions.length !== b.actions.length) return false
    for (let i = 0; i < a.actions.length; i++) {
        if (a.actions[i] !== b.actions[i]) return false
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
    const { user } = useAuth()
    const { profile } = useProfile()
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
    const [messages, setMessages] = useState<ChatMessage[]>(
        Array.isArray(initialSession?.messages)
            ? normalizeRestoredMessages(initialSession.messages)
            : [],
    )
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
    const [dismissedComposerStripForMessageId, setDismissedComposerStripForMessageId] =
        useState<string | null>(null)
    const [sessionId] = useState<string | null>(initialSession?.id ?? null)
    const [privacyAliases, setPrivacyAliases] = useState<PromptAliasEntry[]>(
        () => loadSessionAliases(initialSession?.id ?? null),
    )
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
    } | null>(() => {
        const saved = loadBirthFromStorage()
        if (
            saved?.country &&
            saved.lat != null &&
            saved.lng != null &&
            saved.timezone != null
        ) {
            return {
                country: saved.country,
                state: saved.state ?? undefined,
                lat: saved.lat,
                lng: saved.lng,
                timezone: saved.timezone,
            }
        }
        return null
    })
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
    const [autoPickOn, setAutoPickOn] = useState(() =>
        loadAutoPickFromStorage(),
    )
    const [interpretationMode, setInterpretationMode] =
        useState<InterpretationMode>(() => loadInterpretationModeFromStorage())
    const [savedBirth, setSavedBirth] = useState<HoroscopeBirthData | null>(
        () => loadBirthFromStorage(),
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
    const prevMessagesLengthRef = useRef(0)
    const prevConsultingRef = useRef(false)
    const prevIsInterpretingRef = useRef(false)
    const hasBootstrapped = useRef(false)
    const persistTimeoutRef = useRef<number | null>(null)
    const consultingLoadingIdRef = useRef<string | null>(null)
    const interpretationLoadingIdRef = useRef<string | null>(null)
    const horoscopeTargetMessageIdRef = useRef<string | null>(null)
    const horoscopeIsRefetchRef = useRef(false)
    const horoscopeRefetchSystemRef = useRef<
        "western_tropical" | "vedic_sidereal" | null
    >(null)
    const horoscopeCachedBeforeRefetchRef = useRef<
        "western_tropical" | "vedic_sidereal" | null
    >(null)
    const horoscopeLastTransitRef = useRef<HoroscopeTransitData | null>(null)
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
        submit: submitHoroscope,
        object: horoscopeObject,
        stop: stopHoroscope,
    } = useObject({
        api: "/api/horoscope/question",
        schema: horoscopeInterpretationSchema,
        fetch: async (url, options) => {
            const res = await fetch(url, options)
            const targetId = horoscopeTargetMessageIdRef.current
            if (targetId && options?.body) {
                try {
                    const bodyPayload =
                        typeof options.body === "string"
                            ? JSON.parse(options.body)
                            : options.body
                    const { question, birth, transit, system, locale } =
                        bodyPayload ?? {}
                    if (question && birth) {
                        fetch("/api/horoscope/chart-data", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                question,
                                birth,
                                transit,
                                system,
                                locale,
                            }),
                        })
                            .then((r) => r.json())
                            .then((chartData: Record<string, unknown>) => {
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
                            })
                            .catch(() => {
                                /* chart-data fetch failed; cards just won't render */
                            })
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
                setMessages((prev) => {
                    const msg = prev.find((m) => m.id === targetId)
                    const birth = msg?.horoscopeBirthData
                    const withoutLoading = prev.filter((m) => m.id !== targetId)
                    return [
                        ...withoutLoading,
                        {
                            id: `assistant-tool-user-date-form-${Date.now()}`,
                            role: "assistant",
                            text: "",
                            variant: "tool",
                            toolType: "user-date-form",
                            toolBirthPrefill: birth ?? null,
                            toolTransitPrefill: horoscopeLastTransitRef.current,
                            toolFromCancel: true,
                        },
                    ]
                })
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
            horoscopeRefetchSystemRef.current = null
            horoscopeCachedBeforeRefetchRef.current = null
            setIsInterpreting(false)
        },
    })

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
                ?.dailyVerdict as Parameters<typeof normalizeDailyVerdict>[0] | undefined,
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
        horoscopeIsRefetchRef.current = false
        horoscopeRefetchSystemRef.current = null
        horoscopeCachedBeforeRefetchRef.current = null
        setIsInterpreting(false)
        stopHoroscope()
        return true
    }, [horoscopeObject, stopHoroscope])

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
            stopInterpretation()
            stopHoroscope()
        }
    }, [stopInterpretation, stopHoroscope])

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
            await fetch(`/api/chat-sessions/${sessionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
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
    const defaultCardsToSelect = useMemo(
        () => decision?.cardCount ?? 0,
        [decision],
    )
    const cardsToSelect = useMemo(
        () => cardCountOverride ?? defaultCardsToSelect,
        [cardCountOverride, defaultCardsToSelect],
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

    const sanitizeHoroscopeDecisionForAuth = useCallback(
        (decision: ChatDecision): ChatDecision => {
            if (user || decision.type !== "horoscope") return decision
            return {
                ...decision,
                type: "chat",
                spreadType: undefined,
                cardCount: undefined,
                spreadReason: undefined,
            }
        },
        [user],
    )

    const applyInterpretationModeOverride = useCallback(
        (decision: ChatDecision): ChatDecision => {
            if (interpretationMode === "auto") return decision
            if (interpretationMode === "chat") {
                return { ...decision, type: "chat" }
            }
            if (interpretationMode === "tarot") {
                return { ...decision, type: "draw" }
            }
            if (interpretationMode === "horoscope") {
                if (!user) return decision
                return { ...decision, type: "horoscope" }
            }
            return decision
        },
        [interpretationMode, user],
    )

    const normalizeDrawDecision = useCallback((decision: ChatDecision) => {
        if (decision.type !== "draw") {
            return {
                ...decision,
                spreadType: undefined,
                cardCount: undefined,
                spreadReason: undefined,
            }
        }

        const spreadType = decision.spreadType ?? "simple"
        return {
            ...decision,
            spreadType,
            cardCount: getTarotCardCount(spreadType),
        }
    }, [])

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

    const isHoroscopeReady = useCallback((data: HoroscopeBirthData | null) => {
        if (!data) return false
        return hasHoroscopeBirthDate(data)
    }, [])

    const hasBirthDate = useCallback((data: HoroscopeBirthData | null) => {
        return Boolean(data?.day && data?.month && data?.year)
    }, [])

    const mergeHoroscopeBirth = useCallback(
        (
            current: HoroscopeBirthData | null,
            incoming: HoroscopeExtractResponse,
        ): HoroscopeBirthData => {
            const merged: HoroscopeBirthData = {
                day: incoming?.birthDate?.day ?? current?.day ?? null,
                month: incoming?.birthDate?.month ?? current?.month ?? null,
                year: incoming?.birthDate?.year ?? current?.year ?? null,
                hour: incoming?.birthTime?.hour ?? current?.hour ?? null,
                minute: incoming?.birthTime?.minute ?? current?.minute ?? null,
                timeHint:
                    incoming?.birthTime?.timeHint ??
                    current?.timeHint ??
                    "unknown",
                timezone:
                    incoming?.location?.timezone ?? current?.timezone ?? null,
                lat: incoming?.location?.lat ?? current?.lat ?? null,
                lng: incoming?.location?.lng ?? current?.lng ?? null,
                country:
                    incoming?.location?.country ?? current?.country ?? null,
                state: incoming?.location?.state ?? current?.state ?? null,
                usedLocationFallback:
                    incoming?.location?.usedLocationFallback ??
                    current?.usedLocationFallback ??
                    false,
            }
            return ensureBirthTimeDefaults(merged) ?? merged
        },
        [ensureBirthTimeDefaults],
    )

    const pushToolCard = useCallback((birth: HoroscopeBirthData | null) => {
        setMessages((prev) => [
            ...prev.filter(
                (m) =>
                    !(m.variant === "tool" && m.toolType === "user-date-form"),
            ),
            {
                id: `assistant-tool-user-date-form-${Date.now()}`,
                role: "assistant",
                text: "",
                variant: "tool",
                toolType: "user-date-form",
                toolBirthPrefill: birth,
            },
        ])
    }, [])

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
                const withoutForms = prev.filter(
                    (m) =>
                        !(
                            m.variant === "tool" &&
                            (m.toolType === "user-date-form" ||
                                m.toolType === "transit-date-form")
                        ),
                )
                const last = withoutForms[withoutForms.length - 1]
                const withoutBridgeLoading =
                    last?.role === "assistant" &&
                    (last.variant === "plain" || !last.variant) &&
                    last.isLoading === true
                        ? withoutForms.slice(0, -1)
                        : withoutForms
                const pendingAspect = pendingAspectDetailRef.current
                const userPrivacy = lastUserPrivacyRef.current
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
                        ...(pendingAspect && {
                            sourceAspectKey: pendingAspect.aspectKey,
                            sourceAspectEvent: pendingAspect.event,
                        }),
                    },
                ]
            })
            submitHoroscope({
                question: questionText,
                conversationContext:
                    buildHoroscopeConversationContext(questionText),
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
            })
            setHoroscopeBirth(null)
            setHoroscopeQuestion(null)
            setHoroscopeTransit(null)
        },
        [
            buildHoroscopeConversationContext,
            ensureBirthTimeDefaults,
            horoscopeSystem,
            locale,
            submitHoroscope,
            user,
        ],
    )

    const regenerateHoroscopeAt = useCallback(
        (messageId: string) => {
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
            })
        },
        [
            buildHoroscopeConversationContext,
            locale,
            messages,
            submitHoroscope,
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
            })
        },
        [
            buildHoroscopeConversationContext,
            locale,
            messages,
            submitHoroscope,
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
                        },
                    ])
                }

                const response = await fetch("/api/horoscope/extract", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: trimmed,
                        locale,
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
                const extractedHasBirthDate = Boolean(
                    extracted?.birthDate?.day &&
                        extracted?.birthDate?.month &&
                        extracted?.birthDate?.year,
                )
                const storedBirth = loadBirthFromStorage()
                const currentBirth = extractedHasBirthDate
                    ? horoscopeBirth
                    : (storedBirth ?? horoscopeBirth)
                const nextBirth = mergeHoroscopeBirth(currentBirth, extracted)
                const mergedWithProfile = mergeHoroscopeBirthWithProfile(
                    nextBirth,
                    user ? profile : null,
                )
                const birthToUse = applyEphemerisLocationTimeDefaults(
                    mergedWithProfile,
                )
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

                const ready = isHoroscopeReady(birthToUse)
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
                if (!ready) {
                    pushToolCard(birthToUse)
                    return
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
                if (normalizedBirth) {
                    saveBirthToStorage(normalizedBirth)
                    setSavedBirth(normalizedBirth)
                }
                if (birthToUse.usedLocationFallback) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: `assistant-${Date.now()}`,
                            role: "assistant",
                            text: tHoroscope("usingLocationFallback"),
                            variant: "plain",
                        },
                    ])
                }
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
            horoscopeBirth,
            horoscopeQuestion,
            isHoroscopeReady,
            lastQuestion,
            locale,
            mergeHoroscopeBirth,
            pushToolCard,
            ensureBirthTimeDefaults,
            runHoroscopeReading,
            spendStars,
            tHoroscope,
            horoscopeTransit,
            user,
            profile,
        ],
    )

    const handleUserDateFormSubmit = useCallback(
        async (value: HoroscopeBirthData) => {
            if (!user) return
            const merged = mergeHoroscopeBirthWithProfile(value, profile)
            const normalized = applyEphemerisLocationTimeDefaults(merged)
            setHoroscopeBirth(normalized)
            setSavedBirth(loadBirthFromStorage() ?? normalized)
            const questionText =
                horoscopeQuestion || lastQuestion || "General horoscope reading"
            if (!isHoroscopeReady(normalized)) {
                return
            }
            const starOk = spendStars(1)
            if (!starOk) {
                setShowInsufficientStars(true)
                setInsufficientStarsType("horoscope")
                return
            }
            await runHoroscopeReading(
                normalized,
                questionText,
                horoscopeTransit,
            )
        },
        [
            horoscopeQuestion,
            lastQuestion,
            isHoroscopeReady,
            runHoroscopeReading,
            spendStars,
            horoscopeTransit,
            user,
            profile,
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
            const contextSummary = buildSessionContextSummary(messages)
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
                    interpretationMode: modeForApi,
                    contextSummary: contextSummary || undefined,
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
        [messages, parseDecision, interpretationMode, user],
    )

    const streamAssistantResponse = useCallback(
        async ({
            question,
            type,
            isFollowUp,
            historyOverride,
            savedBirthInfo,
            onChunk,
        }: {
            question: string
            type: ChatDecision["type"]
            isFollowUp?: boolean
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
            const contextSummary = buildSessionContextSummary(messages)
            const response = await fetch("/api/chat/respond", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                    type,
                    isFollowUp,
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
        [messages],
    )

    const handleStopStreaming = useCallback(() => {
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
        finalizeHoroscopeStream,
        finalizeTarotInterpretationStream,
    ])

    const handleCancelHoroscopeLoading = useCallback(() => {
        stopHoroscope()
    }, [stopHoroscope])

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
                nextDecision = sanitizeHoroscopeDecisionForAuth(nextDecision)
                nextDecision = applyInterpretationModeOverride(nextDecision)
                nextDecision = normalizeDrawDecision(nextDecision)
                flowDecision = nextDecision
                setDecision(nextDecision)
                const assistantText = await streamAssistantResponse({
                    question: trimmed,
                    type: nextDecision.type,
                    isFollowUp: nextDecision.isFollowUp,
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
                              }
                            : m,
                    ),
                )
                consultingLoadingIdRef.current = null

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
            consulting,
            fetchDecision,
            freezeStoppedPlainMessage,
            getDefaultSystemByLocale,
            handleHoroscopeInput,
            hasBirthDate,
            isInterpreting,
            normalizeDrawDecision,
            sanitizeHoroscopeDecisionForAuth,
            streamAssistantResponse,
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
                nextDecision = sanitizeHoroscopeDecisionForAuth(nextDecision)
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
                const assistantText = await streamAssistantResponse({
                    question: trimmed,
                    type: nextDecision.type,
                    isFollowUp: nextDecision.isFollowUp,
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
                              }
                            : m,
                    ),
                )
                consultingLoadingIdRef.current = null

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
            fetchDecision,
            freezeStoppedPlainMessage,
            getDefaultSystemByLocale,
            handleHoroscopeInput,
            hasBirthDate,
            messages,
            normalizeDrawDecision,
            sanitizeHoroscopeDecisionForAuth,
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
        [locale, sessionId],
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

    const clearHoroscopeIntakeMessages = useCallback(() => {
        setMessages((prev) =>
            prev.filter(
                (m) =>
                    !(m.variant === "tool" && m.toolType === "user-date-form"),
            ),
        )
    }, [])

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
        showCardDraw && cardsToSelect > 0 && hasEnoughStars !== null

    const handleScrollToDraw = () => {
        const target = showInsufficientStars
            ? insufficientStarsRef.current
            : cardDrawTargetRef.current
        target?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    const handleCardsToSelectChange = useCallback(
        (nextCount: number) => {
            const boundedCount = Math.max(
                1,
                Math.min(10, Math.floor(nextCount)),
            )
            setCardCountOverride(
                boundedCount === defaultCardsToSelect ? null : boundedCount,
            )
            if (selectedCount > boundedCount) {
                setSelectedCount(0)
                setCardSelectionResetSignal((prev) => prev + 1)
            }
        },
        [defaultCardsToSelect, selectedCount],
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
        />
    ) : null

    const activeHoroscopeIntakeMessage = useMemo(() => {
        let latest: ChatMessage | null = null
        for (let i = messages.length - 1; i >= 0; i -= 1) {
            const message = messages[i]
            if (message.variant === "horoscope" && !message.isLoading) {
                break
            }
            if (
                message.variant === "tool" &&
                message.toolType === "user-date-form"
            ) {
                latest = message
                break
            }
        }
        return latest
    }, [messages])
    const isHoroscopeIntakeActive = Boolean(activeHoroscopeIntakeMessage)

    const composerFollowUpHost = useMemo(() => {
        if (messages.length === 0) return null
        const last = messages[messages.length - 1]
        if (last.role !== "assistant") return null
        if (last.followUpLoading) return null
        const sugg = last.followUpSuggestions
        if (!Array.isArray(sugg) || sugg.length === 0) return null
        return last
    }, [messages])

    useEffect(() => {
        if (messages.length === 0) {
            setDismissedComposerStripForMessageId(null)
        }
    }, [messages.length])

    const stripDismissedForCurrentHost = Boolean(
        composerFollowUpHost &&
            dismissedComposerStripForMessageId === composerFollowUpHost.id,
    )

    const composerFollowUpsVisible =
        !isHoroscopeIntakeActive &&
        Boolean(composerFollowUpHost) &&
        !stripDismissedForCurrentHost

    const hideComposerActionTriggerRow =
        (Boolean(composerFollowUpHost) &&
            !isHoroscopeIntakeActive &&
            !stripDismissedForCurrentHost) ||
        stripDismissedForCurrentHost

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
                                      stripDismissedForCurrentHost,
                              ),
                              savedBirth,
                              onBirthInfoClick: () => {
                                  router.push(`/${locale}/profile`)
                              },
                              showDrawTrigger,
                              showInsufficientStars,
                              cardsToSelect,
                              cardUi,
                              onScrollToDraw: handleScrollToDraw,
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
                                  if (composerFollowUpHost) {
                                      setDismissedComposerStripForMessageId(
                                          composerFollowUpHost.id,
                                      )
                                  }
                              },
                              privacyAliases,
                          }
                        : null
                }
                actionTrigger={
                    hideComposerActionTriggerRow ? null : (
                        <ActionTrigger
                            autoPickOn={autoPickOn}
                            showDrawTrigger={showDrawTrigger}
                            showInsufficientStars={showInsufficientStars}
                            cardsToSelect={cardsToSelect}
                            cardUi={cardUi}
                            onScrollToDraw={handleScrollToDraw}
                            intakeMode={isHoroscopeIntakeActive}
                            intakeHelperText={tActionTrigger("birthTimeHelper")}
                            currentLocationLabel={formattedCurrentLocationLabel}
                            onLocationClick={openLocationDialog}
                            onCancelIntake={handleCancelHoroscopeIntake}
                            onChooseCardInstead={handleChooseCardInstead}
                        />
                    )
                }
                disclaimerText={disclaimerText}
                showDisclaimer={!hasAssistantResponse}
                inputWrapperClassName={
                    hasMessages ? "max-w-3xl" : "max-w-sm md:max-w-md"
                }
            />
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
                horoscopeBirth={horoscopeBirth}
                currentLocationFallback={currentLocationFallback}
                isHoroscopeIntakeActive={isHoroscopeIntakeActive}
                profileHasBirthDate={Boolean(user?.id && profile?.birth_date)}
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
                birthFormTitle={tHoroscope("birthFormTitle")}
                birthFormSubmit={tHoroscope("birthFormSubmit")}
                onRegenerateAt={handleRegenerateAt}
                onStartEditAt={handleStartEditAt}
                onCancelEdit={handleCancelEdit}
                onSendEditAt={handleSendEditAt}
                onAskAspectDetail={handleAskAspectDetail}
                onUserDateFormSubmit={handleUserDateFormSubmit}
                onCancelHoroscopeLoading={handleCancelHoroscopeLoading}
                onRegenerateHoroscope={regenerateHoroscopeAt}
                onRegenerateTarot={regenerateTarotAt}
                onTarotInterpretationChange={handleTarotInterpretationChange}
                onRefetchHoroscopeWithSystem={refetchHoroscopeWithSystem}
                onToggleReaction={toggleReaction}
                onReport={handleReport}
                onShare={handleShare}
                onReadAloud={handleReadAloud}
                unmask={unmask}
                privacyAliases={privacyAliases}
                readAloudLoadingMessageId={readAloudLoadingMessageId}
                readAloudPlayingMessageId={readAloudPlayingMessageId}
                lastAssistantMessageRef={lastAssistantMessageRef}
                insufficientStarsRef={insufficientStarsRef}
                messagesEndRef={messagesEndRef}
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
                <div
                    ref={fixedBarRef}
                    className='fixed bottom-0 left-0 right-0 z-30'
                >
                    {inputSection}
                    <CookiesBanner inline />
                </div>
            )}
        </div>
    )
}
