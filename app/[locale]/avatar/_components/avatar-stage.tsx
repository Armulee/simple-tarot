"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { AvatarPhase } from "./use-avatar-session"
import { CountdownTimer } from "./countdown-timer"

/**
 * Full-bleed avatar "stage" that fills the page beneath the navbar.
 *
 * On arrival it plays the short character intro clip IMMEDIATELY (looping as
 * the idle/greeting state) so the page is never blank. When a live session
 * connects, the live WebRTC <video> fades in over the idle clip. Card reveal,
 * captions, and the paid countdown are overlaid on top.
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
    const introSrc = process.env.NEXT_PUBLIC_AVATAR_INTRO ?? "/avatar/intro.mp4"

    const shuffling = phase === "shuffling"
    const showCard =
        (phase === "revealing" || phase === "speaking" || phase === "live") && cardName

    return (
        <div className="absolute inset-0 overflow-hidden bg-[#05050f]">
            {/* Idle / greeting clip — plays once on arrival, then freezes on its
                last frame as the idle pose (a non-looping <video> holds the
                final frame). */}
            <video
                src={introSrc}
                autoPlay
                muted
                playsInline
                className={cn(
                    "absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700",
                    connected ? "opacity-0" : "opacity-100",
                )}
            />

            {/* Live WebRTC video — fades in once a session connects. */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className={cn(
                    "absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700",
                    connected ? "opacity-100" : "opacity-0",
                )}
            />

            {/* Subtle vignette so overlaid text stays readable. */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

            {/* Shuffling overlay — masks the 1-3s connection latency as suspense. */}
            {shuffling && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/55 backdrop-blur-sm">
                    <ShuffleAnimation />
                    <p className="font-medium text-white/90">{t("shuffling")}</p>
                </div>
            )}

            {/* Card flip reveal. */}
            {showCard && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 animate-[cardFlip_0.7s_ease-out]">
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
                <div className="absolute inset-x-0 bottom-0 p-4 pt-12">
                    <p className="mx-auto max-h-40 max-w-2xl overflow-y-auto text-center text-base leading-relaxed text-white/95 drop-shadow-lg">
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
