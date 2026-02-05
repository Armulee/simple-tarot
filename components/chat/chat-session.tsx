"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useStars } from "@/contexts/stars-context"
import Footer from "../footer/footer"
import { TypewriterText } from "../typewriter-text"
import QuestionInput from "../question-input"
import { LinearCardSpread } from "@/components/tarot/card-selection/linear-card-spread"
import { CardImage } from "@/components/card-image"
import type { TarotCard } from "@/contexts/tarot-context"
import { Badge } from "@/components/ui/badge"
import ActionSection from "@/components/tarot/interpretation/action"
import ShareSection from "@/components/tarot/interpretation/share"
import InsufficientStarsBlock from "@/components/stars/insufficient-stars-block"
import {
    Flag,
    Loader2,
    Pencil,
    RotateCw,
    Send,
    Share2,
    Sparkles,
    Star,
    ThumbsDown,
    ThumbsUp,
    X,
} from "lucide-react"
import { getTarotReadingPrompt } from "@/lib/prompts"
import AutoHeightTextarea from "@/components/ui/auto-height-textarea"

type ChatMessage = {
    id: string
    role: "user" | "assistant"
    text: string
    variant?: "plain" | "box"
    cards?: TarotCard[]
    insights?: string[]
    isLoading?: boolean
    question?: string
    spreadType?: ChatDecision["spreadType"] | null
    followUpConclusion?: string
    followUpSuggestions?: string[]
    followUpLoading?: boolean
}

export type ChatDecision = {
    type: "chat" | "draw"
    spreadType: string
    cardCount: number
    assistantText: string
}

type ChatSessionMode = "home" | "session"

type ChatSessionPayload = {
    id: string
    question: string
    messages: ChatMessage[]
    decision: ChatDecision | null
    owner_user_id?: string | null
    showInsufficientStars?: boolean
    showCardDraw?: boolean
}

