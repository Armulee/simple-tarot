"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useStars } from "@/contexts/stars-context"
import { Star, RefreshCw } from "lucide-react"
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

    return (
        <section className='relative z-10 max-w-2xl mx-auto px-6 py-10 space-y-6'>
            <h1 className='font-serif text-3xl font-bold text-white'>Your Stars</h1>
            <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                        <div className='h-10 w-10 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-500/30 flex items-center justify-center text-yellow-300'>
                            <Star className='w-5 h-5' fill='currentColor' />
                        </div>
                        <div>
                            <div className='text-sm text-muted-foreground'>Available</div>
                            <div className='text-2xl font-semibold text-white'>{stars}</div>
                        </div>
                    </div>
                    <div className='text-right'>
                        <div className='text-sm text-muted-foreground'>Next refill</div>
                        <div className='text-white font-medium'>{nextIn}</div>
                    </div>
                </div>
            </Card>

            <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20 space-y-3'>
                <h2 className='font-serif text-xl font-semibold text-white'>How to earn stars</h2>
                <ul className='list-disc list-inside text-sm text-muted-foreground space-y-1'>
                    <li>1 star refills every hour.</li>
                    <li>First-time registration bonus: +5 stars and refill capacity increases to 10.</li>
                    <li>Share a reading: +1 star.</li>
                    <li>Refer a friend: +5 stars for both you and your friend.</li>
                </ul>
            </Card>

            <div className='flex items-center gap-3'>
                <Button
                    type='button'
                    variant='outline'
                    className='rounded-full'
                    onClick={() => window.location.reload()}
                >
                    <RefreshCw className='w-4 h-4 mr-2' /> Refresh
                </Button>
            </div>
        </section>
    )
}

