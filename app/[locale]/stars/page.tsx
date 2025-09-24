"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useStars } from "@/contexts/stars-context"
import { Star, RefreshCw } from "lucide-react"
import { useMemo } from "react"

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
    const { stars, nextRefillAt, addStars } = useStars()

    const nextIn = useMemo(() => formatRelativeTime(nextRefillAt), [nextRefillAt])

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
                            <div className='text-2xl font-semibold text-white'>{stars} / 5</div>
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
                    <li>1 star refills every hour (up to 5).</li>
                    <li>Come back daily to keep your balance topped up.</li>
                    <li>Share your readings with friends.</li>
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

