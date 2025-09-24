"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useStars } from "@/contexts/stars-context"
import { Star, RefreshCw, Clock, Gift, Share2, Users } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

function formatRelativeTime(timestamp: number | null | undefined): string {
    if (!timestamp) return "—"
    const ms = Math.max(0, timestamp - Date.now())
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    if (minutes <= 0 && seconds <= 0) return "now"
    if (minutes <= 0) return `${seconds}s`
    return `${minutes}m ${seconds}s`
}

export default function StarsPage() {
    const { stars, nextRefillAt } = useStars()

    const [now, setNow] = useState<number>(Date.now())
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(id)
    }, [])

    const nextIn = useMemo(() => formatRelativeTime(nextRefillAt), [nextRefillAt, now])

    const remainingMs = Math.max(0, (nextRefillAt ?? 0) - now)
    const hourMs = 60 * 60 * 1000
    const progress = Math.min(100, Math.max(0, 100 - (remainingMs / hourMs) * 100))

    return (
        <section className='relative z-10 max-w-4xl mx-auto px-6 py-10 space-y-8'>
            {/* Hero */}
            <Card className='relative overflow-hidden border-border/20 bg-gradient-to-br from-yellow-500/10 via-amber-500/10 to-orange-500/10 p-8'>
                <div className='absolute -top-10 -right-10 h-40 w-40 rounded-full bg-yellow-400/10 blur-3xl' />
                <div className='absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl' />

                <div className='relative flex flex-col items-center text-center gap-4'>
                    <div className='flex items-center gap-3 text-yellow-300'>
                        <div className='h-12 w-12 rounded-full bg-gradient-to-r from-yellow-400/30 to-yellow-600/30 border border-yellow-500/40 flex items-center justify-center'>
                            <Star className='w-6 h-6' fill='currentColor' />
                        </div>
                        <div>
                            <p className='text-sm text-muted-foreground'>Current Balance</p>
                            <p className='text-4xl font-bold text-white tracking-tight'>{stars}</p>
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
                        <p className='text-xs text-muted-foreground text-center'>Auto-refills by 1 star every hour.</p>
                    </div>

                    <div className='flex items-center justify-center gap-3'>
                        <Button
                            type='button'
                            variant='outline'
                            className='rounded-full'
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCw className='w-4 h-4 mr-2' /> Refresh
                        </Button>
                        <Link href='/'>
                            <Button type='button' className='rounded-full'>Start a Reading</Button>
                        </Link>
                    </div>
                </div>
            </Card>

            {/* Ways to earn */}
            <div className='space-y-4'>
                <h2 className='font-serif text-2xl font-semibold text-white text-center'>Ways to earn stars</h2>
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {/* Registration bonus */}
                    <Card className='p-5 bg-card/10 backdrop-blur-sm border-border/20'>
                        <div className='flex items-center gap-3 mb-3'>
                            <div className='h-10 w-10 rounded-full bg-emerald-400/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300'>
                                <Gift className='w-5 h-5' />
                            </div>
                            <div>
                                <h3 className='text-white font-medium'>First-time registration</h3>
                                <p className='text-xs text-muted-foreground'>+5 stars and refill increases to 10.</p>
                            </div>
                        </div>
                        <Link href='/signup'>
                            <Button className='w-full rounded-full'>Create an account</Button>
                        </Link>
                    </Card>

                    {/* Share reading */}
                    <Card className='p-5 bg-card/10 backdrop-blur-sm border-border/20'>
                        <div className='flex items-center gap-3 mb-3'>
                            <div className='h-10 w-10 rounded-full bg-cyan-400/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300'>
                                <Share2 className='w-5 h-5' />
                            </div>
                            <div>
                                <h3 className='text-white font-medium'>Share a reading</h3>
                                <p className='text-xs text-muted-foreground'>Post or send your reading to earn +1 star.</p>
                            </div>
                        </div>
                        <Link href='/'>
                            <Button variant='outline' className='w-full rounded-full'>Go to readings</Button>
                        </Link>
                    </Card>

                    {/* Refer friend */}
                    <Card className='p-5 bg-card/10 backdrop-blur-sm border-border/20'>
                        <div className='flex items-center gap-3 mb-3'>
                            <div className='h-10 w-10 rounded-full bg-purple-400/15 border border-purple-500/30 flex items-center justify-center text-purple-300'>
                                <Users className='w-5 h-5' />
                            </div>
                            <div>
                                <h3 className='text-white font-medium'>Refer a friend</h3>
                                <p className='text-xs text-muted-foreground'>You and your friend each get +5 stars.</p>
                            </div>
                        </div>
                        <Link href='/contact'>
                            <Button variant='outline' className='w-full rounded-full'>Get referral link</Button>
                        </Link>
                    </Card>
                </div>
            </div>
        </section>
    )
}

