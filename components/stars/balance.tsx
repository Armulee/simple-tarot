"use client"
import { Card } from "../ui/card"
import { Star } from "lucide-react"
import { Clock } from "lucide-react"
import { Users } from "lucide-react"
import { Button } from "../ui/button"
import Link from "next/link"
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
        <Card className='relative overflow-hidden border border-yellow-400/20 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(234,179,8,0.35)] px-8 py-4'>
            {/* Deep-space stars background */}
            <div className='pointer-events-none absolute inset-0 opacity-40'>
                <div className='cosmic-stars-layer-3' />
                <div className='cosmic-stars-layer-4' />
                <div className='cosmic-stars-layer-5' />
            </div>
            {/* Golden aura behind card */}
            <div className='pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-br from-yellow-300/25 via-yellow-500/15 to-transparent blur-3xl' />
            <div className='pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-gradient-to-tl from-yellow-400/20 via-yellow-600/10 to-transparent blur-[100px]' />

            <div className='relative flex flex-col items-center text-center gap-3'>
                <div className='flex items-center gap-3 text-yellow-300'>
                    <div className='h-12 w-12 rounded-full bg-gradient-to-r from-yellow-400/30 to-yellow-600/30 border border-yellow-500/40 flex items-center justify-center'>
                        <Star className='w-6 h-6' fill='currentColor' />
                    </div>
                    <div>
                        <p className='text-sm text-muted-foreground'>
                            Current Balance
                        </p>
                        <p className='text-4xl font-bold text-white tracking-tight'>
                            {stars}
                        </p>
                    </div>
                </div>

                <div className='w-full max-w-xl space-y-2'>
                    <div className='flex items-center justify-center gap-2 text-sm text-muted-foreground'>
                        <Clock className='w-4 h-4' />
                        <span>Next refill in</span>
                        <span className='text-white font-medium'>{nextIn}</span>
                    </div>
                    <div className='h-2 w-full rounded-full bg-white/10 overflow-hidden'>
                        <div
                            className='h-full bg-gradient-to-r from-yellow-400/70 to-yellow-600/70'
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className='text-xs text-muted-foreground text-center'>
                        {user ? (
                            <>
                                Auto-refills by 1 star every 2 hours (up to{" "}
                                {refillCap}).
                            </>
                        ) : (
                            <>
                                Refills to 5 at 00:00 (UTC+7). Countdown shows
                                time until next midnight.
                            </>
                        )}
                    </p>
                </div>

                <div className='flex items-center justify-center'>
                    {user ? (
                        <></>
                    ) : (
                        <Link href='/signin'>
                            <Button
                                type='button'
                                className='rounded-full px-6 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border border-yellow-500/40 hover:from-yellow-300 hover:to-yellow-500 shadow-[0_12px_30px_-10px_rgba(234,179,8,0.8)] hover:shadow-[0_18px_40px_-12px_rgba(234,179,8,0.9)] transition-shadow flex items-center gap-2'
                            >
                                <Users className='w-4 h-4' />
                                <span className='font-semibold'>Sign in</span>
                            </Button>
                        </Link>
                    )}
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
