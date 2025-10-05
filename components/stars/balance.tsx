"use client"

import { Card } from "../ui/card"
import { Star } from "lucide-react"
import { Clock } from "lucide-react"
import { useStars } from "@/contexts/stars-context"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/hooks/use-auth"

export default function StarsBalance() {
    const { stars, nextRefillAt, refillCap } = useStars()
    const { user } = useAuth()

    const [now, setNow] = useState<number>(Date.now())
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(id)
    }, [])

    const nextIn = useMemo(
        () => formatRelativeTime(nextRefillAt, now),
        [nextRefillAt, now]
    )

    const remainingMs = Math.max(0, (nextRefillAt ?? 0) - now)
    const stepMs = user
        ? 2 * 60 * 60 * 1000
        : (() => {
              const offsetMs = 7 * 60 * 60 * 1000
              const bkkNow = new Date(now + offsetMs)
              const bkkMidnight = new Date(bkkNow)
              bkkMidnight.setUTCHours(0, 0, 0, 0)
              const bkkNextMidnight = new Date(bkkNow)
              bkkNextMidnight.setUTCHours(24, 0, 0, 0)
              const start =
                  bkkNow.getTime() < bkkMidnight.getTime()
                      ? bkkMidnight.getTime()
                      : bkkMidnight.getTime()
              const end = bkkNextMidnight.getTime()
              return Math.max(1, end - start)
          })()
    const progress = Math.min(
        100,
        Math.max(0, 100 - (remainingMs / stepMs) * 100)
    )
    return (
        <Card className='group relative overflow-hidden border border-yellow-400/30 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(234,179,8,0.4)] hover:shadow-[0_25px_80px_-25px_rgba(234,179,8,0.5)] transition-all duration-500 px-8 py-8'>
            {/* Enhanced Deep-space stars background */}
            <div className='pointer-events-none absolute inset-0 opacity-60'>
                <div className='cosmic-stars-layer-3' />
                <div className='cosmic-stars-layer-4' />
                <div className='cosmic-stars-layer-5' />
                <div className='cosmic-stars-layer-6' />
            </div>

            {/* Enhanced Golden aura effects */}
            <div className='pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-yellow-300/30 via-yellow-500/20 to-transparent blur-3xl animate-pulse' />
            <div className='pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-gradient-to-tl from-yellow-400/25 via-yellow-600/15 to-transparent blur-[120px] animate-pulse delay-1000' />
            <div className='pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-gradient-to-r from-amber-400/15 via-yellow-500/10 to-orange-500/15 blur-2xl animate-pulse delay-2000' />

            <div className='relative flex flex-col items-center text-center gap-6'>
                {/* Enhanced Balance Display */}
                <div className='flex items-center gap-6 text-yellow-300'>
                    <div className='relative'>
                        <div className='h-16 w-16 rounded-full bg-gradient-to-r from-yellow-400/40 to-yellow-600/40 border-2 border-yellow-500/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300'>
                            <Star
                                className='w-8 h-8 animate-spin-slow'
                                fill='currentColor'
                            />
                        </div>
                        {/* Orbiting particles */}
                        <div className='absolute -top-2 -right-2 w-4 h-4 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 animate-ping' />
                        <div className='absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-gradient-to-r from-yellow-300 to-amber-400 animate-pulse' />
                    </div>
                    <div className='text-left'>
                        <p className='text-xs text-gray-400 mb-1'>
                            Stars available
                        </p>
                        <p className='text-5xl md:text-6xl font-bold text-white tracking-tight bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent'>
                            {stars}
                        </p>
                    </div>
                </div>

                {/* Enhanced Progress Section */}
                <div className='w-full max-w-2xl space-y-4'>
                    <div className='flex items-center justify-center gap-3 text-sm text-gray-300'>
                        <div className='flex items-center gap-2'>
                            <Clock className='w-5 h-5 text-yellow-400' />
                            <span>Next refill</span>
                        </div>
                        <div className='px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400/20 to-amber-500/20 border border-yellow-500/30'>
                            <span className='text-white font-bold font-mono'>
                                {nextIn}
                            </span>
                        </div>
                    </div>

                    {/* Enhanced Progress Bar */}
                    <div className='relative h-3 w-full rounded-full bg-gradient-to-r from-gray-800/50 to-gray-700/50 overflow-hidden border border-gray-600/30'>
                        <div
                            className='h-full bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 rounded-full transition-all duration-1000 ease-out relative overflow-hidden'
                            style={{ width: `${progress}%` }}
                        >
                            {/* Animated shine effect */}
                            <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse' />
                        </div>
                        {/* Progress glow */}
                        <div
                            className='absolute top-0 h-full bg-gradient-to-r from-yellow-400/50 via-amber-500/50 to-orange-500/50 blur-sm transition-all duration-1000 ease-out'
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Enhanced Description */}
                    <div className='p-4 rounded-xl bg-gradient-to-r from-white/5 to-white/10 border border-white/10 backdrop-blur-sm'>
                        <p className='text-sm text-gray-300 leading-relaxed'>
                            {user ? (
                                <>
                                    Auto-refills by 1 star every 2 hours (up to{" "}
                                    {refillCap} stars).
                                </>
                            ) : (
                                <>
                                    <span className='text-gray-400'>
                                        Anonymous User:
                                    </span>{" "}
                                    Refills to 5 stars at midnight (UTC+7).
                                    Countdown shows time until next cosmic
                                    alignment.
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </Card>
    )
}

function formatRelativeTime(
    timestamp: number | null | undefined,
    nowMs: number
): string {
    if (!timestamp) return "—"
    const ms = Math.max(0, timestamp - nowMs)
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    const pad = (n: number) => n.toString().padStart(2, "0")
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}
