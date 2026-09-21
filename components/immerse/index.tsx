"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/contexts/auth-context"
import { useVoiceInput } from "@/hooks/use-voice-input"

import { useAvatarSession } from "./use-avatar-session"
import { AvatarStage } from "./stage/avatar-stage"
import { ImmerseChrome } from "./immerse-chrome"
import { GreetingBubble } from "./greeting-bubble"
import { ImmerseComposer } from "./immerse-composer"
import { QuickActions } from "./quick-actions"
import { CategoryTiles } from "./category-tiles"
import { TryAskingChips } from "./try-asking-chips"
import { ScrollCue } from "./scroll-cue"
import { ExploreSection } from "./explore-section"

const EXPLORE_ID = "immerse-explore"

/**
 * The immerse landing experience: Astra fills the viewport, you type or speak
 * to her, and she answers aloud with the spoken words captioned on screen.
 *
 * Cost discipline lives here. A signed-out visitor sees the full stage and can
 * type freely, but pressing send opens the sign-in dialog — no HeyGen session
 * is ever created for them, so an anonymous visit costs nothing.
 */
export function ImmerseExperience() {
    const t = useTranslations("Immerse")
    const tAvatar = useTranslations("Avatar")
    const locale = useLocale()
    const { user, loading: authLoading } = useAuth()
    const session = useAvatarSession()

    const [question, setQuestion] = useState("")
    const [interim, setInterim] = useState("")
    const [showLoginDialog, setShowLoginDialog] = useState(false)
    const composerRef = useRef<HTMLDivElement | null>(null)
    const autoAskedRef = useRef(false)

    const { status, phase } = session
    const busy = phase === "shuffling" || phase === "revealing"

    const voice = useVoiceInput({
        locale,
        onInterim: setInterim,
        onFinal: (text) => {
            setInterim("")
            // Deliberately fills the field instead of sending: a mis-heard
            // question would otherwise spend a wish before anyone read it.
            setQuestion((prev) => (prev ? `${prev} ${text}` : text))
        },
    })

    const submit = useCallback(
        async (value: string) => {
            const trimmed = value.trim()
            if (!trimmed) return
            if (!user) {
                setShowLoginDialog(true)
                return
            }
            setQuestion("")
            setInterim("")
            await session.submit(trimmed)
        },
        [user, session],
    )

    /** Fill the composer and bring it into view, without sending. */
    const prefill = useCallback((value: string) => {
        setQuestion(value)
        composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, [])

    const trySample = useCallback(() => {
        const prompts = t.raw("tryAsking") as string[]
        if (!Array.isArray(prompts) || prompts.length === 0) return
        prefill(prompts[Math.floor(Math.random() * prompts.length)])
    }, [t, prefill])

    // Arriving from the composer's avatar toggle: /?ask={ref} carries a
    // question already persisted as a chat session. Open it once, after
    // sign-in resolves, then drop the param so a refresh doesn't re-charge.
    useEffect(() => {
        if (autoAskedRef.current || authLoading || !user) return
        const ref = new URLSearchParams(window.location.search).get("ask")
        if (!ref) return
        autoAskedRef.current = true

        let cancelled = false
        void (async () => {
            try {
                const res = await fetch(`/api/chat-sessions/${ref}`)
                const json = await res.json()
                const stored = json?.data?.question
                if (cancelled || typeof stored !== "string" || !stored.trim()) return
                window.history.replaceState({}, "", window.location.pathname)
                await session.submit(stored.trim())
            } catch {
                /* a bad ref just leaves the visitor on a normal landing page */
            }
        })()
        return () => {
            cancelled = true
        }
    }, [authLoading, user, session])

    // When wishes run out mid-flow, say it in character rather than silently
    // degrading.
    useEffect(() => {
        if (phase !== "ended" || !status) return
        if (!status.eligible) {
            toast(tAvatar("downgrade"), { icon: "🔮", duration: 6000 })
        }
    }, [phase, status, tAvatar])

    const errorMessage = useMemo(() => {
        if (!session.errorCode) return null
        switch (session.errorCode) {
            case "NO_WISHES":
                return tAvatar("errorNoWishes")
            case "CONCURRENCY_LIMIT":
                return tAvatar("errorBusy")
            case "SESSION_ALREADY_ACTIVE":
                return tAvatar("errorActive")
            case "AVATAR_NOT_CONFIGURED":
                return tAvatar("errorNotConfigured")
            default:
                return tAvatar("errorGeneric")
        }
    }, [session.errorCode, tAvatar])

    // The greeting steps aside once Astra is actually talking.
    const greetingHidden = phase !== "idle" && phase !== "error"

    return (
        // -mt-16 cancels the layout's pt-16 so Astra runs up behind the
        // transparent navbar and her head is never cropped.
        <div className="relative -mt-16">
            <ImmerseChrome />

            <section className="relative flex min-h-[100dvh] flex-col overflow-hidden">
                <AvatarStage
                    videoRef={session.videoRef}
                    phase={session.phase}
                    connected={session.connected}
                    caption={session.caption}
                    cardName={session.card?.name ?? null}
                    cardReversed={session.card?.isReversed ?? false}
                    remainingSeconds={session.remainingSeconds}
                />

                <div className="relative z-10 flex min-h-[100dvh] flex-col px-4 pb-6 pt-20">
                    <div className="flex justify-end">
                        <p
                            aria-hidden
                            className="mt-2 hidden max-w-[8rem] text-right font-playfair text-sm italic leading-snug text-white/45 sm:block"
                        >
                            {t("decorRight")}
                        </p>
                    </div>

                    <div className="flex-1" />

                    <div className="mx-auto w-full max-w-xl space-y-4">
                        {/* Where the greeting can sit without covering Astra
                            depends on the crop. The portrait fills a phone
                            top-to-bottom, putting her face in the upper third,
                            so there it rides above the composer — the same slot
                            her captions use once she is speaking. On a wide
                            viewport the same image crops to a centred close-up,
                            so the bubble lifts out of flow to the open top-left
                            corner instead. One element, so still one <h1>. */}
                        {phase === "idle" && (
                            <div className="flex justify-center md:absolute md:left-4 md:top-20 md:block">
                                <GreetingBubble hidden={greetingHidden} />
                            </div>
                        )}
                        {/* Status line: free-reveal badge, closing note, errors. */}
                        {(phase === "ended" || (phase === "error" && errorMessage)) && (
                            <div className="flex justify-center">
                                <div className="max-w-md rounded-xl border border-primary/25 bg-black/55 p-3 text-center text-sm text-white/90 backdrop-blur-md">
                                    {phase === "ended"
                                        ? tAvatar("closingLine")
                                        : errorMessage}
                                    {((phase === "ended" && status && !status.eligible) ||
                                        session.errorCode === "NO_WISHES") && (
                                        <div className="mt-2">
                                            <Button asChild size="sm">
                                                <Link href="/stars">
                                                    {tAvatar("buyWishes")}
                                                </Link>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {user && status && !status.freeRevealUsed && phase === "idle" && (
                            <div className="flex justify-center">
                                <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-center text-xs text-amber-100">
                                    {tAvatar("freeRevealLabel")}
                                </span>
                            </div>
                        )}

                        <div ref={composerRef}>
                            <ImmerseComposer
                                value={question}
                                onChange={setQuestion}
                                onSubmit={submit}
                                isLoading={busy}
                                voice={voice}
                                interim={interim}
                            />
                        </div>

                        <QuickActions
                            showVoice={voice.supported}
                            onAskByVoice={voice.start}
                            onTrySample={trySample}
                        />

                        <CategoryTiles onPick={prefill} />

                        <TryAskingChips onPick={prefill} />

                        <ScrollCue targetId={EXPLORE_ID} />
                    </div>
                </div>
            </section>

            <ExploreSection
                id={EXPLORE_ID}
                transcript={session.transcript}
                onPick={prefill}
            />

            <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{tAvatar("gateTitle")}</DialogTitle>
                        <DialogDescription>{tAvatar("gateBody")}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:justify-center">
                        <Button asChild>
                            <Link href="/signin">{tAvatar("signIn")}</Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/signup">{tAvatar("signUp")}</Link>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
