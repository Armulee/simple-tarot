"use client"

import { useState } from "react"
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

    // The intro clip streams progressively (plays partial frames as it
    // downloads). `introBuffering` is true whenever playback is waiting for
    // more data; `introProgress` is how much of the clip has downloaded (0-100).
    const [introBuffering, setIntroBuffering] = useState(true)
    const [introProgress, setIntroProgress] = useState(0)

    const updateProgress = (video: HTMLVideoElement) => {
        if (video.duration > 0 && video.buffered.length > 0) {
            const loaded = video.buffered.end(video.buffered.length - 1)
            setIntroProgress(
                Math.min(100, Math.round((loaded / video.duration) * 100)),
            )
        }
    }

    const shuffling = phase === "shuffling"
    const showCard =
        (phase === "revealing" || phase === "speaking" || phase === "live") && cardName

    return (
        <div className="absolute inset-0 overflow-hidden bg-[#05050f]">
            {/* Idle / greeting clip — streams progressively: it starts playing
                the moment enough has downloaded, and shows a loading icon while
                it buffers the rest. Freezes on its last frame as the idle pose. */}
            <video
                src={introSrc}
                autoPlay
                muted
                playsInline
                preload="auto"
                onLoadStart={() => setIntroBuffering(true)}
                onWaiting={() => setIntroBuffering(true)}
                onStalled={() => setIntroBuffering(true)}
                onPlaying={() => setIntroBuffering(false)}
                onCanPlay={() => setIntroBuffering(false)}
                onEnded={() => setIntroBuffering(false)}
                onProgress={(e) => updateProgress(e.currentTarget)}
                onTimeUpdate={(e) => updateProgress(e.currentTarget)}
                onLoadedMetadata={(e) => updateProgress(e.currentTarget)}
                className={cn(
                    "absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700",
                    connected ? "opacity-0" : "opacity-100",
                )}
            />

            {/* Mystical download-progress loader while the intro clip streams.
                Hidden once it's fully loaded and playing. */}
            {introBuffering && introProgress < 100 && !connected && !shuffling && (
                <IntroLoader progress={introProgress} label={t("preparing")} />
            )}

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

/**
 * Mystical circular download-progress loader, matching the site's cosmic tone
 * (gold → periwinkle gradient ring, soft glow, a slowly turning celestial dashed
 * ring, and the percentage in the display serif).
 */
function IntroLoader({ progress, label }: { progress: number; label: string }) {
    const radius = 44
    const circumference = 2 * Math.PI * radius
    const clamped = Math.min(100, Math.max(0, progress))
    const offset = circumference - (clamped / 100) * circumference

    return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative flex flex-col items-center gap-5">
                {/* Soft cosmic glow. */}
                <div className="absolute -top-3 h-44 w-44 animate-pulse rounded-full bg-primary/25 blur-3xl" />
                <div className="absolute -top-3 h-28 w-28 rounded-full bg-amber-400/15 blur-2xl" />

                <div className="relative h-28 w-28">
                    {/* Slowly turning celestial dashed ring. */}
                    <svg
                        viewBox="0 0 100 100"
                        className="absolute inset-0 h-full w-full text-amber-200/30"
                        style={{ animation: "spin 9s linear infinite" }}
                    >
                        <circle
                            cx="50"
                            cy="50"
                            r="48"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="0.6"
                            strokeDasharray="1.5 6"
                            strokeLinecap="round"
                        />
                    </svg>

                    {/* Progress ring. */}
                    <svg
                        viewBox="0 0 100 100"
                        className="absolute inset-0 h-full w-full -rotate-90"
                    >
                        <defs>
                            <linearGradient
                                id="introProgressGrad"
                                x1="0%"
                                y1="0%"
                                x2="100%"
                                y2="100%"
                            >
                                <stop offset="0%" stopColor="#fcd34d" />
                                <stop offset="55%" stopColor="#c4b5fd" />
                                <stop offset="100%" stopColor="#818cf8" />
                            </linearGradient>
                        </defs>
                        <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth="4"
                        />
                        <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke="url(#introProgressGrad)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            style={{
                                transition: "stroke-dashoffset 0.4s ease-out",
                                filter: "drop-shadow(0 0 6px rgba(196,181,253,0.5))",
                            }}
                        />
                    </svg>

                    {/* Percentage. */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-playfair bg-gradient-to-b from-amber-200 to-violet-200 bg-clip-text text-2xl font-semibold tabular-nums text-transparent drop-shadow">
                            {Math.round(clamped)}%
                        </span>
                    </div>
                </div>

                {label && (
                    <p className="text-sm font-medium text-white/75 drop-shadow">
                        {label}
                    </p>
                )}
            </div>
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
