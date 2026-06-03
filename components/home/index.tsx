"use client"

import { useEffect, useLayoutEffect, useState, useMemo, useRef } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { LoopingTypewriterText } from "@/components/home/looping-typewriter-text"
import QuestionInput from "@/components/question-input"
import Footer from "@/components/footer/footer"
import HomeQuickCards from "@/components/home/home-quick-cards"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ConsultingBadge } from "@/components/consulting-badge"
import {
    loadInterpretationModeFromStorage,
    saveInterpretationModeToStorage,
    type InterpretationMode,
} from "@/lib/interpretation-mode-storage"
import { useStarConsent } from "@/components/star-consent"
import {
    detectInputLanguage,
    isSupportedLocale,
} from "@/lib/detect-input-language"
import { sanitizePromptOnClient } from "@/lib/privacy/sanitize-client"
import {
    buildPrivacyStorageKey,
    saveRawPromptToSession,
} from "@/lib/privacy/prompt-redaction"
import { CookiesBanner } from "@/components/cookies-banner"
import { CARD_UI_TEXT, normalizeLocale } from "@/components/chat/card-ui"
import { loadBirthFromStorage, saveBirthToStorage } from "@/lib/birth-storage"
import {
    loadAutoPickFromStorage,
    saveAutoPickToStorage,
} from "@/lib/auto-pick-storage"
import {
    loadComposerSuggestionsEnabledFromStorage,
    saveComposerSuggestionsEnabledToStorage,
} from "@/lib/composer-suggestions-storage"
import type { HoroscopeBirthData } from "@/types/horoscope"