export default function ChatSession({
    mode,
    initialSession,
}: {
    mode: ChatSessionMode
    initialSession?: ChatSessionPayload | null
}) {
    const tHome = useTranslations("Home")
    const tReadingTypes = useTranslations("Reading.types")

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
    const router = useRouter()
    const { user } = useAuth()
    const { stars, spendStars, initialized: starsInitialized, isInfinity } = useStars()
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
        Array.isArray(initialSession?.messages) ? initialSession.messages : []
    )
    const [decision, setDecision] = useState<ChatDecision | null>(
        initialSession?.decision ?? null
    )
    const [isInterpreting, setIsInterpreting] = useState(false)
    const [lastQuestion, setLastQuestion] = useState(
        initialSession?.question ?? ""
    )
    const [loadingDots, setLoadingDots] = useState(1)
    const [selectedCount, setSelectedCount] = useState(0)
    const [shuffleFn, setShuffleFn] = useState<(() => void) | null>(null)
    const [pickFn, setPickFn] = useState<(() => void) | null>(null)
    const [selectByIndicesFn, setSelectByIndicesFn] = useState<
        ((indices: number[]) => void) | null
    >(null)
    const [assistantReactions, setAssistantReactions] = useState<
        Record<string, "like" | "dislike" | null>
    >({})
    const [messageNotices, setMessageNotices] = useState<Record<string, string>>(
        {}
    )
    const [sessionId, setSessionId] = useState<string | null>(
        initialSession?.id ?? null
    )
    const abortControllerRef = useRef<AbortController | null>(null)
    const [showInsufficientStars, setShowInsufficientStars] = useState<boolean>(
        initialSession?.showInsufficientStars ?? false
    )
    const [showCardDraw, setShowCardDraw] = useState(
        initialSession?.showCardDraw ?? false
    )
    const [isLinking, setIsLinking] = useState(false)
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
    const [editingDraft, setEditingDraft] = useState("")
    const messagesEndRef = useRef<HTMLDivElement | null>(null)
    const lastAssistantMessageRef = useRef<HTMLDivElement | null>(null)
    const prevMessagesLengthRef = useRef(0)
    const prevConsultingRef = useRef(false)
    const prevIsInterpretingRef = useRef(false)
    const hasBootstrapped = useRef(false)
    const persistTimeoutRef = useRef<number | null>(null)

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
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
        [sessionId]
    )

    const hasAssistantResponse = messages.some(
        (message) => message.role === "assistant"
    )
    const cardsToSelect = useMemo(() => decision?.cardCount ?? 0, [decision])
    const isChatLoading = consulting || isInterpreting

    const normalizeLocale = (value: string | null | undefined): "en" | "th" =>
        value && value.startsWith("th") ? "th" : "en"

    const CARD_UI_TEXT = useMemo(
        () => ({
            en: {
                selected: (selectedCount: number, cardsToSelect: number) =>
                    `You have selected ${selectedCount}/${cardsToSelect} cards`,
                consumeStar: "Drawing cards will consume 5 stars",
                shuffle: "Shuffle",
                pick: "Pick me",
                swipe: "Swipe up on a card to select",
            },
            th: {
                selected: (selectedCount: number, cardsToSelect: number) =>
                    `คุณเลือกไพ่แล้ว ${selectedCount}/${cardsToSelect} ใบ`,
                consumeStar: "การจั่วไพ่จะใช้ดวงดาว 5 ดวง",
                shuffle: "สับไพ่",
                pick: "เลือกให้หน่อย",
                swipe: "ปัดขึ้นบนไพ่เพื่อเลือก",
            },
        }),
        []
    )

    const effectiveLocale = normalizeLocale(aiLocale ?? locale)
    const cardUi = CARD_UI_TEXT[effectiveLocale]
    // Check if user has enough stars (at least 5) for card draw
    // Returns null while loading, true/false once initialized
    const hasEnoughStars = useMemo(() => {
        if (isInfinity) return true
        if (!starsInitialized) return null // Return null while loading to show loading state
        if (!Number.isFinite(stars as number)) return true
        return (stars as number) >= 5
    }, [stars, starsInitialized, isInfinity])
    
    // Track if we need to show star checking state
    const isCheckingStars = showCardDraw && cardsToSelect > 0 && hasEnoughStars === null
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
        } else if (showCardDraw && cardsToSelect > 0 && hasEnoughStars === false) {
            console.log('not sufficient stars')
            setShowInsufficientStars(true)
        }
    }, [hasEnoughStars, showCardDraw, cardsToSelect])

    useEffect(() => {
        if (mode !== "session") return
        if (decision?.type !== "draw") return
        const hasInterpretationMessage = messages.some(
            (message) => message.variant === "box"
        )
        if (!hasInterpretationMessage) {
            setShowCardDraw(true)
        }
    }, [mode, decision, messages])

    useEffect(() => {
        if (mode !== "session" || !sessionId) return
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
    }, [mode, sessionId, lastQuestion, messages, decision, persistSession, showInsufficientStars, showCardDraw])

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

    const fetchDecision = useCallback(async (
        value: string,
        historyOverride?: { role: string; text: string }[]
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
            }
            buffer += decoder.decode()
        } finally {
            reader.releaseLock()
        }

        const parsed = parseDecision(buffer)
        if (!parsed) throw new Error("Invalid decision payload")
        return parsed
    }, [messages, parseDecision])

    const handleStopConsulting = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        setConsulting(false)
        setIsInterpreting(false)
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

            setMessages(baseMessages)

        try {
            const history = baseMessages.slice(0, -1).map((m) => ({
                role: m.role,
                text: m.text,
            }))
            const nextDecision = await fetchDecision(trimmed, history)
            setDecision(nextDecision)
            setConsulting(false)

            if (nextDecision.assistantText) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `assistant-${Date.now()}`,
                        role: "assistant",
                        text: nextDecision.assistantText,
                        variant: "plain",
                    },
                ])
            }

            if (nextDecision.type === "draw") {
                setShowCardDraw(true)
            }
        } catch (err) {
            setConsulting(false)
            if (err instanceof Error && err.name === "AbortError") return

            setMessages((prev) => [
                ...prev,
                {
                    id: `assistant-error-${Date.now()}`,
                    role: "assistant",
                    text: "Sorry, something went wrong. Please try again.",
                    variant: "plain",
                },
            ])
        }
    },
    [consulting, fetchDecision, isInterpreting]
)

    const handleRegenerateAt = (messageIndex: number) => {
        if (mode === "home") return
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
        if (mode === "home") return
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
        if (mode === "home") return
        if (consulting || isInterpreting) return
        const target = messages[messageIndex]
        if (!target || target.role !== "user") return
        const trimmed = (editingDraft ?? "").trim()
        if (!trimmed) return

        const baseMessages = messages.slice(0, messageIndex + 1).map((m, idx) =>
            idx === messageIndex ? { ...m, text: trimmed } : m
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
            `Message:\n${text}\n\nPlease describe the issue:`
        )
        window.location.href = `mailto:admin@askingfate.com?subject=${subject}&body=${body}`
        setNotice(id, "Report draft opened.")
    }

    const createSessionAndRedirect = async (value: string) => {
        const trimmed = value.trim()
        if (!trimmed || isLinking) return
        setQuestion("")
        setIsLinking(true)
        setLastQuestion(trimmed)
        setMessages([
            {
                id: `user-${Date.now()}`,
                role: "user",
                text: trimmed,
            },
        ])
        try {
            const response = await fetch("/api/chat-sessions/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: trimmed,
                    user_id: user?.id || initialSession?.owner_user_id || null,
                    messages: [
                        {
                            id: `user-${Date.now()}`,
                            role: "user",
                            text: trimmed,
                        },
                    ],
                }),
            })
            const payload = await response.json()
            if (!response.ok || !payload?.id) {
                throw new Error("Failed to create session")
            }
            setSessionId(payload.id)
            // Warm the session route so navigation doesn't flash global loaders.
            try {
                router.prefetch(`/${locale}/${payload.id}`)
            } catch {}
            window.setTimeout(() => {
                router.push(`/${locale}/${payload.id}`)
            }, 250)
        } catch {
            setIsLinking(false)
            setMessages((prev) => [
                ...prev,
                {
                    id: `assistant-error-${Date.now()}`,
                    role: "assistant",
                    text: "Sorry, something went wrong. Please try again.",
                    variant: "plain",
                },
            ])
        }
    }

    const startDecisionFlow = useCallback(async (
        value: string,
        options: { appendUserMessage?: boolean } = {}
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

        try {
            const history =
                shouldAppendUserMessage || messages.length === 0
                    ? undefined
                    : messages.slice(0, -1).map((m) => ({
                          role: m.role,
                          text: m.text,
                      }))
            const nextDecision = await fetchDecision(trimmed, history)
            setDecision(nextDecision)
            setConsulting(false)

            if (nextDecision.assistantText) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `assistant-${Date.now()}`,
                        role: "assistant",
                        text: nextDecision.assistantText,
                        variant: "plain",
                    },
                ])
            }

            if (nextDecision.type === "draw") {
                setShowCardDraw(true)
            }
        } catch (err) {
            setConsulting(false)
            if (err instanceof Error && err.name === "AbortError") return

            setMessages((prev) => [
                ...prev,
                {
                    id: `assistant-error-${Date.now()}`,
                    role: "assistant",
                    text: "Sorry, something went wrong. Please try again.",
                    variant: "plain",
                },
            ])
        }
    }, [fetchDecision, messages])

    useEffect(() => {
        if (mode !== "session") return
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
    }, [mode, sessionId, decision, messages, startDecisionFlow])

    const handleSubmit = async (value: string) => {
        if (
            mode !== "home" &&
            showCardDraw &&
            cardsToSelect > 0 &&
            hasEnoughStars === true
        ) {
            const matches = value.match(/\d+/g) ?? []
            const indices = matches
                .map((match) => Number(match))
                .filter((num) => Number.isFinite(num) && num > 0)
            if (indices.length > 0 && selectByIndicesFn) {
                selectByIndicesFn(indices)
                setQuestion("")
                return
            }
        }
        if (mode === "home") {
            await createSessionAndRedirect(value)
            return
        }
        await startDecisionFlow(value)
    }

    const handleCardsSelected = async (
        cards: { name: string; isReversed: boolean }[]
    ) => {
        if (!lastQuestion) return
        
        // Deduct 5 stars before proceeding to interpretation
        if (!isInfinity) {
            const starSuccess = spendStars(5)
            if (!starSuccess) {
                // Not enough stars - this shouldn't happen if UI is correct
                // but handle gracefully
                return
            }
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
            card.isReversed ? `${card.name} (Reversed)` : card.name
        )

        const prompt = getTarotReadingPrompt({
            question: lastQuestion,
            cards: cardNames.join(", "),
            readingType: decision?.spreadType ?? null,
            isFollowUp: false,
        })

        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        try {
            const response = await fetch("/api/interpret-cards/question", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
                signal: abortControllerRef.current.signal,
            })

            if (!response.ok || !response.body) {
                throw new Error("Failed to interpret")
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

            let interpretationText = buffer
            let parsedInsights: string[] = []
            let followUpConclusion: string | undefined
            let followUpSuggestions: string[] | undefined

            try {
                const parsed = JSON.parse(buffer)
                interpretationText = parsed.interpretation || buffer
                if (Array.isArray(parsed.cardInsights)) {
                    parsedInsights = parsed.cardInsights
                }
                if (typeof parsed.conclusion === "string") {
                    followUpConclusion = parsed.conclusion.trim()
                }
                if (Array.isArray(parsed.suggestions)) {
                    followUpSuggestions = parsed.suggestions
                        .map((s: unknown) => (typeof s === "string" ? s.trim() : ""))
                        .filter(Boolean)
                        .slice(0, 5)
                }
            } catch {}

            setMessages((prev) =>
                prev.map((message) =>
                    message.id === loadingId
                        ? {
                              ...message,
                              text: interpretationText,
                              insights: parsedInsights,
                              isLoading: false,
                              followUpConclusion,
                              followUpSuggestions,
                              followUpLoading: false,
                          }
                        : message
                )
            )
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") {
                setMessages((prev) => prev.filter((m) => m.id !== loadingId))
                return
            }
            setMessages((prev) =>
                prev.map((message) =>
                    message.id === loadingId
                        ? {
                              ...message,
                              text: "Sorry, I couldn't interpret those cards. Please try again.",
                              isLoading: false,
                          }
                        : message
                )
            )
        } finally {
            setIsInterpreting(false)
        }
    }

    const hasMessages = messages.length > 0
    const hasInterpretation = messages.some(
        (message) => message.variant === "box" && !message.isLoading
    )
    const shouldShowHero = !hasMessages
    const shouldShowPrompts =
        showPrompt && !hasMessages && !consulting && prompts.length > 0
    const shouldShowLearnMore =
        showLearnMore && !hasMessages && !consulting

    const disclaimerText = tHome("disclaimer")
    const isInputFixed = mode === "session"

    const inputSection = (
        <>
            {/* Only show card spread when user has enough stars (explicitly true, not null/loading) */}
            {showCardDraw && cardsToSelect > 0 && !showInsufficientStars && hasEnoughStars === true && (
                <>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2 text-center'>
                        <div className='space-y-1'>
                            {shortQuestion && (
                                <p className='text-xs text-white/60'>
                                    {shortQuestion}
                                </p>
                            )}
                            <p className='text-sm text-white'>
                                {cardUi.selected(selectedCount, cardsToSelect)}
                            </p>
                            <p className='text-xs text-yellow-300 flex items-center justify-center gap-1'>
                                <Star
                                    className='w-3.5 h-3.5'
                                    fill='currentColor'
                                />
                                {cardUi.consumeStar}
                            </p>
                        </div>
                        <div className='flex items-center gap-2 justify-center'>
                            <button
                                type='button'
                                onClick={() => shuffleFn?.()}
                                className='flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40'
                                disabled={!shuffleFn}
                            >
                                <RotateCw className='w-3.5 h-3.5' />
                                {cardUi.shuffle}
                            </button>
                            <button
                                type='button'
                                onClick={() => pickFn?.()}
                                className='flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40'
                                disabled={!pickFn}
                            >
                                <Sparkles className='w-3.5 h-3.5' />
                                {cardUi.pick}
                            </button>
                        </div>
                    </div>
                    <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                        <LinearCardSpread
                            cardsToSelect={cardsToSelect}
                            onCardsSelected={handleCardsSelected}
                            onPartialSelect={(_, __, count) =>
                                setSelectedCount(count)
                            }
                            onProvideShuffle={(fn) =>
                                setShuffleFn(() => fn)
                            }
                            onProvideRandomPick={(fn) =>
                                setPickFn(() => fn)
                            }
                            onProvideSelectByIndices={(fn) =>
                                setSelectByIndicesFn(() => fn)
                            }
                            swipeLabel={cardUi.swipe}
                        />
                    </div>
                </>
            )}

            <QuestionInput
                id='home-question-input'
                value={question}
                onChange={setQuestion}
                onSubmit={handleSubmit}
                onStop={handleStopConsulting}
                isLoading={isChatLoading}
                centered
                className={`transition-[max-width] duration-500 ease-in-out ${
                    isInputFixed || isLinking
                        ? "max-w-3xl"
                        : "max-w-sm md:max-w-md"
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

            {hasMessages && (
                <div
                    className={`flex-1 overflow-y-auto px-4 pt-6`}
                >
                    <div className='mx-auto max-w-3xl space-y-6 text-left'>
                        {messages.map((message, messageIndex) => {
                            if (message.role === "user") {
                                const isEditing =
                                    editingMessageId === message.id &&
                                    mode === "session"

                                return (
                                    <div
                                        key={message.id}
                                        className='flex flex-col items-end gap-2'
                                    >
                                        <div className='max-w-[80%] rounded-2xl bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl border border-border/60 px-4 py-3 text-white shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)]'>
                                            {isEditing ? (
                                                <div className='relative'>
                                                    <AutoHeightTextarea
                                                        value={editingDraft}
                                                        onChange={(e) =>
                                                            setEditingDraft(
                                                                e.target.value
                                                            )
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (e.key !== "Enter")
                                                                return
                                                            if (
                                                                e.metaKey ||
                                                                e.ctrlKey ||
                                                                e.shiftKey
                                                            ) {
                                                                return
                                                            }
                                                            e.preventDefault()
                                                            handleSendEditAt(
                                                                messageIndex
                                                            )
                                                        }}
                                                        className='w-full bg-transparent text-white placeholder:text-white/60 outline-none border border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/30 rounded-xl px-3 py-2 pr-12'
                                                        placeholder='Edit your message...'
                                                        disabled={isChatLoading}
                                                    />
                                                    <div className='mt-2 flex items-center justify-end gap-2'>
                                                        <button
                                                            type='button'
                                                            className='inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/70 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40'
                                                            onClick={
                                                                handleCancelEdit
                                                            }
                                                            disabled={
                                                                isChatLoading
                                                            }
                                                        >
                                                            <X className='h-3 w-3' />
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type='button'
                                                            className='inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/70 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40'
                                                            onClick={() => {
                                                                handleSendEditAt(
                                                                    messageIndex
                                                                )
                                                            }}
                                                            disabled={
                                                                isChatLoading ||
                                                                !editingDraft.trim()
                                                            }
                                                        >
                                                            <Send className='h-3 w-3' />
                                                            Send
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                message.text
                                            )}
                                        </div>
                                        <div className='flex items-center gap-2 text-[11px] text-white/60'>
                                            <button
                                                type='button'
                                                className='flex items-center justify-center h-6 w-6 rounded-full hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40'
                                                onClick={() =>
                                                    handleRegenerateAt(
                                                        messageIndex
                                                    )
                                                }
                                                disabled={
                                                    consulting ||
                                                    isInterpreting ||
                                                    mode === "home" ||
                                                    isEditing
                                                }
                                                aria-label='Regenerate'
                                                title='Regenerate'
                                            >
                                                <RotateCw className='w-3 h-3' />
                                            </button>
                                            <button
                                                type='button'
                                                className='flex items-center justify-center h-6 w-6 rounded-full hover:text-white hover:bg-white/10 transition-colors'
                                                onClick={() =>
                                                    handleStartEditAt(
                                                        messageIndex
                                                    )
                                                }
                                                disabled={
                                                    consulting ||
                                                    isInterpreting ||
                                                    mode === "home"
                                                }
                                                aria-label='Edit'
                                                title='Edit'
                                            >
                                                <Pencil className='w-3 h-3' />
                                            </button>
                                        </div>
                                    </div>
                                )
                            }

                            const shouldPadBottomForCardDraw =
                                showCardDraw && 
                                !showInsufficientStars &&
                                hasEnoughStars &&
                                cardsToSelect > 0 &&
                                messageIndex === messages.length - 1 &&
                                message.variant !== "box"

                            return (
                                <div
                                    key={message.id}
                                    ref={
                                        messageIndex === messages.length - 1
                                            ? (node) => {
                                                  if (node)
                                                      lastAssistantMessageRef.current =
                                                          node
                                              }
                                            : undefined
                                    }
                                    className={`flex flex-col items-start gap-4 ${
                                        shouldPadBottomForCardDraw ? "pb-[270px]" : ""
                                    }`}
                                >
                                    {message.cards &&
                                        message.cards.length > 0 && (
                                            <div className='flex flex-wrap gap-6 w-full md:max-w-[85%]'>
                                                {message.cards.map((card, index) => {
                                                    const cardCount = message.cards?.length || 0
                                                    let spreadKey: string = "simple"
                                                    if (cardCount === 1) spreadKey = "simple"
                                                    else if (cardCount === 3) spreadKey = "general"
                                                    else if (cardCount === 5) spreadKey = "detailed"
                                                    else if (cardCount === 7) spreadKey = "expanded"
                                                    else if (cardCount === 10) spreadKey = "celtic"
                                                    else spreadKey = "unknown"

                                                    const label =
                                                        spreadKey !== "unknown"
                                                            ? POSITION_MEANINGS[spreadKey]?.[index]
                                                            : `Position ${index + 1}`

                                                    return (
                                                        <div
                                                            key={`${message.id}-card-${card.id}`}
                                                            className='flex flex-row items-start gap-4 p-4 bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/5 group hover:bg-white/[0.06] hover:border-primary/20 transition-all duration-300 w-full md:max-w-sm'
                                                        >
                                                                <div className='shrink-0 flex flex-col items-center relative'>
                                                                    <div className='absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-[10px] font-bold text-white z-10 shadow-lg border border-white/10'>
                                                                        {index +
                                                                            1}
                                                                    </div>
                                                                    <div className='w-16 h-28 shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-500'>
                                                                        <CardImage
                                                                            card={
                                                                                card
                                                                            }
                                                                            size='sm'
                                                                            showAura={
                                                                                false
                                                                            }
                                                                            showLabel={
                                                                                false
                                                                            }
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className='flex-1 min-w-0 flex flex-col h-full py-0.5'>
                                                                    <div className='text-left mb-2'>
                                                                        <p className='text-[10px] text-white/50 font-bold uppercase tracking-wider mb-0.5 opacity-80'>
                                                                            {
                                                                                label
                                                                            }
                                                                        </p>
                                                                        <Badge
                                                                            variant='secondary'
                                                                            className='bg-white/20 text-white/90 border-primary/30 truncate block max-w-full text-[10px]'
                                                                        >
                                                                            {
                                                                                card.meaning
                                                                            }
                                                                        </Badge>
                                                                    </div>
                                                                    <div className='px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md relative group/insight animate-fade-in shadow-lg'>
                                                                        <div className='absolute -top-1 -left-1 w-2 h-2 border-t border-l border-primary/40 rounded-tl-sm' />
                                                                        <div className='absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-primary/40 rounded-br-sm' />
                                                                        <p className='text-[10px] font-serif italic text-indigo-100 leading-relaxed'>
                                                                            &ldquo;
                                                                            {message.isLoading ? (
                                                                                <span className='inline-flex items-center gap-1.5'>
                                                                                    <Loader2 className='h-3 w-3 animate-spin' />
                                                                                    {`Consulting${".".repeat(
                                                                                        loadingDots
                                                                                    )}`}
                                                                                </span>
                                                                            ) : (
                                                                                message.insights?.[
                                                                                    index
                                                                                ] || "Consulting..."
                                                                            )}
                                                                            &rdquo;
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    }
                                                )}
                                            </div>
                                        )}
                                    {message.variant === "box" ? (
                                        <>
                                            <div className='w-full md:max-w-[85%] rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg space-y-6'>
                                                <div className='flex items-center space-x-3'>
                                                    <div className='w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center'>
                                                        <Sparkles className='w-5 h-5 text-primary' />
                                                    </div>
                                                    <div>
                                                        <h2 className='font-serif font-semibold text-xl text-white'>
                                                            Interpretation
                                                        </h2>
                                                        <p className='text-sm text-white/40'>
                                                            AI-powered tarot
                                                            reading
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className='text-white/90 leading-relaxed whitespace-pre-wrap'>
                                                    {message.isLoading ? (
                                                        <span className='inline-flex items-center gap-2 text-white/70'>
                                                            <Loader2 className='h-4 w-4 animate-spin' />
                                                            {`Consulting${".".repeat(
                                                                loadingDots
                                                            )}`}
                                                        </span>
                                                    ) : (
                                                        message.text
                                                    )}
                                                </div>
                                                {!message.isLoading && (
                                                    <div className='pt-4 border-t border-white/5 space-y-4'>
                                                        <div className='space-y-2'>
                                                            <p className='text-[11px] uppercase tracking-[0.2em] text-white/50'>
                                                                Actions
                                                            </p>
                                                            <ActionSection
                                                                variant='embedded'
                                                                question={
                                                                    message.question
                                                                }
                                                                cards={message.cards?.map(
                                                                    (card) =>
                                                                        card.meaning
                                                                )}
                                                                interpretation={
                                                                    message.text
                                                                }
                                                            />
                                                        </div>
                                                        <ShareSection
                                                            variant='embedded'
                                                            question={
                                                                message.question
                                                            }
                                                            cards={message.cards?.map(
                                                                (card) =>
                                                                    card.meaning
                                                            )}
                                                            interpretation={
                                                                message.text
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            {!message.isLoading && (
                                                <div className={`w-full md:max-w-[85%] space-y-2 pt-4`}>
                                                    {message.followUpLoading && (
                                                        <p className='text-xs sm:text-sm text-white/60'>
                                                            Thinking of a good
                                                            next question...
                                                        </p>
                                                    )}
                                                    {message.followUpConclusion && (
                                                        <p className='text-white'>
                                                            {
                                                                message.followUpConclusion
                                                            }
                                                        </p>
                                                    )}
                                                    {Array.isArray(
                                                        message.followUpSuggestions
                                                    ) &&
                                                        message
                                                            .followUpSuggestions
                                                            .length > 0 && (
                                                            <div className='flex flex-wrap gap-2'>
                                                                {message.followUpSuggestions.map(
                                                                    (s) => (
                                                                        <button
                                                                            key={
                                                                                s
                                                                            }
                                                                            type='button'
                                                                            onClick={() =>
                                                                                applySuggestedQuestion(
                                                                                    s
                                                                                )
                                                                            }
                                                                            className='rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-1.5 text-xs text-white/80 hover:text-white'
                                                                        >
                                                                            {s}
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className='w-full md:max-w-[85%] text-white/90'>
                                            {message.text}
                                        </div>
                                    )}
                                    {!isChatLoading &&
                                        message.variant === "plain" &&
                                        !hasInterpretation && (
                                            <div className='flex items-center gap-2 text-[11px] text-white/60'>
                                                <button
                                                    type='button'
                                                    className={`flex items-center justify-center h-6 w-6 rounded-full hover:text-white hover:bg-white/10 transition-colors ${
                                                        assistantReactions[
                                                            message.id
                                                        ] === "like"
                                                            ? "text-white"
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        toggleReaction(
                                                            message.id,
                                                            "like"
                                                        )
                                                    }
                                                    aria-label='Like'
                                                    title='Like'
                                                >
                                                    <ThumbsUp className='w-3 h-3' />
                                                </button>
                                                <button
                                                    type='button'
                                                    className={`flex items-center justify-center h-6 w-6 rounded-full hover:text-white hover:bg-white/10 transition-colors ${
                                                        assistantReactions[
                                                            message.id
                                                        ] === "dislike"
                                                            ? "text-white"
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        toggleReaction(
                                                            message.id,
                                                            "dislike"
                                                        )
                                                    }
                                                    aria-label='Dislike'
                                                    title='Dislike'
                                                >
                                                    <ThumbsDown className='w-3 h-3' />
                                                </button>
                                                <button
                                                    type='button'
                                                    className='flex items-center justify-center h-6 w-6 rounded-full hover:text-white hover:bg-white/10 transition-colors'
                                                    onClick={() =>
                                                        handleReport(
                                                            message.id,
                                                            message.text
                                                        )
                                                    }
                                                    aria-label='Report'
                                                    title='Report'
                                                >
                                                    <Flag className='w-3 h-3' />
                                                </button>
                                                <button
                                                    type='button'
                                                    className='flex items-center justify-center h-6 w-6 rounded-full hover:text-white hover:bg-white/10 transition-colors'
                                                    onClick={() =>
                                                        handleShare(
                                                            message.id,
                                                            message.text
                                                        )
                                                    }
                                                    aria-label='Share'
                                                    title='Share'
                                                >
                                                    <Share2 className='w-3 h-3' />
                                                </button>
                                                {messageNotices[
                                                    message.id
                                                ] && (
                                                    <span className='text-white/40'>
                                                        {
                                                            messageNotices[
                                                                message.id
                                                            ]
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                </div>
                            )
                        })}
                        {consulting && messages.length > 0 && (
                            <div className='flex items-center gap-2 justify-start text-white/60 text-sm'>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                Consulting...
                            </div>
                        )}
                        
                        {/* Star checking state - shown while verifying star balance on page load/refresh */}
                        {isCheckingStars && (
                            <div className='flex flex-col items-start gap-4 animate-fade-in'>
                                <div className='w-full md:max-w-[85%] text-white/90'>
                                    <div className='flex items-center gap-3'>
                                        <div className='w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0'>
                                            <Loader2 className='w-4 h-4 text-yellow-300 animate-spin' />
                                        </div>
                                        <p className='text-white/70'>
                                            {tHome("checkingStars")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Insufficient stars message - shown below AI response when card draw is requested but user lacks stars */}
                        {showInsufficientStars && (
                            <div className='flex flex-col items-start gap-4 animate-fade-in'>
                                <div className='w-full md:max-w-[85%] text-white/90 space-y-4'>
                                    <InsufficientStarsBlock />
                                </div>
                            </div>
                        )}
                        
                        {!isChatLoading && hasAssistantResponse && (
                            <p className='text-[11px] leading-relaxed text-white/40 text-center animate-fade-in py-4 text-left'>
                                {disclaimerText}
                            </p>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            )}

            <div className='sticky bottom-0 w-full bg-gradient-to-t from-black/90 via-black/60 to-transparent backdrop-blur-xl pt-4 transition-all duration-500'>
                <div
                    className={`w-full max-w-3xl mx-auto px-4 space-y-4 transition-all duration-500 ${
                        hasMessages ? "pb-8" : "pb-4"
                    }`}
                >
                    {isLinking && (
                        <div className='text-xs text-white/70 text-center animate-fade-in'>
                            Linking to your session...
                        </div>
                    )}

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
