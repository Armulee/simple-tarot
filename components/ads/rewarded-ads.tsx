"use client"

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Play, CheckCircle, Clock, Sparkles, Zap } from "lucide-react"
import { useTranslations } from "next-intl"
// AdMob / GAM removed for now; using simulated progress only

interface Star {
    id: number
    size: "1px" | "2px" | "3px"
    top: string
    left: string
    animation: string
    duration: string
    color: string
}

const generateRandomStars = (count: number = 60): Star[] => {
    const animations = [
        "animate-pulse",
        "animate-bounce",
        "animate-ping",
        "animate-spin",
    ]
    const sizes: ("1px" | "2px" | "3px")[] = ["1px", "2px", "3px"]
    const colors = [
        "#ffffff",
        "#e0e7ff",
        "#c7d2fe",
        "#a5b4fc",
        "#818cf8",
        "#6366f1",
        "#8b5cf6",
        "#d946ef",
        "#f97316",
        "#fbbf24",
    ]
    const durations = [
        "2.0s",
        "2.5s",
        "3.0s",
        "3.5s",
        "4.0s",
        "4.5s",
        "5.0s",
        "5.5s",
        "6.0s",
        "6.5s",
        "7.0s",
    ]

    return Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        size: sizes[Math.floor(Math.random() * sizes.length)],
        top: `${Math.floor(Math.random() * 95) + 2}%`,
        left: `${Math.floor(Math.random() * 95) + 2}%`,
        animation: animations[Math.floor(Math.random() * animations.length)],
        duration: durations[Math.floor(Math.random() * durations.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
    }))
}

interface RewardedAdsProps {
    onAdCompleted: (interpretationData?: string) => void
    onAdSkipped?: () => void
    onAdError?: (error: string) => void
    onStartInterpretation?: () => void
    interpretationPromise?: Promise<string>
}

interface AdState {
    status: "loading" | "ready" | "playing" | "completed" | "error"
    watchTime: number
    progress: number
    error?: string
    interpretationReady: boolean
}