export default function Home() {
    const tHome = useTranslations("Home")
    const locale = useLocale()
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const [authGate, setAuthGate] = useState<{
        question: string
        cardId: string
    } | null>(null)
    const { ageGateState } = useStarConsent()
    const [question, setQuestion] = useState("")
    const [isLinking, setIsLinking] = useState(false)
    const [linkingQuestion, setLinkingQuestion] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showLearnMore, setShowLearnMore] = useState(false)
    // Must match `load*FromStorage()` when `window` is undefined (SSR) so the
    // first client render hydrates; read localStorage in useLayoutEffect below.
    const [interpretationMode, setInterpretationMode] =
        useState<InterpretationMode>("auto")
    const inputContainerRef = useRef<HTMLDivElement>(null)
    const fixedBarRef = useRef<HTMLDivElement>(null)
    const [fixedBarHeight, setFixedBarHeight] = useState(0)
    const [savedBirth, setSavedBirth] = useState<HoroscopeBirthData | null>(
        null,
    )
    const [autoPickOn, setAutoPickOn] = useState(false)
    const [composerSuggestionsEnabled, setComposerSuggestionsEnabled] =
        useState(true)
    const linkingAbortControllerRef = useRef<AbortController | null>(null)
    const linkingRequestIdRef = useRef(0)
    const pendingSessionIdRef = useRef<string | null>(null)

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setShowLearnMore(true)
        }, 3000)
        return () => window.clearTimeout(timer)
    }, [])

    useLayoutEffect(() => {
        setInterpretationMode(loadInterpretationModeFromStorage())
        setSavedBirth(loadBirthFromStorage())
        setAutoPickOn(loadAutoPickFromStorage())
        setComposerSuggestionsEnabled(
            loadComposerSuggestionsEnabledFromStorage(),
        )
    }, [])

    useEffect(() => {
        const el = fixedBarRef.current
        if (!el) return
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setFixedBarHeight(entry.contentRect.height)
            }
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    useEffect(() => {
        return () => {
            if (linkingAbortControllerRef.current) {
                linkingAbortControllerRef.current.abort()
                linkingAbortControllerRef.current = null
            }
        }
    }, [])

    useEffect(() => {
        if (!ageGateState.birth) return
        const nextBirth = {
            year: ageGateState.birth.year,
            month: ageGateState.birth.month,
            day: ageGateState.birth.day,
            hour: ageGateState.birth.hour,
            minute: ageGateState.birth.minute,
            timeHint: "unknown" as const,
            timezone: ageGateState.birth.timezone ?? null,
            lat: ageGateState.birth.lat ?? null,
            lng: ageGateState.birth.lng ?? null,
            country: ageGateState.birth.country ?? null,
            state: ageGateState.birth.state ?? null,
            usedLocationFallback: false,
        }
        setSavedBirth((current) => {
            const sameBirth =
                current?.year === nextBirth.year &&
                current?.month === nextBirth.month &&
                current?.day === nextBirth.day &&
                current?.hour === nextBirth.hour &&
                current?.minute === nextBirth.minute
            if (sameBirth) return current
            return nextBirth
        })
        saveBirthToStorage(nextBirth)
    }, [ageGateState.birth])

    useEffect(() => {
        if (user) return
        if (interpretationMode !== "horoscope") return
        setInterpretationMode("auto")
        saveInterpretationModeToStorage("auto")
    }, [user, interpretationMode])

    const handleToggleAutoPick = () => {
        setAutoPickOn((prev) => {
            const next = !prev
            saveAutoPickToStorage(next)
            return next
        })
    }

    const handleComposerSuggestionsEnabledChange = (enabled: boolean) => {
        setComposerSuggestionsEnabled(enabled)
        saveComposerSuggestionsEnabledToStorage(enabled)
    }

    const createPendingSessionId = () =>
        Array.from(crypto.getRandomValues(new Uint8Array(12)))
            .map((value) => value.toString(36))
            .join("")
            .slice(0, 12)

    const cleanupPendingSession = async (sessionId: string) => {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }

        for (const delay of [0, 300, 1000, 2500, 5000]) {
            if (delay > 0) {
                await new Promise((resolve) =>
                    window.setTimeout(resolve, delay),
                )
            }

            try {
                const response = await fetch(
                    `/api/chat-sessions/${sessionId}`,
                    {
                        method: "DELETE",
                        headers,
                    },
                )
                if (response.ok) {
                    return
                }
            } catch {
                // ignore transient cleanup failures and retry
            }
        }
    }

    const handleStopLinking = () => {
        const pendingSessionId = pendingSessionIdRef.current
        linkingRequestIdRef.current += 1
        if (linkingAbortControllerRef.current) {
            linkingAbortControllerRef.current.abort()
            linkingAbortControllerRef.current = null
        }
        pendingSessionIdRef.current = null
        setIsLinking(false)
        setQuestion(linkingQuestion ?? "")
        setLinkingQuestion(null)
        setError(null)
        if (pendingSessionId) {
            void cleanupPendingSession(pendingSessionId)
        }
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
        setQuestion("")
        setError(null)
        setLinkingQuestion(trimmed)
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
        } catch (error) {
            if (requestId !== linkingRequestIdRef.current) return
            linkingAbortControllerRef.current = null
            if (pendingSessionIdRef.current === pendingSessionId) {
                pendingSessionIdRef.current = null
            }
            if (error instanceof Error && error.name === "AbortError") {
                setIsLinking(false)
                setQuestion(trimmed)
                setLinkingQuestion(null)
                void cleanupPendingSession(pendingSessionId)
                return
            }
            setIsLinking(false)
            setLinkingQuestion(null)
            setQuestion(trimmed)
            setError("Sorry, something went wrong. Please try again.")
        }
    }

    // Feature chip clicks (excluding tarot) require an authenticated user.
    // When the viewer is signed out we surface a sign-in gate and stash the
    // prompt; after sign-in the autosend effect below replays it.
    const handleQuickCardClick = (question: string, cardId: string) => {
        if (cardId !== "tarotCard" && !user) {
            setAuthGate({ question, cardId })
            return
        }
        void createSessionAndRedirect(question)
    }

    // Pickup after sign-in: if we land back on home with ?autosend=<encoded>
    // and the user is now authenticated, replay the prompt and clear the
    // marker so a refresh doesn't re-fire.
    const autosendFiredRef = useRef(false)
    useEffect(() => {
        if (typeof window === "undefined") return
        if (authLoading) return
        if (!user) return
        if (autosendFiredRef.current) return
        const params = new URLSearchParams(window.location.search)
        const autosend = params.get("autosend")
        if (!autosend) return
        autosendFiredRef.current = true
        params.delete("autosend")
        const search = params.toString()
        window.history.replaceState(
            {},
            "",
            `${window.location.pathname}${search ? `?${search}` : ""}`,
        )
        void createSessionAndRedirect(autosend)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading])

    const shouldShowHero = !isLinking
    const shouldShowLearnMore = showLearnMore && !isLinking
    const randomQuestionPool = useMemo(() => {
        const prompts = tHome.raw("prompts")
        const arr = Array.isArray(prompts)
            ? (prompts as string[]).filter(
                  (p): p is string => typeof p === "string",
              )
            : []
        const tarotQ = tHome("quickCardQuestions.tarotCard")
        const birthQ = tHome("quickCardQuestions.birthChart")
        const horoQ = tHome("quickCardQuestions.horoscope")
        return [...arr, tarotQ, birthQ, horoQ].filter(Boolean)
    }, [tHome])

    const pickRandomQuestion = () => {
        if (randomQuestionPool.length === 0)
            return tHome("quickCardQuestions.tarotCard")
        return randomQuestionPool[
            Math.floor(Math.random() * randomQuestionPool.length)
        ]
    }

    const handleGetStarted = () => {
        createSessionAndRedirect(pickRandomQuestion())
    }

    const { heroPhrases, splitAtPerPhrase } = useMemo(() => {
        const firstPhrase = `${tHome("hero.line1")} ${tHome("hero.line2")}`
        const rawWhite = tHome.raw("hero.rotatingPhrasesWhite")
        const rawGradient = tHome.raw("hero.rotatingPhrasesGradient")
        const white = Array.isArray(rawWhite)
            ? rawWhite.filter((p): p is string => typeof p === "string")
            : []
        const gradient = Array.isArray(rawGradient)
            ? rawGradient.filter((p): p is string => typeof p === "string")
            : []
        const rotating = white.map((w, i) => w + (gradient[i] ?? ""))
        const splitAt = white.map((w) => w.length)
        return {
            heroPhrases: [firstPhrase, ...rotating],
            splitAtPerPhrase: [tHome("hero.line1").length, ...splitAt],
        }
    }, [tHome])

    return (
        <div className='w-full h-full min-h-[calc(100dvh-150px)] flex flex-col overflow-hidden relative'>
            {shouldShowHero ? (
                <div
                    className='flex items-center justify-center px-6'
                    style={{
                        height: `calc(100dvh - 65px - ${fixedBarHeight || 280}px)`,
                    }}
                >
                    <div className='text-center space-y-4'>
                        <h1 className='font-playfair font-bold text-4xl sm:text-5xl md:text-6xl text-white'>
                            <LoopingTypewriterText
                                phrases={heroPhrases}
                                speed={50}
                                holdDuration={3000}
                                fadeDuration={500}
                                splitAtPerPhrase={splitAtPerPhrase}
                                className='font-playfair text-transparent bg-gradient-to-r from-primary via-accent to-primary bg-clip-text'
                            />
                        </h1>
                        <p className='text-white/70 text-sm md:text-base'>
                            {tHome("description")}
                        </p>
                        <div className='w-[300px] mx-auto flex flex-col gap-2 justify-center items-center'>
                            <button
                                type='button'
                                onClick={handleGetStarted}
                                disabled={isLinking}
                                className='w-full rounded-full bg-gradient-to-r from-primary via-accent to-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                {tHome("getStarted")}
                            </button>
                            {shouldShowLearnMore && (
                                <button
                                    type='button'
                                    className='mx-auto animate-fade-swap text-xs sm:text-sm uppercase tracking-widest text-white/70 hover:text-white transition-colors'
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
                </div>
            ) : (
                <div className='flex-1 overflow-y-auto px-4 pt-6'>
                    <div className='mx-auto max-w-3xl space-y-6 text-left'>
                        {linkingQuestion && (
                            <>
                                <div className='flex flex-col items-end gap-2'>
                                    <div className='max-w-[80%] rounded-2xl bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl border border-border/60 px-4 py-3 text-white shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)]'>
                                        {linkingQuestion}
                                    </div>
                                </div>
                                <div className='flex flex-col items-start gap-4'>
                                    <ConsultingBadge />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div
                ref={fixedBarRef}
                className='fixed bottom-0 left-0 right-0 w-full bg-gradient-to-t from-black/90 via-black/60 to-transparent backdrop-blur-xl pt-4 transition-all duration-500'
            >
                <QuestionInput
                    id='home-question-input'
                    value={question}
                    onChange={setQuestion}
                    onSubmit={createSessionAndRedirect}
                    onStop={handleStopLinking}
                    isLoading={isLinking}
                    centered
                    className='w-full'
                    interpretationMode={interpretationMode}
                    onInterpretationModeChange={setInterpretationMode}
                    composerSettings={{
                        showAutoPick: true,
                        autoPickOn,
                        onToggleAutoPick: handleToggleAutoPick,
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
                    actionTrigger={
                        !isLinking ? (
                            <div className='w-full space-y-2 text-left'>
                                <p className='text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70'>
                                    {tHome("quickFeaturesLabel")}
                                </p>
                                <HomeQuickCards
                                    embedded
                                    onCardClick={handleQuickCardClick}
                                    disabled={isLinking}
                                />
                            </div>
                        ) : null
                    }
                    // disclaimerText={disclaimerText}
                    showDisclaimer={true}
                    error={
                        error ? (
                            <p className='text-xs text-red-400 text-center animate-fade-in'>
                                {error}
                            </p>
                        ) : undefined
                    }
                    containerRef={inputContainerRef}
                    sectionId='home-question-input-wrapper'
                    wrapperClassName='mt-4'
                    inputWrapperClassName='w-full'
                />
                <CookiesBanner inline />
                <div className='opacity-100'>
                    <Footer />
                </div>
            </div>
            <Dialog
                open={authGate !== null}
                onOpenChange={(open) => {
                    if (!open) setAuthGate(null)
                }}
            >
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle>{tHome("signInGate.title")}</DialogTitle>
                        <DialogDescription>
                            {tHome("signInGate.description")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className='gap-2 sm:gap-2'>
                        <Button
                            variant='ghost'
                            onClick={() => setAuthGate(null)}
                            className='text-white/80 hover:bg-white/10 hover:text-white'
                        >
                            {tHome("signInGate.cancel")}
                        </Button>
                        <Button
                            onClick={() => {
                                if (!authGate) return
                                const callback = `/?autosend=${encodeURIComponent(authGate.question)}`
                                router.push(
                                    `/signin?callbackUrl=${encodeURIComponent(callback)}`,
                                )
                            }}
                            className='bg-white text-black hover:bg-white/90'
                        >
                            {tHome("signInGate.signIn")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
