"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
    // Non-authenticated users still see the composer; submitting opens this
    // login-required dialog instead of starting a reveal.
    const [showLoginDialog, setShowLoginDialog] = useState(false)
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

    // The avatar feature requires sign-in. Non-authenticated users can type and
    // hit send, but the reveal is blocked by a login-required dialog.
    const requireLogin = (): boolean => {
        if (!user) {
            setShowLoginDialog(true)
            return true
        }
        return false
    }

    // Avatar mode: reveal in place (we're already on the avatar page).
    const handleAvatarSubmit = async (value: string) => {
        if (requireLogin()) return
        setQuestion("")
        await session.submit(value)
    }

    // Chat mode (user toggled to chat): hand off to the text chat, keeping
    // talking "in text", mirroring how the home composer creates a session.
    const handleChatSubmit = async (value: string) => {
        if (requireLogin()) return
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
        {/* Character fills the whole viewport, extending up behind the
            transparent navbar so the avatar's head is never cut off. -mt-16
            cancels the layout's pt-16 (navbar height). */}
        <div className="relative -mt-16 h-[100dvh] w-full overflow-hidden">
            <AvatarStage
                videoRef={session.videoRef}
                phase={session.phase}
                connected={session.connected}
                caption={session.caption}
                cardName={session.card?.name ?? null}
                cardReversed={session.card?.isReversed ?? false}
                remainingSeconds={session.remainingSeconds}
            />
        </div>

        {/* Fixed-bottom composer; no background container on the avatar page so
            the character shows through. Fades up after the intro clip. */}
        <div
            className={cn(
                "fixed bottom-0 left-0 right-0 z-30 w-full pt-4 transition-opacity duration-1000",
                composerVisible ? "opacity-100" : "pointer-events-none opacity-0",
            )}
        >
            {/* Status / closing / error, centered above the composer. */}
            {(showFreeLabel || phase === "ended" || (phase === "error" && errorMessage)) && (
                <div className="mx-auto mb-2 flex w-full max-w-3xl flex-col items-center gap-2 px-4">
                    {!loggedOut && showFreeLabel && (
                        <div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-center text-xs text-amber-100">
                            {t("freeRevealLabel")}
                        </div>
                    )}
                    {phase === "ended" && (
                        <div className="max-w-md rounded-xl border border-primary/25 bg-black/50 p-3 text-center text-sm text-white/90">
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
                    {phase === "error" && errorMessage && (
                        <div className="max-w-md rounded-xl border border-amber-300/30 bg-black/50 p-3 text-center text-sm text-amber-100">
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
                </div>
            )}

            <QuestionInput
                value={question}
                onChange={setQuestion}
                onSubmit={handleChatSubmit}
                onAvatarSubmit={handleAvatarSubmit}
                isLoading={busy}
                centered
                className="w-full"
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
                wrapperClassName="border-transparent bg-transparent backdrop-blur-none"
                inputWrapperClassName="w-full"
            />
        </div>

        {/* Login-required dialog for non-authenticated users. */}
        <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{t("gateTitle")}</DialogTitle>
                    <DialogDescription>{t("gateBody")}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:justify-center">
                    <Button asChild>
                        <Link href="/signin">{t("signIn")}</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/signup">{t("signUp")}</Link>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Persisted transcript (re-readable result cards) — flows below the
            full-page stage so it can be scrolled to and shared. */}
        {session.transcript.length > 0 && (
            <section className="mx-auto w-full max-w-2xl space-y-3 px-4 pb-40 pt-8">
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