export default function RewardedAds({
    onAdCompleted,
    onAdSkipped,
    onStartInterpretation,
    interpretationPromise,
}: RewardedAdsProps) {
    const t = useTranslations("ReadingPage.optimizedRewardedAd")
    const [adState, setAdState] = useState<AdState>({
        status: "loading",
        watchTime: 0,
        progress: 0,
        interpretationReady: false,
    })
    const [mounted, setMounted] = useState(false)
    const [showSkipButton, setShowSkipButton] = useState(false)

    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const interpretationRef = useRef<string | null>(null)
    // no-op refs left for potential future integration
    const skipButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Generate cosmic stars for the background
    const stars = useMemo(
        () => (mounted ? generateRandomStars(60) : []),
        [mounted]
    )

    // Ensure component is mounted on client side
    useEffect(() => {
        setMounted(true)
    }, [])

    // Auto-complete when ad status becomes 'completed'
    useEffect(() => {
        if (adState.status === "completed") {
            // Small delay to show completion state briefly
            const autoCompleteTimeout = setTimeout(() => {
                onAdCompleted(interpretationRef.current || undefined)
            }, 1500) // 1.5 second delay to show completion state

            return () => clearTimeout(autoCompleteTimeout)
        }
    }, [adState.status, onAdCompleted])

    // Start interpretation fetching when component mounts
    useEffect(() => {
        if (interpretationPromise && onStartInterpretation) {
            onStartInterpretation()

            interpretationPromise
                .then((interpretation) => {
                    interpretationRef.current = interpretation
                    setAdState((prev) => ({
                        ...prev,
                        interpretationReady: true,
                    }))
                })
                .catch(() => {
                    console.error("Interpretation fetch failed")
                    setAdState((prev) => ({
                        ...prev,
                        interpretationReady: false,
                    }))
                })
        }
    }, [interpretationPromise, onStartInterpretation])

    // Helper placeholder (unused while real ads disabled)

    const handleRealAdComplete = useCallback(() => {
        setAdState((prev) => ({
            ...prev,
            status: "completed",
            progress: 100,
        }))
        onAdCompleted(interpretationRef.current || undefined)
    }, [onAdCompleted])

    const handleAdSkip = useCallback(() => {
        onAdSkipped?.()
    }, [onAdSkipped])

    // Simulated ad flow (30s dumb progress)
    const fallbackToSimulatedAd = useCallback(() => {
        if (skipButtonTimeoutRef.current) {
            clearTimeout(skipButtonTimeoutRef.current)
        }
        setShowSkipButton(false)
        setAdState((prev) => ({
            ...prev,
            status: "ready",
        }))

        // Auto-start the simulated ad after a short delay
        setTimeout(() => {
            startAd()
        }, 500)
        // No additional fallback; simulated ad always runs
    }, [])

    const startAd = () => {
        setAdState((prev) => ({
            ...prev,
            status: "playing",
        }))

        // Start progress tracking for exactly 30s
        intervalRef.current = setInterval(() => {
            setAdState((prev) => {
                const newWatchTime = prev.watchTime + 1
                const progress = (newWatchTime / 30) * 100

                // Check if user has watched enough to get reward
                if (newWatchTime >= 30 && prev.status === "playing") {
                    clearInterval(intervalRef.current!)
                    return {
                        ...prev,
                        status: "completed",
                        watchTime: newWatchTime,
                        progress: 100,
                    }
                }

                return {
                    ...prev,
                    watchTime: newWatchTime,
                    progress,
                }
            })
        }, 1000)
    }

    // Initialize simulated ad only (no GAM)
    useEffect(() => {
        // No local persistence; always run the flow
        // Show skip button after 15 seconds
        skipButtonTimeoutRef.current = setTimeout(() => {
            setShowSkipButton(true)
        }, 15000)

        // Start simulated ad flow immediately
        fallbackToSimulatedAd()

        // Cleanup function
        return () => {
            // Clear timers
            if (skipButtonTimeoutRef.current) {
                clearTimeout(skipButtonTimeoutRef.current)
            }
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [
        onAdCompleted,
        handleAdSkip,
        handleRealAdComplete,
        fallbackToSimulatedAd,
    ])

    const handleSkip = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }
        onAdSkipped?.()
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [])

    const renderAdContent = () => {
        switch (adState.status) {
            case "loading":
                return (
                    <div className='flex flex-col items-center justify-center space-y-6 py-8'>
                        <div className='relative'>
                            <Loader2 className='w-12 h-12 text-primary animate-spin' />
                            <div className='absolute inset-0 w-12 h-12 border-2 border-primary/20 rounded-full animate-pulse' />
                        </div>
                        <div className='text-center space-y-2'>
                            <p className='text-muted-foreground font-medium'>
                                {t("loading")}
                            </p>
                            <p className='text-xs text-muted-foreground'>
                                Loading ad content...
                            </p>
                            <p className='text-xs text-muted-foreground'>
                                If this takes too long, we&apos;ll switch to a
                                fallback
                            </p>
                        </div>

                        {interpretationPromise && (
                            <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
                                <Zap className='w-4 h-4' />
                                <span>{t("preparingReading")}</span>
                            </div>
                        )}

                        {/* Manual fallback button after 15 seconds */}
                        {showSkipButton && (
                            <div className='mt-4 animate-in fade-in-50 duration-300'>
                                <Button
                                    onClick={fallbackToSimulatedAd}
                                    variant='outline'
                                    size='sm'
                                    className='text-xs bg-background/80 hover:bg-background border-primary/30 hover:border-primary/50'
                                >
                                    Skip to Ad (Fallback)
                                </Button>
                                <p className='text-xs text-muted-foreground mt-2'>
                                    Ad is taking longer than expected
                                </p>
                            </div>
                        )}
                    </div>
                )

            case "ready":
                return (
                    <div className='flex flex-col items-center justify-center space-y-6 py-8'>
                        <div className='w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center'>
                            <Play className='w-10 h-10 text-primary animate-pulse' />
                        </div>
                        <div className='text-center space-y-2'>
                            <h3 className='font-semibold text-lg'>
                                {t("ready.title")}
                            </h3>
                            <p className='text-muted-foreground'>
                                {t("ready.description")}
                            </p>
                            <p className='text-sm text-primary font-medium'>
                                Real ad will start automatically...
                            </p>
                            <Badge variant='outline' className='text-xs'>
                                <Sparkles className='w-3 h-3 mr-1' />
                                Google Ad Manager
                            </Badge>
                        </div>

                        {/* Show interpretation status */}
                        {interpretationPromise && (
                            <div className='flex items-center space-x-2 text-sm'>
                                {adState.interpretationReady ? (
                                    <>
                                        <CheckCircle className='w-4 h-4 text-green-500' />
                                        <span className='text-green-600'>
                                            {t("interpretationReady")}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Loader2 className='w-4 h-4 text-primary animate-spin' />
                                        <span className='text-primary'>
                                            {t("preparingInterpretation")}
                                        </span>
                                    </>
                                )}
                            </div>
                        )}

                        <Button
                            onClick={startAd}
                            className='px-8 py-3 bg-gradient-to-r from-[#15a6ff] to-[#b56cff] text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105'
                        >
                            {t("ready.button")}
                        </Button>
                    </div>
                )

            case "playing":
                return (
                    <div className='flex flex-col items-center justify-center space-y-6 py-8'>
                        <div className='w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center'>
                            <Clock className='w-10 h-10 text-accent' />
                        </div>
                        <div className='text-center space-y-2'>
                            <h3 className='font-semibold text-lg'>
                                {t("playing.title")}
                            </h3>
                            <p className='text-muted-foreground'>
                                {t("playing.timeRemaining", {
                                    seconds: Math.max(
                                        0,
                                        30 - adState.watchTime
                                    ),
                                })}
                            </p>
                        </div>

                        {/* Progress bar */}
                        <div className='w-full max-w-xs'>
                            <div className='flex justify-between text-sm text-muted-foreground mb-2'>
                                <span>{t("playing.progress")}</span>
                                <span>{Math.round(adState.progress)}%</span>
                            </div>
                            <div className='w-full bg-muted rounded-full h-2'>
                                <div
                                    className='bg-gradient-to-r from-[#15a6ff] to-[#b56cff] h-2 rounded-full transition-all duration-300'
                                    style={{ width: `${adState.progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Show interpretation status while playing */}
                        {interpretationPromise && (
                            <div className='flex items-center space-x-2 text-sm'>
                                {adState.interpretationReady ? (
                                    <>
                                        <CheckCircle className='w-4 h-4 text-green-500' />
                                        <span className='text-green-600'>
                                            {t("interpretationReady")}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Loader2 className='w-4 h-4 text-primary animate-spin' />
                                        <span className='text-primary'>
                                            {t("preparingInterpretation")}
                                        </span>
                                    </>
                                )}
                            </div>
                        )}

                        <div className='flex gap-3'>
                            <Button
                                onClick={handleSkip}
                                variant='outline'
                                className='px-6'
                            >
                                {t("playing.skip")}
                            </Button>
                        </div>
                    </div>
                )

            case "completed":
                return (
                    <div className='flex flex-col items-center justify-center space-y-6 py-8'>
                        <div className='w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center'>
                            <CheckCircle className='w-10 h-10 text-green-500' />
                        </div>
                        <div className='text-center space-y-2'>
                            <h3 className='font-semibold text-lg text-green-600'>
                                {t("completed.title")}
                            </h3>
                            <p className='text-muted-foreground'>
                                {t("completed.description")}
                            </p>
                        </div>

                        {/* Show interpretation status */}
                        {interpretationPromise && (
                            <div className='flex items-center space-x-2 text-sm'>
                                {adState.interpretationReady ? (
                                    <>
                                        <CheckCircle className='w-4 h-4 text-green-500' />
                                        <span className='text-green-600'>
                                            {t("interpretationReady")}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Loader2 className='w-4 h-4 text-primary animate-spin' />
                                        <span className='text-primary'>
                                            {t("preparingInterpretation")}
                                        </span>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Auto-completion message */}
                        <div className='text-center space-y-2'>
                            <div className='flex items-center justify-center space-x-2'>
                                <Loader2 className='w-4 h-4 text-primary animate-spin' />
                                <span className='text-sm text-muted-foreground'>
                                    Preparing your interpretation...
                                </span>
                            </div>
                            <p className='text-xs text-muted-foreground'>
                                This will close automatically in a moment
                            </p>
                        </div>
                    </div>
                )

            case "error":
                return (
                    <div className='flex flex-col items-center justify-center space-y-4 py-8'>
                        <div className='w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center'>
                            <Sparkles className='w-10 h-10 text-destructive' />
                        </div>
                        <div className='text-center space-y-2'>
                            <h3 className='font-semibold text-lg text-destructive'>
                                {t("error.title")}
                            </h3>
                            <p className='text-muted-foreground'>
                                {adState.error}
                            </p>
                        </div>
                        <div className='flex gap-3'>
                            <Button
                                onClick={() => window.location.reload()}
                                variant='outline'
                            >
                                {t("error.retry")}
                            </Button>
                            <Button onClick={onAdSkipped} variant='default'>
                                {t("error.skip")}
                            </Button>
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <div className='fixed inset-0 z-[100] flex items-center justify-center p-4'>
            {/* Enhanced Overlay with Cosmic Stars - Fully Opaque Background */}
            <div className='absolute inset-0 bg-gradient-to-br from-black via-purple-900 to-black'>
                {/* Cosmic Stars Background */}
                <div className='absolute inset-0 pointer-events-none'>
                    {stars.map((star) => (
                        <div
                            key={star.id}
                            className={`absolute rounded-full pointer-events-none ${star.animation}`}
                            style={{
                                width: star.size,
                                height: star.size,
                                backgroundColor: star.color,
                                top: star.top,
                                left: star.left,
                                animationDuration: star.duration,
                                boxShadow: `0 0 ${star.size} ${star.color}`,
                            }}
                        />
                    ))}
                </div>

                {/* Cosmic gradient overlays */}
                <div className='absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5' />
                <div className='absolute inset-0 bg-gradient-to-tr from-transparent via-indigo-500/3 to-transparent' />
            </div>

            {/* Rewarded Ads Card */}
            <Card className='relative z-[110] w-full max-w-md mx-auto border-0 overflow-hidden bg-gradient-to-br from-background/95 via-background/90 to-background/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl'>
                {/* Enhanced Background Effects */}
                <div className='absolute inset-0 pointer-events-none'>
                    {/* Cosmic gradient backgrounds */}
                    <div className='absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10' />
                    <div className='absolute inset-0 bg-gradient-to-tr from-transparent via-blue-500/5 to-transparent' />

                    {/* Floating cosmic orbs */}
                    <div className='absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-x-20 -translate-y-20 animate-pulse' />
                    <div
                        className='absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-br from-accent/20 to-transparent rounded-full blur-3xl translate-x-20 translate-y-20 animate-pulse'
                        style={{ animationDelay: "1s" }}
                    />

                    {/* Sparkle effects */}
                    <div
                        className='absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full animate-ping'
                        style={{ animationDelay: "0.5s" }}
                    />
                    <div
                        className='absolute top-3/4 right-1/4 w-1 h-1 bg-accent rounded-full animate-ping'
                        style={{ animationDelay: "1.5s" }}
                    />
                    <div
                        className='absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-white rounded-full animate-ping'
                        style={{ animationDelay: "2s" }}
                    />
                </div>

                <div className='relative z-10 p-6'>
                    {/* Header */}
                    <div className='text-center mb-6'>
                        <div className='flex items-center justify-center space-x-2 mb-2'>
                            <Sparkles className='w-5 h-5 text-primary' />
                            <h2 className='font-serif font-bold text-xl'>
                                {t("title")}
                            </h2>
                            <Sparkles className='w-5 h-5 text-primary' />
                        </div>
                        <p className='text-muted-foreground'>{t("subtitle")}</p>
                    </div>

                    {/* Ad content */}
                    <div className='min-h-[300px]'>{renderAdContent()}</div>

                    {/* Footer info */}
                    <div className='mt-6 pt-4 border-t border-border/20'>
                        <div className='flex items-center justify-center space-x-2 text-sm text-muted-foreground'>
                            <Badge variant='secondary' className='text-xs'>
                                {t("reward")}
                            </Badge>
                            {interpretationPromise && (
                                <Badge variant='outline' className='text-xs'>
                                    {t("optimized")}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}
