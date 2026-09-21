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
import { useStarConsent } from "@/components/star-consent"
import { useVoiceInput } from "@/hooks/use-voice-input"

import { useAvatarSession } from "./use-avatar-session"
import { AvatarStage } from "./stage/avatar-stage"
import { ImmerseChrome } from "./immerse-chrome"
import { GreetingBubble } from "./greeting-bubble"
import { ImmerseComposer } from "./immerse-composer"
import { TryAskingChips } from "./try-asking-chips"
import { ScrollCue } from "./scroll-cue"
import { CookiesBanner } from "@/components/cookies-banner"
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
    const tAvatar = useTranslations("Avatar")
    const locale = useLocale()
    const { user, loading: authLoading } = useAuth()
    const { cookieBannerVisible } = useStarConsent()
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

    // A nav link to /#about lands here before the explore section has
    // rendered, so the browser's own hash scroll finds nothing. Do it once
    // mounted instead.
    useEffect(() => {
        if (window.location.hash !== "#about") return
        const id = window.setTimeout(() => {
            document
                .getElementById("about")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 120)
        return () => window.clearTimeout(id)
    }, [])

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

    // The greeting steps aside once Astra is actually talking — and while the
    // cookie banner is up, because that inflates the bottom stack enough to
    // collide with the bubble on short viewports (measured: -22px of clearance
    // at 500x757, -104px at 360x640, versus 118-322px once it is dismissed).
    // Hidden rather than unmounted so the page keeps its <h1>.
    const greetingHidden =
        cookieBannerVisible || (phase !== "idle" && phase !== "error")

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
                    {/* The tail has to land on Astra's chin, and where that
                        falls moves with the viewport: the stage is
                        `object-cover object-top`, so the artwork is scaled by
                        max(vw/941, vh/1672) and anchored at the top. Her chin
                        is y=502 in the 941x1672 source — measured through the
                        jaw on the side her hand is not resting against, since
                        the hand hangs lower than her face — so 53.35% of its
                        width and 30.02% of its height. The same max() in CSS
                        tracks her at any ratio, where a fixed percentage only
                        ever matches one. The +10px is the tail itself: a
                        14px square rotated 45deg pokes ~9.9px past the bubble's
                        edge, and it is the tip that should meet her chin.

                        Above md the landscape artwork is in play and the bubble
                        sits clear in the open top-left corner. */}
                    {phase === "idle" && (
                        <div className="absolute left-4 top-[calc(max(53.35vw,30.02dvh)+10px)] md:top-24">
                            <GreetingBubble hidden={greetingHidden} />
                        </div>
                    )}

                    <div className="flex-1" />

                    <div className="mx-auto w-full max-w-xl space-y-3">
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

                        <TryAskingChips onPick={prefill} />

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

                        {/* Home renders its own inline copy; the layout-level
                            banner steps aside on this route. */}
                        <CookiesBanner inline />

                        <ScrollCue targetId={EXPLORE_ID} />
                    </div>
                </div>
            </section>

            <ExploreSection id={EXPLORE_ID} transcript={session.transcript} />

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
