"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Sparkles, Stars } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useAvatarSession } from "./use-avatar-session"
import { AvatarStage } from "./avatar-stage"
import { Composer, type ComposerMode } from "./composer"
import { ResultCard } from "./result-card"

/**
 * /avatar experience. Logged-in only (auth gate). Default mode is set by the
 * user's entitlement status, but the composer toggle lets them override it.
 */
export function AvatarExperience() {
    const t = useTranslations("Avatar")
    const { user, loading: authLoading } = useAuth()
    const session = useAvatarSession()
    const [mode, setMode] = useState<ComposerMode>("avatar")
    const [modePinned, setModePinned] = useState(false)

    const { status, phase } = session

    // Default-mode logic: eligible (free not used OR has wishes) → avatar mode;
    // otherwise fall back to chat. Only sets the STARTING mode; the user's
    // explicit toggle (modePinned) always wins.
    useEffect(() => {
        if (!status || modePinned) return
        setMode(status.eligible ? "avatar" : "chat")
    }, [status, modePinned])

    // When wishes run out mid-flow, downgrade in-character (never silently).
    useEffect(() => {
        if (phase !== "ended" || !status) return
        if (!status.eligible && !modePinned) {
            toast(t("downgrade"), { icon: "🔮", duration: 6000 })
            setMode("chat")
        }
    }, [phase, status, modePinned, t])

    const onModeChange = (next: ComposerMode) => {
        setMode(next)
        setModePinned(true)
    }

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

    // --- Auth gate -------------------------------------------------------
    if (!authLoading && !user) {
        return (
            <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
                <div className="rounded-full bg-primary/15 p-4">
                    <Stars className="h-8 w-8 text-amber-300" />
                </div>
                <h1 className="text-2xl font-semibold text-foreground">{t("gateTitle")}</h1>
                <p className="text-muted-foreground">{t("gateBody")}</p>
                <div className="flex gap-3">
                    <Button asChild>
                        <Link href="/signin">{t("signIn")}</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/signup">{t("signUp")}</Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col gap-4 px-4 py-6">
            <header className="text-center">
                <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold text-foreground">
                    <Sparkles className="h-5 w-5 text-amber-300" />
                    {t("title")}
                </h1>
                {status && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {status.freeRevealUsed
                            ? t("wishBalance", { count: status.wishBalance })
                            : t("freeAvailable")}
                    </p>
                )}
            </header>

            {mode === "avatar" ? (
                <>
                    <AvatarStage
                        videoRef={session.videoRef}
                        phase={session.phase}
                        connected={session.connected}
                        caption={session.caption}
                        cardName={session.card?.name ?? null}
                        cardReversed={session.card?.isReversed ?? false}
                        remainingSeconds={session.remainingSeconds}
                    />

                    {phase === "error" && errorMessage && (
                        <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-center text-sm text-amber-100">
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

                    {phase === "ended" && (
                        <div className="rounded-xl border border-primary/25 bg-card/60 p-4 text-center">
                            <p className="text-sm text-foreground/90">{t("closingLine")}</p>
                            {status && !status.eligible && (
                                <Button asChild size="sm" className="mt-3">
                                    <Link href="/stars">{t("buyWishes")}</Link>
                                </Button>
                            )}
                        </div>
                    )}

                    <Composer
                        mode={mode}
                        onModeChange={onModeChange}
                        onSubmit={session.submit}
                        busy={busy}
                        disabled={busy}
                        showFreeLabel={showFreeLabel}
                    />
                </>
            ) : (
                <ChatFallback />
            )}

            {/* Persisted transcript — re-readable / shareable result cards. */}
            {session.transcript.length > 0 && (
                <section className="space-y-3">
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

/**
 * In-character chat fallback. The full conversational chat lives on the home
 * route; here we present the fortune teller's text-mode invitation and a link
 * into it, rather than duplicating the large chat component.
 */
function ChatFallback() {
    const t = useTranslations("Avatar")
    return (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-primary/25 bg-card/60 p-6 text-center">
            <div className="rounded-full bg-primary/15 p-3">
                <Sparkles className="h-6 w-6 text-amber-300" />
            </div>
            <p className="text-sm text-foreground/90">{t("chatFallbackBody")}</p>
            <Button asChild>
                <Link href="/">{t("openChat")}</Link>
            </Button>
        </div>
    )
}
