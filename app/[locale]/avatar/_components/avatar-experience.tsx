"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import QuestionInput from "@/components/question-input"
import {
    type InterpretationMode,
    loadInterpretationModeFromStorage,
} from "@/lib/interpretation-mode-storage"
import type { ComposerTarget } from "@/components/chat/avatar-chat-toggle"
import { CARD_UI_TEXT, normalizeLocale } from "@/components/chat/card-ui"
import {
    loadAutoPickFromStorage,
    saveAutoPickToStorage,
} from "@/lib/auto-pick-storage"
import {
    loadComposerSuggestionsEnabledFromStorage,
    saveComposerSuggestionsEnabledToStorage,
} from "@/lib/composer-suggestions-storage"
import { loadBirthFromStorage } from "@/lib/birth-storage"
import type { HoroscopeBirthData } from "@/types/horoscope"
import {
    newComposerSessionId,
    persistInitialQuestion,
} from "@/lib/avatar/composer-handoff"
import { useAuth } from "@/contexts/auth-context"
import { useAvatarSession } from "./use-avatar-session"
import { AvatarStage } from "./avatar-stage"
import { ResultCard } from "./result-card"

/** Delay before the input composer fades up, matching the intro clip. */
const COMPOSER_FADE_DELAY_MS = 3000

/**
 * /avatar experience. The character fills the whole page (beneath the shared
 * navbar); the same input composer the rest of the app uses fades up after the
 * intro clip. Logged-in only — a signed-out visitor still sees the greeting
 * clip, with a sign-in call to action in place of the composer.
 */
