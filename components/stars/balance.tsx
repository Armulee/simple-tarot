"use client"

import { Star } from "lucide-react"
import { Clock } from "lucide-react"
import { useStars } from "@/contexts/stars-context"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import StarCard from "../star-card"
import { useTranslations } from "next-intl"

export default function StarsBalance() {
    const { stars, nextRefillAt, refillCap } = useStars()
    const { user } = useAuth()
    const t = useTranslations()

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
        <StarCard>
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
                            {t("StarsBalance.available")}
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
                            <span>{t("StarsBalance.nextRefill")}</span>
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
                                t("StarsBalance.autoRefill", { cap: refillCap })
                            ) : (
                                <>
                                    <span className='text-gray-400'>
                                        {t("StarsBalance.anonymousPrefix")}
                                    </span>{" "}
                                    {t("StarsBalance.anonymousRefill")}
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </StarCard>
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
