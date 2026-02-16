"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { experimental_useObject as useObject } from "@ai-sdk/react"
import { useStars } from "@/contexts/stars-context"
import Footer from "@/components/footer/footer"
import { TypewriterText } from "@/components/typewriter-text"
import QuestionInput from "@/components/question-input"
import type { TarotCard } from "@/contexts/tarot-context"
import { getTarotReadingPrompt } from "@/lib/prompts"
import {
    tarotInterpretationSchema,
    type TarotInterpretation,
} from "@/lib/tarot/schema"
import { getDefaultAstrologySystem } from "@/lib/astrology/intake"
import {
    chartDataToBirth,
    chartDataToTransit,
} from "@/lib/chart-data-to-birth"
import { loadBirthFromStorage } from "@/lib/birth-storage"
import { resolveLocationFromCoords } from "@/lib/location"
import type {
    HoroscopeBirthData,
    HoroscopeTransitData,
} from "@/types/horoscope"
import DrawCardSection from "@/components/chat/draw-card-section"
import DrawTrigger from "@/components/chat/draw-trigger"
import MessageList from "@/components/chat/message-list"
import {
    CARD_UI_TEXT,
    isPickForMeIntent,
    normalizeLocale,
} from "@/components/chat/card-ui"
import type {
    ChatDecision,
    ChatMessage,
    ChatSessionPayload,
    HoroscopeExtractResponse,
} from "@/components/chat/types"

export type { ChatDecision } from "@/components/chat/types"