export function AvatarExperience({
    initialQuestion,
}: {
    /** When arriving via /avatar/{ref}, the question opens as the first reveal. */
    initialQuestion?: string
}) {
    const t = useTranslations("Avatar")
    const locale = useLocale()
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const session = useAvatarSession()

    const [question, setQuestion] = useState("")
    // Default to "auto" like the chat session composer.
    const [interpretationMode, setInterpretationMode] =
        useState<InterpretationMode>("auto")
    // On the avatar page the toggle defaults to "avatar".
    const [composerTarget, setComposerTarget] = useState<ComposerTarget>("avatar")
    const [composerVisible, setComposerVisible] = useState(false)
    const autoRevealedRef = useRef(false)

    // Composer settings menu state (mirrors the home composer so the avatar
    // page shows the same set of buttons).
    const [autoPickOn, setAutoPickOn] = useState(false)
    const [composerSuggestionsEnabled, setComposerSuggestionsEnabled] =
        useState(true)
    const [savedBirth, setSavedBirth] = useState<HoroscopeBirthData | null>(null)

    useEffect(() => {
        setInterpretationMode(loadInterpretationModeFromStorage())
        setAutoPickOn(loadAutoPickFromStorage())
        setComposerSuggestionsEnabled(loadComposerSuggestionsEnabledFromStorage())
        setSavedBirth(loadBirthFromStorage())
    }, [])

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

    const { status, phase } = session

    // Fade the composer up after the intro clip plays.
    useEffect(() => {
        const timer = window.setTimeout(
            () => setComposerVisible(true),
            COMPOSER_FADE_DELAY_MS,
        )
        return () => window.clearTimeout(timer)
    }, [])

    // When wishes run out mid-flow, say it in character (never switch silently).
    useEffect(() => {
        if (phase !== "ended" || !status) return
        if (!status.eligible) {
            toast(t("downgrade"), { icon: "🔮", duration: 6000 })
        }
    }, [phase, status, t])

    // Auto-open the initial question (from /avatar/{ref}) once, after sign-in is
    // confirmed. The intro clip still plays during the brief warm-up.
    useEffect(() => {
        if (!initialQuestion || autoRevealedRef.current) return
        if (authLoading || !user) return
        autoRevealedRef.current = true
        void session.submit(initialQuestion)
    }, [initialQuestion, authLoading, user, session])

    const busy = phase === "shuffling" || phase === "revealing"
    const showFreeLabel = Boolean(status && !status.freeRevealUsed)

    const errorMessage = useMemo(() => {
        if (!session.errorCode) return null
        switch (session.errorCode) {
            case "NO_WISHES":
                return t("errorNoWishes")
            case "CONCURRENCY_LIMIT":
                return t("errorBusy")
            case "SESSION_ALREADY_ACTIVE":
                return t("errorActive")
            case "AVATAR_NOT_CONFIGURED":
                return t("errorNotConfigured")
            default:
                return t("errorGeneric")
        }
    }, [session.errorCode, t])

    // Avatar mode: reveal in place (we're already on the avatar page).
    const handleAvatarSubmit = async (value: string) => {
        setQuestion("")
        await session.submit(value)
    }

    // Chat mode (user toggled to chat): hand off to the text chat, keeping
    // talking "in text", mirroring how the home composer creates a session.
    const handleChatSubmit = async (value: string) => {
        setQuestion("")
        const id = newComposerSessionId()
        const ok = await persistInitialQuestion({
            id,
            question: value,
            userId: user?.id ?? null,
        })
        router.push(ok ? `/${locale}/${id}` : `/${locale}`)
    }

    const loggedOut = !authLoading && !user

    return (
      <div className="relative w-full">
        <section className="relative flex h-[calc(100dvh-64px)] w-full flex-col overflow-hidden">
            {/* Full-page character. */}
            <AvatarStage
                videoRef={session.videoRef}
                phase={session.phase}
                connected={session.connected}
                caption={session.caption}
                cardName={session.card?.name ?? null}
                cardReversed={session.card?.isReversed ?? false}
                remainingSeconds={session.remainingSeconds}
            />

            {/* Foreground UI, fades up after the intro clip. */}
            <div
                className={cn(
                    "relative z-10 mt-auto flex w-full flex-col items-center gap-3 px-4 pb-6 transition-opacity duration-1000",
                    composerVisible ? "opacity-100" : "pointer-events-none opacity-0",
                )}
            >
                {/* Status / expectation-setting line. */}
                {!loggedOut && showFreeLabel && (
                    <div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-center text-xs text-amber-100 backdrop-blur-sm">
                        {t("freeRevealLabel")}
                    </div>
                )}

                {/* In-character closing after a reveal. */}
                {phase === "ended" && (
                    <div className="max-w-md rounded-xl border border-primary/25 bg-black/50 p-3 text-center text-sm text-white/90 backdrop-blur-sm">
                        {t("closingLine")}
                        {status && !status.eligible && (
                            <div className="mt-2">
                                <Button asChild size="sm">
                                    <Link href="/stars">{t("buyWishes")}</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Errors in brand voice. */}
                {phase === "error" && errorMessage && (
                    <div className="max-w-md rounded-xl border border-amber-300/30 bg-black/50 p-3 text-center text-sm text-amber-100 backdrop-blur-sm">
                        {errorMessage}
                        {session.errorCode === "NO_WISHES" && (
                            <div className="mt-2">
                                <Button asChild size="sm" variant="secondary">
                                    <Link href="/stars">{t("buyWishes")}</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {loggedOut ? (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/25 bg-black/50 px-6 py-5 text-center backdrop-blur-md">
                        <p className="text-sm text-white/90">{t("gateBody")}</p>
                        <div className="flex gap-3">
                            <Button asChild size="sm">
                                <Link href="/signin">{t("signIn")}</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                                <Link href="/signup">{t("signUp")}</Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <QuestionInput
                        value={question}
                        onChange={setQuestion}
                        onSubmit={handleChatSubmit}
                        onAvatarSubmit={handleAvatarSubmit}
                        isLoading={busy}
                        placeholder={t("askPlaceholder")}
                        interpretationMode={interpretationMode}
                        onInterpretationModeChange={setInterpretationMode}
                        composerTarget={composerTarget}
                        onComposerTargetChange={setComposerTarget}
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
                        showDisclaimer={false}
                        centered
                    />
                )}
            </div>
        </section>

        {/* Persisted transcript (re-readable result cards) — flows below the
            full-page stage so it can be scrolled to and shared. */}
        {session.transcript.length > 0 && (
            <section className="mx-auto w-full max-w-2xl space-y-3 px-4 py-8">
                <h2 className="text-sm font-semibold text-muted-foreground">
                    {t("transcriptTitle")}
                </h2>
                {session.transcript.map((r, i) => (
                    <ResultCard key={i} result={r} />
                ))}
            </section>
        )}
      </div>
    )
}
