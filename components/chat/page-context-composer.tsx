"use client"

import {
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import "swiper/css"
import "swiper/css/free-mode"

import { useAuth } from "@/hooks/use-auth"
import QuestionInput from "@/components/question-input"
import OriginContextStrip from "@/components/chat/origin-context-strip"
import { CARD_UI_TEXT, normalizeLocale } from "@/components/chat/card-ui"
import {
    detectInputLanguage,
    isSupportedLocale,
} from "@/lib/detect-input-language"
import { sanitizePromptOnClient } from "@/lib/privacy/sanitize-client"
import {
    buildPrivacyStorageKey,
    saveRawPromptToSession,
} from "@/lib/privacy/prompt-redaction"
import {
    loadInterpretationModeFromStorage,
    saveInterpretationModeToStorage,
    type InterpretationMode,
} from "@/lib/interpretation-mode-storage"
import {
    loadComposerSuggestionsEnabledFromStorage,
    saveComposerSuggestionsEnabledToStorage,
} from "@/lib/composer-suggestions-storage"
import { loadBirthFromStorage } from "@/lib/birth-storage"
import type { HoroscopeBirthData } from "@/types/horoscope"
import type { OriginContext } from "@/lib/chat/origin-context"

type PageContextComposerProps = {
    /**
     * Page context attached to the new chat session. Persisted on the
     * `chat_sessions.origin_context` row and merged into every
     * `contextSummary` we send to the AI on follow-ups. When null/omitted
     * the composer renders without the OriginContextStrip — used on
     * /calendar after the viewer cancels the strip, where the composer
     * should stay mounted even with no day selected.
     */
    originContext?: OriginContext | null
    placeholder?: string
    disclaimerText?: string
    /**
     * Optional override for the "On this page" eyebrow above the context chip.
     * Defaults to the shared translation `PageContextComposer.eyebrow`.
     */
    eyebrow?: string
    /**
     * Optional override for the trailing hint after the chip label. Defaults to
     * the shared translation `PageContextComposer.hint`.
     */
    hint?: string
    /**
     * Optional fixed suggestion prompts rendered as quick-reply chips below
     * the context chip. Tapping a suggestion submits the chat with that
     * text as the question.
     */
    suggestions?: string[]
    /**
     * When provided, an X button renders next to the day pill that calls
     * this. The parent typically clears its selected date so the strip
     * disappears (and can come back when a new date is picked).
     */
    onClearContext?: () => void
}

function createPendingSessionId() {
    return Array.from(crypto.getRandomValues(new Uint8Array(12)))
        .map((value) => value.toString(36))
        .join("")
        .slice(0, 12)
}

export default function PageContextComposer({
    originContext,
    placeholder,
    disclaimerText,
    eyebrow,
    hint,
    suggestions,
    onClearContext,
}: PageContextComposerProps) {
    const t = useTranslations("PageContextComposer")
    const locale = useLocale()
    const router = useRouter()
    const { user } = useAuth()

    const [question, setQuestion] = useState("")
    const [isLinking, setIsLinking] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [interpretationMode, setInterpretationMode] =
        useState<InterpretationMode>("auto")
    const [composerSuggestionsEnabled, setComposerSuggestionsEnabled] =
        useState(true)
    const [savedBirth, setSavedBirth] = useState<HoroscopeBirthData | null>(
        null,
    )

    const linkingAbortControllerRef = useRef<AbortController | null>(null)
    const linkingRequestIdRef = useRef(0)
    const pendingSessionIdRef = useRef<string | null>(null)
    const fixedBarRef = useRef<HTMLDivElement>(null)

    useLayoutEffect(() => {
        setInterpretationMode(loadInterpretationModeFromStorage())
        setComposerSuggestionsEnabled(loadComposerSuggestionsEnabledFromStorage())
        setSavedBirth(loadBirthFromStorage())
    }, [])

    const handleInterpretationModeChange = (mode: InterpretationMode) => {
        setInterpretationMode(mode)
        saveInterpretationModeToStorage(mode)
    }

    const handleComposerSuggestionsEnabledChange = (enabled: boolean) => {
        setComposerSuggestionsEnabled(enabled)
        saveComposerSuggestionsEnabledToStorage(enabled)
    }

    const handleStopLinking = () => {
        linkingRequestIdRef.current += 1
        if (linkingAbortControllerRef.current) {
            linkingAbortControllerRef.current.abort()
            linkingAbortControllerRef.current = null
        }
        pendingSessionIdRef.current = null
        setIsLinking(false)
        setError(null)
    }

    const createSessionAndRedirect = async (value: string) => {
        const trimmed = value.trim()
        if (!trimmed || isLinking) return
        linkingRequestIdRef.current += 1
        const requestId = linkingRequestIdRef.current
        const pendingSessionId = createPendingSessionId()
        if (linkingAbortControllerRef.current) {
            linkingAbortControllerRef.current.abort()
        }
        const controller = new AbortController()
        linkingAbortControllerRef.current = controller
        pendingSessionIdRef.current = pendingSessionId
        setError(null)
        setIsLinking(true)
        try {
            const sanitizeResult = await sanitizePromptOnClient(trimmed, {
                sessionId: pendingSessionId,
                locale,
                signal: controller.signal,
            })
            if (
                requestId !== linkingRequestIdRef.current ||
                controller.signal.aborted
            ) {
                return
            }
            const sanitizedQuestion = sanitizeResult.sanitized || trimmed
            const userMessageId = `user-${Date.now()}`
            const privacyStorageKey = sanitizeResult.redacted
                ? buildPrivacyStorageKey(userMessageId)
                : undefined
            if (privacyStorageKey) {
                saveRawPromptToSession(privacyStorageKey, trimmed)
            }
            const response = await fetch("/api/chat-sessions/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    id: pendingSessionId,
                    question: sanitizedQuestion,
                    user_id: user?.id ?? null,
                    originContext,
                    messages: [
                        {
                            id: userMessageId,
                            role: "user",
                            text: sanitizedQuestion,
                            ...(privacyStorageKey && {
                                privacyStorageKey,
                                privacyRedacted: true,
                                privacyRedactionTypes:
                                    sanitizeResult.redactionTypes,
                            }),
                        },
                    ],
                }),
            })
            if (
                requestId !== linkingRequestIdRef.current ||
                controller.signal.aborted
            ) {
                return
            }
            const payload = await response.json()
            if (!response.ok || !payload?.id) {
                throw new Error("Failed to create session")
            }
            linkingAbortControllerRef.current = null
            pendingSessionIdRef.current = null
            const detectedLocale = detectInputLanguage(trimmed)
            const targetLocale =
                detectedLocale && isSupportedLocale(detectedLocale)
                    ? detectedLocale
                    : locale
            try {
                router.prefetch(`/${targetLocale}/${payload.id}`)
            } catch {}
            router.push(`/${targetLocale}/${payload.id}`)
        } catch (err) {
            if (requestId !== linkingRequestIdRef.current) return
            linkingAbortControllerRef.current = null
            if (pendingSessionIdRef.current === pendingSessionId) {
                pendingSessionIdRef.current = null
            }
            if (err instanceof Error && err.name === "AbortError") {
                setIsLinking(false)
                return
            }
            setIsLinking(false)
            setError(t("error"))
        }
    }

    const contextChip: ReactNode = originContext ? (
        <OriginContextStrip
            originContext={originContext}
            eyebrow={eyebrow}
            hint={hint}
            suggestions={suggestions}
            onSuggestionClick={(suggestion) => {
                setQuestion(suggestion)
                void createSessionAndRedirect(suggestion)
            }}
            onCancel={onClearContext}
            disabled={isLinking}
        />
    ) : null

    return (
        <div
            ref={fixedBarRef}
            className='fixed bottom-0 left-0 right-0 z-30 w-full bg-gradient-to-t from-black/90 via-black/60 to-transparent backdrop-blur-xl pt-4'
        >
            <QuestionInput
                id='page-context-composer'
                value={question}
                onChange={setQuestion}
                onSubmit={createSessionAndRedirect}
                onStop={handleStopLinking}
                isLoading={isLinking}
                centered
                placeholder={placeholder}
                className='w-full'
                interpretationMode={interpretationMode}
                onInterpretationModeChange={handleInterpretationModeChange}
                composerSettings={{
                    showAutoPick: false,
                    autoPickOn: false,
                    onToggleAutoPick: () => {},
                    showComposerSuggestionsToggle: true,
                    composerSuggestionsEnabled,
                    onComposerSuggestionsEnabledChange:
                        handleComposerSuggestionsEnabledChange,
                    exposeBirthDrawInMenu: false,
                    savedBirth,
                    onBirthInfoClick: () => {
                        router.push(`/${locale}/profile`)
                    },
                    showDrawTrigger: false,
                    showInsufficientStars: false,
                    cardsToSelect: 0,
                    cardUi: CARD_UI_TEXT[normalizeLocale(locale)],
                    onScrollToDraw: () => {},
                }}
                topAccessory={contextChip}
                showDisclaimer={Boolean(disclaimerText)}
                disclaimerText={disclaimerText}
                error={
                    error ? (
                        <p className='text-xs text-red-400 text-center animate-fade-in'>
                            {error}
                        </p>
                    ) : undefined
                }
                wrapperClassName=''
                inputWrapperClassName='w-full'
            />
        </div>
    )
}
