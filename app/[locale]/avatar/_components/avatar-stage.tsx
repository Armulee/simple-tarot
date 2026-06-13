"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { AvatarPhase } from "./use-avatar-session"
import { CountdownTimer } from "./countdown-timer"

/**
 * The avatar "screen": a portrait stage that shows an idle poster IMMEDIATELY
 * (so entering /avatar never shows a blank loading screen) and swaps to the
 * live WebRTC <video> once a session connects.
 *
 * The poster can be a still/looping idle clip provided via
 * NEXT_PUBLIC_AVATAR_POSTER; otherwise a CSS-only mystical placeholder renders
 * so there's always something on screen.
 */
export function AvatarStage({
    videoRef,
    phase,
    connected,
    caption,
    cardName,
    cardReversed,
    remainingSeconds,
}: {
    videoRef: React.RefObject<HTMLVideoElement | null>
    phase: AvatarPhase
    connected: boolean
    caption: string
    cardName: string | null
    cardReversed: boolean
    remainingSeconds: number | null
}) {
    const t = useTranslations("Avatar")
    const poster = process.env.NEXT_PUBLIC_AVATAR_POSTER

    const shuffling = phase === "shuffling"
    const revealing = phase === "revealing"
    const showCard = (revealing || phase === "speaking" || phase === "live") && cardName

    return (
        <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-b from-[#0b0b1f] to-[#05050f] shadow-[0_0_60px_-15px_var(--primary)]">
            {/* Idle poster — always present underneath the live video. */}
            {poster ? (
                // Poster is an optional, operator-supplied URL (possibly remote);
                // a plain <img> avoids next/image remote-domain config here.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={poster}
                    alt={t("posterAlt")}
                    className={cn(
                        "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
                        connected ? "opacity-0" : "opacity-100",
                    )}
                />
            ) : (
                <IdlePlaceholder hidden={connected} />
            )}

            {/* Live WebRTC video. */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                // muted={false}: avatar voice must be audible; play() is triggered
                // from the user's tap so mobile autoplay-with-sound is allowed.
                className={cn(
                    "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
                    connected ? "opacity-100" : "opacity-0",
                )}
            />

            {/* Shuffling overlay — masks the 1-3s connection latency as suspense. */}
            {shuffling && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/55 backdrop-blur-sm">
                    <ShuffleAnimation />
                    <p className="font-medium text-white/90">{t("shuffling")}</p>
                </div>
            )}

            {/* Card flip reveal. */}
            {showCard && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 animate-[cardFlip_0.7s_ease-out]">
                    <div className="rounded-xl border border-amber-300/50 bg-gradient-to-b from-indigo-900/90 to-purple-950/90 px-4 py-2 text-center shadow-lg">
                        <span className="text-sm font-semibold text-amber-200">
                            {cardName}
                            {cardReversed ? ` · ${t("reversed")}` : ""}
                        </span>
                    </div>
                </div>
            )}

            {/* Caption of what the avatar is speaking. */}
            {caption && (phase === "speaking" || phase === "live" || phase === "ended") && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-10">
                    <p className="max-h-32 overflow-y-auto text-sm leading-relaxed text-white/95">
                        {caption}
                    </p>
                </div>
            )}

            {/* Paid countdown. */}
            {phase === "live" && remainingSeconds !== null && (
                <CountdownTimer seconds={remainingSeconds} />
            )}
        </div>
    )
}

function IdlePlaceholder({ hidden }: { hidden: boolean }) {
    const t = useTranslations("Avatar")
    return (
        <div
            className={cn(
                "absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-700",
                hidden ? "opacity-0" : "opacity-100",
            )}
            aria-label={t("posterAlt")}
        >
            {/* Soft mystical glow behind a crystal-ball motif. */}
            <div className="absolute h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute h-40 w-40 rounded-full bg-accent/30 blur-2xl" />
            <div className="relative h-32 w-32 animate-[breathe_4s_ease-in-out_infinite] rounded-full border border-amber-200/30 bg-gradient-to-br from-indigo-400/40 to-purple-700/40 shadow-[0_0_40px_-5px_var(--accent)]" />
            <p className="relative mt-6 px-6 text-center text-sm text-white/70">
                {t("idleHint")}
            </p>
        </div>
    )
}

function ShuffleAnimation() {
    return (
        <div className="relative h-20 w-16">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="absolute inset-0 rounded-lg border border-amber-300/50 bg-gradient-to-b from-indigo-800 to-purple-950 shadow-md"
                    style={{
                        animation: `shuffleCard 1.2s ease-in-out ${i * 0.18}s infinite`,
                    }}
                />
            ))}
        </div>
    )
}
