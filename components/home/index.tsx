"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useStarConsent } from "@/components/star-consent"
import { LoopingTypewriterText } from "@/components/home/looping-typewriter-text"
import QuestionInput from "@/components/question-input"
import Footer from "@/components/footer/footer"
import HomeQuickCards from "@/components/home/home-quick-cards"
import { ConsultingBadge } from "@/components/consulting-badge"
import InterpretationModeSelector from "@/components/chat/interpretation-mode-selector"
import {
    loadInterpretationModeFromStorage,
    type InterpretationMode,
} from "@/lib/interpretation-mode-storage"
import { GetStartedTourOverlay } from "@/components/home/get-started-tour-overlay"

export default function Home() {
    const tHome = useTranslations("Home")
    const locale = useLocale()
    const router = useRouter()
    const { user } = useAuth()
    const { choice, show } = useStarConsent()

    const [question, setQuestion] = useState("")
    const [isLinking, setIsLinking] = useState(false)
    const [linkingQuestion, setLinkingQuestion] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showLearnMore, setShowLearnMore] = useState(false)
    const [showTour, setShowTour] = useState(false)
    const [interpretationMode, setInterpretationMode] =
        useState<InterpretationMode>(() => loadInterpretationModeFromStorage())
    const inputContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setShowLearnMore(true)
        }, 3000)
        return () => window.clearTimeout(timer)
    }, [])

    const createSessionAndRedirect = async (value: string) => {
        const trimmed = value.trim()
        if (!trimmed || isLinking) return
        if (choice === null || choice === "declined") {
            show()
            return
        }
        setShowTour(false)
        setQuestion("")
        setError(null)
        setLinkingQuestion(trimmed)
        setIsLinking(true)
        try {
            const response = await fetch("/api/chat-sessions/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: trimmed,
                    user_id: user?.id ?? null,
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
            try {
                router.prefetch(`/${locale}/${payload.id}`)
            } catch {}
            window.setTimeout(() => {
                router.push(`/${locale}/${payload.id}`)
            }, 250)
        } catch {
            setIsLinking(false)
            setLinkingQuestion(null)
            setError("Sorry, something went wrong. Please try again.")
        }
    }

    const shouldShowHero = !isLinking
    const shouldShowLearnMore = showLearnMore && !isLinking
    const disclaimerText = tHome("disclaimer")

    const heroPhrases = useMemo(() => {
        const firstPhrase = `${tHome("hero.line1")} ${tHome("hero.line2")}`
        const raw = tHome.raw("hero.rotatingPhrases")
        const rotating = Array.isArray(raw)
            ? raw.filter((p): p is string => typeof p === "string")
            : []
        return [firstPhrase, ...rotating]
    }, [tHome])

    return (
        <div className='w-full h-full min-h-[calc(100dvh-65px)] flex flex-col overflow-hidden relative'>
            {shouldShowHero ? (
                <div className='flex-1 flex items-center justify-center px-6'>
                    <div className='text-center space-y-4'>
                        <h1 className='font-playfair font-bold text-4xl sm:text-5xl md:text-6xl text-white'>
                            <LoopingTypewriterText
                                phrases={heroPhrases}
                                speed={50}
                                holdDuration={3000}
                                fadeDuration={500}
                                firstPhraseSplitAt={tHome("hero.line1").length}
                                className='font-playfair text-transparent bg-gradient-to-r from-primary via-accent to-primary bg-clip-text'
                            />
                        </h1>
                        <p className='text-white/70 text-sm md:text-base'>
                            {tHome("description")}
                        </p>
                        <div className='w-[300px] mx-auto flex flex-col gap-2 justify-center items-center'>
                            <button
                                type='button'
                                onClick={() => {
                                    document
                                        .getElementById(
                                            "home-question-input-wrapper",
                                        )
                                        ?.scrollIntoView({ behavior: "smooth" })
                                    setShowTour(true)
                                }}
                                className='w-full rounded-full bg-gradient-to-r from-primary via-accent to-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-90 transition-opacity'
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

            <HomeQuickCards
                onCardClick={createSessionAndRedirect}
                disabled={isLinking}
            />

            <div
                className={`sticky bottom-0 w-full bg-gradient-to-t from-black/90 via-black/60 to-transparent backdrop-blur-xl pt-4 transition-all duration-500 ${showTour ? "z-[51]" : ""}`}
            >
                <div className='w-full max-w-3xl mx-auto px-4 space-y-4 transition-all duration-500 pb-4'>
                    {error && (
                        <p className='text-xs text-red-400 text-center animate-fade-in'>
                            {error}
                        </p>
                    )}

                    <div
                        ref={inputContainerRef}
                        id='home-question-input-wrapper'
                        className='flex flex-col'
                    >
                        <div className='flex justify-center'>
                            <QuestionInput
                                id='home-question-input'
                                value={question}
                                onChange={setQuestion}
                                onSubmit={createSessionAndRedirect}
                                isLoading={isLinking}
                                centered
                                className='max-w-sm md:max-w-md transition-[max-width] duration-500 ease-in-out'
                            />
                        </div>
                        <div className='flex justify-start mt-2'>
                            <InterpretationModeSelector
                                value={interpretationMode}
                                onChange={setInterpretationMode}
                            />
                        </div>
                    </div>
                    <p className='text-[11px] leading-relaxed text-white/50 text-center text-left'>
                        {disclaimerText}
                    </p>
                </div>
                <div className='opacity-100'>
                    <Footer />
                </div>
            </div>

            {showTour && (
                <GetStartedTourOverlay
                    isOpen={showTour}
                    onClose={() => setShowTour(false)}
                    targetRef={inputContainerRef}
                />
            )}
        </div>
    )
}
