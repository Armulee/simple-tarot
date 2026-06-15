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
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    CelestialIcon,
    CornerAccents,
    StarsDialog,
} from "@/components/star-consent"
import { LogIn } from "lucide-react"
import { ConsultingBadge } from "@/components/consulting-badge"
import {
    loadInterpretationModeFromStorage,
    saveInterpretationModeToStorage,
    type InterpretationMode,
} from "@/lib/interpretation-mode-storage"
import { useStarConsent } from "@/components/star-consent"
import {
    detectInputLanguage,
    resolveSessionLocale,
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
            const targetLocale = resolveSessionLocale(detectedLocale, locale)
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
    // Pressing a feature card is itself an explicit feature choice, so any
    // locked interpretation mode must drop back to "auto" before the message is
    // pushed into a new session. We persist to storage too because the new
    // session hydrates its interpretation mode from there on bootstrap.
    const resetInterpretationModeToAuto = () => {
        setInterpretationMode("auto")
        saveInterpretationModeToStorage("auto")
    }

    const handleQuickCardClick = (question: string, cardId: string) => {
        if (cardId !== "tarotCard" && !user) {
            setAuthGate({ question, cardId })
            return
        }
        resetInterpretationModeToAuto()
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
        // This replay only fires for a feature card stashed behind the sign-in
        // gate, so drop any locked mode back to "auto" before pushing.
        resetInterpretationModeToAuto()
        void createSessionAndRedirect(autosend)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading])

    const shouldShowHero = !isLinking
    const shouldShowLearnMore = showLearnMore && !isLinking

    const handleGetStarted = () => {
        createSessionAndRedirect(tHome("getStartedPrompt"))
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
                    enableCharacterMention
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
                <StarsDialog className='relative flex max-w-[480px] flex-col !overflow-hidden !rounded-[3px] !border-[0.5px] !border-[rgba(200,180,140,0.3)] !bg-[#13121f] !p-0 !shadow-none'>
                    <div className='relative z-10 flex w-full flex-col'>
                        <CornerAccents />

                        <div className='relative shrink-0 border-b border-[rgba(200,180,140,0.1)] px-6 pb-5 pt-6'>
                            <div className='mb-2 flex justify-center'>
                                <CelestialIcon />
                            </div>
                            <p className='text-center font-serif text-[10px] font-normal uppercase tracking-[0.28em] text-[rgba(200,180,140,0.6)]'>
                                {tHome("signInGate.eyebrow")}
                            </p>
                            <DialogHeader className='mt-1 text-center'>
                                <DialogTitle className='font-serif text-[22px] font-medium leading-tight text-[#e8e0d0]'>
                                    {tHome("signInGate.title")}
                                </DialogTitle>
                            </DialogHeader>
                        </div>

                        <div className='px-6 py-6'>
                            <DialogDescription asChild>
                                <p className='text-center text-[13px] leading-[1.78] font-light text-[rgba(232,224,208,0.62)]'>
                                    {tHome("signInGate.description")}
                                </p>
                            </DialogDescription>
                        </div>

                        <footer className='relative shrink-0 border-t border-[rgba(200,180,140,0.1)] bg-[#13121f]/95 px-6 pb-5 pt-4 backdrop-blur-sm'>
                            <div className='flex flex-col gap-2.5'>
                                <button
                                    type='button'
                                    onClick={() => {
                                        if (!authGate) return
                                        const callback = `/?autosend=${encodeURIComponent(authGate.question)}`
                                        router.push(
                                            `/signin?callbackUrl=${encodeURIComponent(callback)}`,
                                        )
                                    }}
                                    className='inline-flex w-full items-center justify-center gap-2 rounded-[2px] border-[0.5px] border-[rgba(200,180,140,0.55)] bg-transparent py-3.5 text-[11px] font-normal uppercase tracking-[0.18em] text-[rgba(232,224,208,0.88)] transition-all duration-300 hover:border-[rgba(200,180,140,0.8)] hover:bg-[rgba(200,180,140,0.07)] active:scale-[0.99]'
                                >
                                    <LogIn className='h-3.5 w-3.5' />
                                    {tHome("signInGate.signIn")}
                                </button>
                                <button
                                    type='button'
                                    onClick={() => setAuthGate(null)}
                                    className='w-full rounded-[2px] border-[0.5px] border-transparent py-2.5 text-[10.5px] font-normal uppercase tracking-[0.16em] text-[rgba(232,224,208,0.45)] transition-colors duration-200 hover:border-[rgba(200,180,140,0.15)] hover:bg-[rgba(200,180,140,0.04)] hover:text-[rgba(232,224,208,0.72)]'
                                >
                                    {tHome("signInGate.cancel")}
                                </button>
                            </div>
                        </footer>
                    </div>
                </StarsDialog>
            </Dialog>
        </div>
    )
}