export default function ChatSession({
    initialSession,
}: {
    initialSession?: ChatSessionPayload | null
}) {
    const tHome = useTranslations("Home")
    const tReadingTypes = useTranslations("Reading.types")
    const tHoroscope = useTranslations("HoroscopeChat")

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
    const [aiLocale, setAiLocale] = useState<"en" | "th" | null>(null)
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
        Array.isArray(initialSession?.messages) ? initialSession.messages : [],
    )
    const [decision, setDecision] = useState<ChatDecision | null>(
        initialSession?.decision ?? null,
    )
    const [isInterpreting, setIsInterpreting] = useState(false)
    const [lastQuestion, setLastQuestion] = useState(
        initialSession?.question ?? "",
    )
    const [loadingDots, setLoadingDots] = useState(1)
    const [selectedCount, setSelectedCount] = useState(0)
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
    const [sessionId] = useState<string | null>(initialSession?.id ?? null)
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
    const abortControllerRef = useRef<AbortController | null>(null)
    const horoscopeAbortRef = useRef<AbortController | null>(null)
    const [showInsufficientStars, setShowInsufficientStars] = useState<boolean>(
        initialSession?.showInsufficientStars ?? false,
    )
    const [showCardDraw, setShowCardDraw] = useState(
        initialSession?.showCardDraw ?? false,
    )
    const [editingMessageId, setEditingMessageId] = useState<string | null>(
        null,
    )
    const [editingDraft, setEditingDraft] = useState("")
    const messagesEndRef = useRef<HTMLDivElement | null>(null)
    const lastAssistantMessageRef = useRef<HTMLDivElement | null>(null)
    const cardDrawTargetRef = useRef<HTMLDivElement | null>(null)
    const insufficientStarsRef = useRef<HTMLDivElement | null>(null)
    const prevMessagesLengthRef = useRef(0)
    const prevConsultingRef = useRef(false)
    const prevIsInterpretingRef = useRef(false)
    const hasBootstrapped = useRef(false)
    const persistTimeoutRef = useRef<number | null>(null)
    const interpretationLoadingIdRef = useRef<string | null>(null)

    const {
        submit: submitInterpretation,
        object: interpretationObject,
        isLoading: isInterpretationLoading,
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
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === lid
                        ? {
                              ...m,
                              text: object.interpretation || m.text,
                              insights: insights ?? m.insights,
                              isLoading: false,
                              followUpConclusion: object.conclusion?.trim(),
                              followUpSuggestions: object.suggestions
                                  ?.map((s) =>
                                      typeof s === "string" ? s.trim() : "",
                                  )
                                  .filter(Boolean)
                                  .slice(0, 5),
                              followUpLoading: false,
                          }
                        : m,
                ),
            )
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

    // Stream interpretation object updates to the loading message
    useEffect(() => {
        const lid = interpretationLoadingIdRef.current
        if (!lid || !interpretationObject) return
        const insights = interpretationObject.cardInsights
            ?.filter((s): s is string => typeof s === "string")
            ?? undefined
        const suggestions = interpretationObject.suggestions
            ?.map((s) => (typeof s === "string" ? s.trim() : ""))
            .filter(Boolean)
            .slice(0, 5) ?? undefined
        setMessages((prev) =>
            prev.map((m) =>
                m.id === lid
                    ? {
                          ...m,
                          text:
                              interpretationObject.interpretation ?? m.text ?? "",
                          insights: insights ?? m.insights,
                          followUpConclusion:
                              interpretationObject.conclusion?.trim() ??
                              m.followUpConclusion,
                          followUpSuggestions:
                              suggestions ?? m.followUpSuggestions,
                      }
                    : m,
            ),
        )
    }, [interpretationObject])

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
            stopInterpretation()
        }
    }, [stopInterpretation])

    useEffect(() => {
        if (!navigator?.geolocation) return
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude
                const lng = pos.coords.longitude
                const resolved = await resolveLocationFromCoords(lat, lng)
                setCurrentLocationFallback({
                    country: resolved?.countryName || undefined,
                    state: resolved?.stateName || undefined,
                    lat,
                    lng,
                    timezone: resolved?.timezone,
                })
            },
            () => {},
            { enableHighAccuracy: true, timeout: 6000 },
        )
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
    const cardsToSelect = useMemo(() => decision?.cardCount ?? 0, [decision])
    const isChatLoading = consulting || isInterpreting

    const effectiveLocale = normalizeLocale(aiLocale ?? locale)
    const cardUi = CARD_UI_TEXT[effectiveLocale]
    // Check if user has enough stars (at least 5) for card draw
    // Returns null while loading, true/false once initialized
    const hasEnoughStars = useMemo(() => {
        if (!starsInitialized) return null // Return null while loading to show loading state
        if (!Number.isFinite(stars as number)) return true
        return (stars as number) >= 5
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

        if (!messagesEndRef.current) return
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }, [messages, consulting, showCardDraw, isInterpreting])

    useEffect(() => {
        const lastAssistant = [...messages]
            .reverse()
            .find((message) => message.role === "assistant" && message.text)
        if (!lastAssistant?.text) return
        const hasThai = /[\u0E00-\u0E7F]/.test(lastAssistant.text)
        const nextLocale = hasThai ? "th" : "en"
        setAiLocale((prev) => (prev === nextLocale ? prev : nextLocale))
    }, [messages])

    useEffect(() => {
        if (!isInterpreting) {
            setLoadingDots(1)
            return
        }
        const interval = window.setInterval(() => {
            setLoadingDots((prev) => (prev >= 3 ? 1 : prev + 1))
        }, 1000)
        return () => window.clearInterval(interval)
    }, [isInterpreting])

    useEffect(() => {
        if (!showCardDraw) {
            setSelectedCount(0)
            setShuffleFn(null)
            setPickFn(null)
        }
    }, [showCardDraw, cardsToSelect])

    // Update showInsufficientStars based on star balance
    useEffect(() => {
        if (hasEnoughStars === true) {
            setShowInsufficientStars(false)
        } else if (
            showCardDraw &&
            cardsToSelect > 0 &&
            hasEnoughStars === false
        ) {
            console.log("not sufficient stars")
            setShowInsufficientStars(true)
        }
    }, [hasEnoughStars, showCardDraw, cardsToSelect])

    useEffect(() => {
        if (decision?.type !== "draw") return
        const hasInterpretationMessage = messages.some(
            (message) => message.variant === "box",
        )
        if (!hasInterpretationMessage) {
            setShowCardDraw(true)
        }
    }, [decision, messages])

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

    const heroText = consulting ? "Consulting..." : tHome("hero.line1")

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

    const getDefaultSystemByLocale = useCallback(() => {
        return getDefaultAstrologySystem(
            locale,
            currentLocationFallback?.country,
        ) as "western_tropical" | "vedic_sidereal"
    }, [locale, currentLocationFallback?.country])

    const isHoroscopeReady = useCallback((data: HoroscopeBirthData | null) => {
        if (!data) return false
        const hasDate = Boolean(data.day && data.month && data.year)
        const hasTime =
            (data.hour != null && data.minute != null) ||
            data.timeHint === "day" ||
            data.timeHint === "night"
        const hasLocation = Boolean(
            data.country &&
                data.lat != null &&
                data.lng != null &&
                data.timezone != null,
        )
        return hasDate && hasTime && hasLocation
    }, [])

    const mergeHoroscopeBirth = useCallback(
        (
            current: HoroscopeBirthData | null,
            incoming: HoroscopeExtractResponse,
        ): HoroscopeBirthData => ({
            day: incoming?.birthDate?.day ?? current?.day ?? null,
            month: incoming?.birthDate?.month ?? current?.month ?? null,
            year: incoming?.birthDate?.year ?? current?.year ?? null,
            hour: incoming?.birthTime?.hour ?? current?.hour ?? null,
            minute: incoming?.birthTime?.minute ?? current?.minute ?? null,
            timeHint:
                incoming?.birthTime?.timeHint ?? current?.timeHint ?? "unknown",
            timezone: incoming?.location?.timezone ?? current?.timezone ?? null,
            lat: incoming?.location?.lat ?? current?.lat ?? null,
            lng: incoming?.location?.lng ?? current?.lng ?? null,
            country: incoming?.location?.country ?? current?.country ?? null,
            state: incoming?.location?.state ?? current?.state ?? null,
            usedLocationFallback:
                incoming?.location?.usedLocationFallback ??
                current?.usedLocationFallback ??
                false,
        }),
        [],
    )

    const pushToolCard = useCallback(
        (
            toolType: "user-date-form" | "transit-date-form",
            birth: HoroscopeBirthData | null,
        ) => {
            setMessages((prev) => [
                ...prev,
                {
                    id: `assistant-tool-${toolType}-${Date.now()}`,
                    role: "assistant",
                    text: "",
                    variant: "tool",
                    toolType,
                    toolBirthPrefill: birth,
                    toolTransitPrefill: horoscopeTransit,
                },
            ])
        },
        [horoscopeTransit],
    )

    const runHoroscopeReading = useCallback(
        async (
            birth: HoroscopeBirthData,
            questionText: string,
            transit?: HoroscopeTransitData | null,
        ) => {
            setIsInterpreting(true)
            const loadingId = `assistant-horoscope-loading-${Date.now()}`
            if (horoscopeAbortRef.current) {
                horoscopeAbortRef.current.abort()
            }
            horoscopeAbortRef.current = new AbortController()
            setMessages((prev) => {
                const withoutForms = prev.filter(
                    (m) =>
                        !(
                            m.variant === "tool" &&
                            (m.toolType === "user-date-form" ||
                                m.toolType === "transit-date-form")
                        ),
                )
                return [
                    ...withoutForms,
                    {
                        id: loadingId,
                        role: "assistant",
                        text: tHoroscope("loading"),
                        variant: "horoscope",
                        isLoading: true,
                        question: questionText,
                        horoscopeBirthData: birth,
                    },
                ]
            })
            try {
                const response = await fetch("/api/horoscope/question", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: horoscopeAbortRef.current?.signal,
                    body: JSON.stringify({
                        question: questionText,
                        locale,
                        system: horoscopeSystem,
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
                    }),
                })

                if (!response.ok || !response.body) {
                    throw new Error("Failed to generate horoscope")
                }

                let chartDataParsed: Record<string, unknown> | null = null
                const chartDataHeader = response.headers.get(
                    "X-AskingFate-Chart-Data",
                )
                if (chartDataHeader) {
                    try {
                        chartDataParsed = JSON.parse(
                            atob(chartDataHeader),
                        ) as Record<string, unknown>
                    } catch {
                        /* ignore */
                    }
                }

                const json = (await response.json()) as {
                    interpretation?: string
                    planetMeanings?: Record<string, string>
                    houseMeanings?: Record<string, string>
                }
                const interpretation =
                    json?.interpretation?.trim() ||
                    tHoroscope("fallbackAnswerError")
                const planetMeanings = json?.planetMeanings ?? null
                const houseMeanings = json?.houseMeanings ?? null

                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === loadingId
                            ? {
                                  ...m,
                                  text: interpretation,
                                  isLoading: false,
                                  chartData: chartDataParsed,
                                  planetMeanings,
                                  houseMeanings,
                              }
                            : m,
                    ),
                )
            } catch (err) {
                const isAbort = err instanceof Error && err.name === "AbortError"
                if (isAbort) {
                    setMessages((prev) => {
                        const withoutLoading = prev.filter(
                            (m) => m.id !== loadingId,
                        )
                        return [
                            ...withoutLoading,
                            {
                                id: `assistant-tool-user-date-form-${Date.now()}`,
                                role: "assistant",
                                text: "",
                                variant: "tool",
                                toolType: "user-date-form",
                                toolBirthPrefill: birth,
                                toolTransitPrefill: horoscopeTransit,
                                toolFromCancel: true,
                            },
                        ]
                    })
                } else {
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
                }
            } finally {
                horoscopeAbortRef.current = null
                setIsInterpreting(false)
                setHoroscopeBirth(null)
                setHoroscopeQuestion(null)
                setHoroscopeTransit(null)
            }
        },
        [horoscopeSystem, locale, tHoroscope, horoscopeTransit],
    )

    const refetchHoroscopeWithSystem = useCallback(
        async (messageId: string, newSystem: "western_tropical" | "vedic_sidereal") => {
            const msg = messages.find((m) => m.id === messageId)
            if (!msg || msg.variant !== "horoscope" || !msg.chartData) return
            const birth = chartDataToBirth(msg.chartData as Record<string, unknown>)
            if (!birth) return
            const transit = chartDataToTransit(msg.chartData as Record<string, unknown>)
            const questionText = msg.question || "General horoscope reading"
            setIsInterpreting(true)
            try {
                const response = await fetch("/api/horoscope/question", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
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
                    }),
                })
                if (!response.ok) throw new Error("Refetch failed")
                const chartDataHeader = response.headers.get("X-AskingFate-Chart-Data")
                let chartDataParsed: Record<string, unknown> | null = null
                if (chartDataHeader) {
                    try {
                        chartDataParsed = JSON.parse(atob(chartDataHeader)) as Record<string, unknown>
                    } catch {
                        /* ignore */
                    }
                }
                const json = (await response.json()) as {
                    interpretation?: string
                    planetMeanings?: Record<string, string>
                    houseMeanings?: Record<string, string>
                }
                const interpretation = json?.interpretation?.trim() || tHoroscope("fallbackAnswerError")
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? {
                                  ...m,
                                  text: interpretation,
                                  chartData: chartDataParsed ?? m.chartData,
                                  planetMeanings: json?.planetMeanings ?? null,
                                  houseMeanings: json?.houseMeanings ?? null,
                              }
                            : m,
                    ),
                )
            } catch {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? { ...m, text: tHoroscope("analysisFailed") }
                            : m,
                    ),
                )
            } finally {
                setIsInterpreting(false)
            }
        },
        [locale, messages, tHoroscope],
    )

    const handleHoroscopeInput = useCallback(
        async (
            value: string,
            options: { appendUserMessage?: boolean } = {},
        ) => {
            const trimmed = value.trim()
            if (!trimmed) return
            setConsulting(true)
            try {
                const appendUserMessage = options.appendUserMessage !== false
                if (appendUserMessage) {
                    setMessages((prev) => [
                        ...prev,
                        {
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
                        currentLocation: currentLocationFallback ?? undefined,
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
                const nextBirth = mergeHoroscopeBirth(horoscopeBirth, extracted)
                setHoroscopeBirth(nextBirth)

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
                            nextBirth?.country ?? currentLocationFallback?.country,
                        ) as "western_tropical" | "vedic_sidereal",
                    )
                }

                const readyFromApi = Boolean(
                    extracted?.readiness?.readyForCalculation,
                )
                const savedBirth = loadBirthFromStorage()
                const birthToUse =
                    savedBirth && isHoroscopeReady(savedBirth)
                        ? savedBirth
                        : nextBirth
                const ready =
                    readyFromApi ||
                    isHoroscopeReady(nextBirth) ||
                    isHoroscopeReady(birthToUse)
                const transitMentioned = Boolean(extracted?.transit?.mentioned)
                const hasTransitFromExtract =
                    transitMentioned &&
                    extracted?.transit?.day != null &&
                    extracted?.transit?.month != null &&
                    extracted?.transit?.year != null
                const transitToUse: HoroscopeTransitData | null = hasTransitFromExtract
                    ? {
                          day: extracted!.transit!.day!,
                          month: extracted!.transit!.month!,
                          year: extracted!.transit!.year!,
                          hour: null,
                          minute: null,
                          timezone: nextBirth.timezone,
                          lat: nextBirth.lat,
                          lng: nextBirth.lng,
                          country: nextBirth.country,
                          state: nextBirth.state,
                      }
                    : horoscopeTransit
                if (hasTransitFromExtract) {
                    setHoroscopeTransit(transitToUse)
                }
                if (!ready) {
                    pushToolCard("user-date-form", birthToUse)
                    return
                }

                const questionText =
                    horoscopeQuestion ||
                    lastQuestion ||
                    "General horoscope reading"
                const needsTransitForm =
                    transitMentioned &&
                    !hasTransitFromExtract &&
                    !horoscopeTransit
                if (needsTransitForm) {
                    pushToolCard("transit-date-form", birthToUse)
                    return
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
                await runHoroscopeReading(
                    birthToUse,
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
            currentLocationFallback,
            horoscopeBirth,
            horoscopeQuestion,
            isHoroscopeReady,
            lastQuestion,
            locale,
            mergeHoroscopeBirth,
            pushToolCard,
            runHoroscopeReading,
            tHoroscope,
            horoscopeTransit,
        ],
    )

    const handleUserDateFormSubmit = useCallback(
        async (value: HoroscopeBirthData) => {
            setHoroscopeBirth(value)
            const questionText =
                horoscopeQuestion || lastQuestion || "General horoscope reading"
            if (!isHoroscopeReady(value)) {
                pushToolCard("user-date-form", value)
                return
            }
            if (horoscopeTransit) {
                pushToolCard("transit-date-form", value)
                return
            }
            await runHoroscopeReading(value, questionText, horoscopeTransit)
        },
        [
            horoscopeQuestion,
            lastQuestion,
            isHoroscopeReady,
            pushToolCard,
            runHoroscopeReading,
            horoscopeTransit,
        ],
    )

    const handleTransitFormSubmit = useCallback(
        async (value: HoroscopeTransitData) => {
            setHoroscopeTransit(value)
            const birth = horoscopeBirth
            if (!birth || !isHoroscopeReady(birth)) {
                pushToolCard("user-date-form", birth)
                return
            }
            const questionText =
                horoscopeQuestion || lastQuestion || "General horoscope reading"
            await runHoroscopeReading(birth, questionText, value)
        },
        [
            horoscopeBirth,
            horoscopeQuestion,
            isHoroscopeReady,
            lastQuestion,
            pushToolCard,
            runHoroscopeReading,
        ],
    )

    const extractAssistantTextFromStream = useCallback((raw: string): string => {
        const match = raw.match(
            /"assistantText"\s*:\s*"((?:[^"\\]|\\.)*)"?/,
        )
        if (!match) return ""
        const s = match[1]
        return s
            .replace(/\\\\/g, "\\")
            .replace(/\\n/g, "\n")
            .replace(/\\"/g, '"')
    }, [])

    const fetchDecision = useCallback(
        async (
            value: string,
            historyOverride?: { role: string; text: string }[],
            onChunk?: (partialAssistantText: string) => void,
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
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: value,
                    history,
                }),
                signal: abortControllerRef.current.signal,
            })

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
                    if (onChunk) {
                        const partial = extractAssistantTextFromStream(buffer)
                        if (partial) onChunk(partial)
                    }
                }
                buffer += decoder.decode()
            } finally {
                reader.releaseLock()
            }

            const parsed = parseDecision(buffer)
            if (!parsed) throw new Error("Invalid decision payload")
            return parsed
        },
        [messages, parseDecision, extractAssistantTextFromStream],
    )

    const handleStopConsulting = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        setConsulting(false)
        setIsInterpreting(false)
    }, [])

    const handleCancelHoroscopeLoading = useCallback(() => {
        if (horoscopeAbortRef.current) {
            horoscopeAbortRef.current.abort()
        }
    }, [])

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
        setShuffleFn(null)
        setPickFn(null)
        setShowInsufficientStars(false)
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

            setEditingMessageId(null)
            setEditingDraft("")
            setQuestion("")
            setConsulting(true)
            setLastQuestion(trimmed)
            setShowPrompt(false)
            setShowLearnMore(false)
            resetInteractiveStateForRewrite()

            const assistantLoadingId = `assistant-${Date.now()}`
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

            try {
                const history = baseMessages.slice(0, -1).map((m) => ({
                    role: m.role,
                    text: m.text,
                }))
                const nextDecision = await fetchDecision(
                    trimmed,
                    history,
                    (partial) => {
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantLoadingId
                                    ? { ...m, text: partial }
                                    : m,
                            ),
                        )
                    },
                )
                setDecision(nextDecision)
                setConsulting(false)

                const savedBirth = loadBirthFromStorage()
                const hasSavedBirthReady =
                    savedBirth && isHoroscopeReady(savedBirth)
                const assistantMessage =
                    nextDecision.type === "horoscope" && hasSavedBirthReady
                        ? tHoroscope("usingSavedBirthDate")
                        : nextDecision.assistantText

                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantLoadingId
                            ? {
                                  ...m,
                                  text: assistantMessage || m.text,
                                  isLoading: false,
                              }
                            : m,
                    ),
                )

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
                    setMessages((prev) =>
                        prev.filter((m) => m.id !== assistantLoadingId),
                    )
                    return
                }

                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantLoadingId
                            ? {
                                  ...m,
                                  text: "Sorry, something went wrong. Please try again.",
                                  isLoading: false,
                              }
                            : m,
                    ),
                )
            }
        },
        [
            consulting,
            fetchDecision,
            getDefaultSystemByLocale,
            handleHoroscopeInput,
            isHoroscopeReady,
            isInterpreting,
            tHoroscope,
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
        setEditingDraft(target.text)
    }

    const handleCancelEdit = () => {
        setEditingMessageId(null)
        setEditingDraft("")
    }

    const handleSendEditAt = (messageIndex: number) => {
        if (consulting || isInterpreting) return
        const target = messages[messageIndex]
        if (!target || target.role !== "user") return
        const trimmed = (editingDraft ?? "").trim()
        if (!trimmed) return

        const baseMessages = messages
            .slice(0, messageIndex + 1)
            .map((m, idx) =>
                idx === messageIndex ? { ...m, text: trimmed } : m,
            )
        void runDecisionFlowFromMessages({
            baseMessages,
            questionText: trimmed,
        })
    }

    const applySuggestedQuestion = (value: string) => {
        setQuestion(value)
        focusInput()
    }

    const toggleReaction = (id: string, next: "like" | "dislike") => {
        setAssistantReactions((prev) => ({
            ...prev,
            [id]: prev[id] === next ? null : next,
        }))
    }

    const handleShare = async (id: string, text: string) => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: "AskingFate",
                    text,
                })
                setNotice(id, "Shared.")
                return
            }
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text)
                setNotice(id, "Copied.")
                return
            }
            setNotice(id, "Copy not supported.")
        } catch {
            setNotice(id, "Share canceled.")
        }
    }

    const handleReport = (id: string, text: string) => {
        const subject = encodeURIComponent("Report AI response")
        const body = encodeURIComponent(
            `Message:\n${text}\n\nPlease describe the issue:`,
        )
        window.location.href = `mailto:admin@askingfate.com?subject=${subject}&body=${body}`
        setNotice(id, "Report draft opened.")
    }

    const startDecisionFlow = useCallback(
        async (
            value: string,
            options: { appendUserMessage?: boolean } = {},
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

            if (shouldAppendUserMessage) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `user-${Date.now()}`,
                        role: "user",
                        text: trimmed,
                    },
                ])
            }

            setMessages((prev) => [
                ...prev,
                {
                    id: assistantLoadingId,
                    role: "assistant",
                    text: "",
                    variant: "plain",
                    isLoading: true,
                },
            ])

            try {
                const history =
                    shouldAppendUserMessage || messages.length === 0
                        ? undefined
                        : messages.slice(0, -1).map((m) => ({
                              role: m.role,
                              text: m.text,
                          }))
                const nextDecision = await fetchDecision(
                    trimmed,
                    history,
                    (partial) => {
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantLoadingId
                                    ? { ...m, text: partial }
                                    : m,
                            ),
                        )
                    },
                )
                setDecision(nextDecision)
                setConsulting(false)

                const savedBirth = loadBirthFromStorage()
                const hasSavedBirthReady =
                    savedBirth && isHoroscopeReady(savedBirth)
                const assistantMessage =
                    nextDecision.type === "horoscope" && hasSavedBirthReady
                        ? tHoroscope("usingSavedBirthDate")
                        : nextDecision.assistantText

                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantLoadingId
                            ? {
                                  ...m,
                                  text: assistantMessage || m.text,
                                  isLoading: false,
                              }
                            : m,
                    ),
                )

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
                    setMessages((prev) =>
                        prev.filter((m) => m.id !== assistantLoadingId),
                    )
                    return
                }

                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantLoadingId
                            ? {
                                  ...m,
                                  text: "Sorry, something went wrong. Please try again.",
                                  isLoading: false,
                              }
                            : m,
                    ),
                )
            }
        },
        [
            fetchDecision,
            getDefaultSystemByLocale,
            handleHoroscopeInput,
            isHoroscopeReady,
            messages,
            tHoroscope,
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
        if (horoscopeQuestion || horoscopeBirth) {
            await handleHoroscopeInput(value)
            setQuestion("")
            return
        }
        await startDecisionFlow(value)
    }

    const handleCardsSelected = async (
        cards: { name: string; isReversed: boolean }[],
    ) => {
        if (!lastQuestion) return

        // Deduct 5 stars before proceeding to interpretation
        const starSuccess = spendStars(5)
        if (!starSuccess) {
            // Not enough stars - this shouldn't happen if UI is correct
            // but handle gracefully
            return
        }

        setShowCardDraw(false)
        setIsInterpreting(true)

        const drawnCards: TarotCard[] = cards.map((card, index) => ({
            id: index + 1,
            name: card.name,
            image: `assets/rider-waite-tarot/${card.name
                .toLowerCase()
                .replace(/\s+/g, "-")}.png`,
            meaning: card.isReversed ? `${card.name} (Reversed)` : card.name,
            isReversed: card.isReversed,
        }))

        const loadingId = `assistant-interpretation-loading-${Date.now()}`
        setMessages((prev) => [
            ...prev,
            {
                id: loadingId,
                role: "assistant",
                text: "",
                variant: "box",
                cards: drawnCards,
                insights: [],
                isLoading: true,
                question: lastQuestion,
                spreadType: decision?.spreadType ?? null,
            },
        ])

        const cardNames = cards.map((card) =>
            card.isReversed ? `${card.name} (Reversed)` : card.name,
        )

        const prompt = getTarotReadingPrompt({
            question: lastQuestion,
            cards: cardNames.join(", "),
            readingType: decision?.spreadType ?? null,
            isFollowUp: false,
        })

        interpretationLoadingIdRef.current = loadingId
        submitInterpretation({
            prompt,
            question: lastQuestion,
            cards: cardNames,
        })
    }

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
        hasEnoughStars === true
    const showDrawTrigger =
        showCardDraw && cardsToSelect > 0 && hasEnoughStars !== null

    const handleScrollToDraw = () => {
        const target = showInsufficientStars
            ? insufficientStarsRef.current
            : cardDrawTargetRef.current
        target?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    const handlePickAll = (cardsToSelect: number) => {
        if (pickFn) {
            pickFn(cardsToSelect)
        }
    }

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
            onProvideShuffle={(fn) => setShuffleFn(() => fn)}
            onProvideRandomPick={(fn) => setPickFn(() => fn)}
            onProvideSelectByIndices={(fn) => setSelectByIndicesFn(() => fn)}
        />
    ) : null

    const inputSection = (
        <>
            {showDrawTrigger && (
                <DrawTrigger
                    showInsufficientStars={showInsufficientStars}
                    cardsToSelect={cardsToSelect}
                    cardUi={cardUi}
                    onScrollToDraw={handleScrollToDraw}
                    onPickAll={() => handlePickAll(cardsToSelect)}
                />
            )}

            <QuestionInput
                id='home-question-input'
                value={question}
                onChange={setQuestion}
                onSubmit={handleSubmit}
                onStop={handleStopConsulting}
                isLoading={isChatLoading}
                centered
                placeholder={
                    canShowCardDrawSection
                        ? cardUi.pickAllPlaceholder
                        : undefined
                }
                className={`transition-[max-width] duration-500 ease-in-out ${
                    isInputFixed ? "max-w-3xl" : "max-w-sm md:max-w-md"
                }`}
            />
            {!hasAssistantResponse && (
                <p
                    className={`text-[11px] leading-relaxed text-white/50 text-center transition-all duration-500 text-left ${
                        hasMessages
                            ? "opacity-0 h-0 overflow-hidden"
                            : "opacity-100"
                    }`}
                >
                    {disclaimerText}
                </p>
            )}
        </>
    )

    return (
        <div className='w-full h-full min-h-[calc(100dvh-65px)] flex flex-col overflow-hidden relative'>
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
                loadingDots={loadingDots}
                positionMeanings={POSITION_MEANINGS}
                hasInterpretation={hasInterpretation}
                assistantReactions={assistantReactions}
                messageNotices={messageNotices}
                horoscopeBirth={horoscopeBirth}
                currentLocationFallback={currentLocationFallback}
                isCheckingStars={isCheckingStars}
                checkingStarsText={tHome("checkingStars")}
                showInsufficientStars={showInsufficientStars}
                cardDrawSection={cardDrawSection}
                hasAssistantResponse={hasAssistantResponse}
                disclaimerText={disclaimerText}
                birthFormTitle={tHoroscope("birthFormTitle")}
                birthFormSubmit={tHoroscope("birthFormSubmit")}
                transitFormTitle={tHoroscope("transitFormTitle")}
                transitFormSubmit={tHoroscope("transitFormSubmit")}
                onRegenerateAt={handleRegenerateAt}
                onStartEditAt={handleStartEditAt}
                onCancelEdit={handleCancelEdit}
                onSendEditAt={handleSendEditAt}
                onApplySuggestedQuestion={applySuggestedQuestion}
                onTransitFormSubmit={handleTransitFormSubmit}
                onUserDateFormSubmit={handleUserDateFormSubmit}
                onCancelHoroscopeLoading={handleCancelHoroscopeLoading}
                onRefetchHoroscopeWithSystem={refetchHoroscopeWithSystem}
                onToggleReaction={toggleReaction}
                onReport={handleReport}
                onShare={handleShare}
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

                    {!isInputFixed && inputSection}
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
                <div className='fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#07060f]/80 backdrop-blur'>
                    <div className='mx-auto w-full max-w-3xl px-4 py-4'>
                        {inputSection}
                    </div>
                </div>
            )}
        </div>
    )
}
