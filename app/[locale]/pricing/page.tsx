"use client"
import Link from "next/link"
import { useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, Crown, Gift } from "lucide-react"
type Pack = {
    id: string
    priceUsd: number
    stars: number
    bonus: number
    label?: string
}

export default function PricingPage() {
    const { user } = useAuth()

    const packs = useMemo<Pack[]>(() => {
        const basePerDollar = 60
        return [
            { id: "pack-1", priceUsd: 1, stars: 60, bonus: 0 },
            { id: "pack-3", priceUsd: 3, stars: 200, bonus: 200 - 3 * basePerDollar, label: "Popular" },
            { id: "pack-5", priceUsd: 5, stars: 350, bonus: 350 - 5 * basePerDollar, label: "Best value" },
        ]
    }, [])

    return (
        <section className='relative z-10 max-w-5xl mx-auto px-6 py-12 space-y-10'>
            {/* Hero */}
            <div className='text-center space-y-3'>
                <h1 className='font-serif font-bold text-4xl md:text-5xl'>
                    Choose your stars
                </h1>
                <p className='text-muted-foreground text-balance'>
                    $1 = 60 stars. Larger packs include bonus stars. Cancel the monthly plan anytime.
                </p>
            </div>

            {/* Packs */}
            <div className='grid md:grid-cols-3 gap-6'>
                {packs.map((p) => (
                    <Card key={p.id} className='relative p-6 bg-card/10 border-border/20 hover:bg-card/20 transition'>
                        {p.label && (
                            <div className='absolute -top-2 right-4 text-xs px-2 py-1 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-500/30 text-yellow-300'>
                                {p.label}
                            </div>
                        )}
                        <div className='space-y-4 text-center'>
                            <div className='w-12 h-12 mx-auto rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center'>
                                <Star className='w-6 h-6 text-yellow-300' />
                            </div>
                            <div className='space-y-1'>
                                <div className='text-3xl font-bold'>${p.priceUsd.toFixed(0)}</div>
                                <div className='text-sm text-muted-foreground'>one-time</div>
                            </div>
                            <div className='space-y-1'>
                                <div className='text-xl font-semibold'>{p.stars} stars</div>
                                {p.bonus > 0 && (
                                    <div className='text-xs inline-flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/30 text-emerald-300'>
                                        <Gift className='w-3.5 h-3.5' />
                                        +{p.bonus} bonus
                                    </div>
                                )}
                            </div>
                            <div>
                                {user ? (
                                    <Link href={`/stars/purchase?pack=${encodeURIComponent(p.id)}`}>
                                        <Button className='w-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border border-yellow-500/40 hover:from-yellow-300 hover:to-yellow-500'>
                                            Purchase
                                        </Button>
                                    </Link>
                                ) : (
                                    <Link href={`/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
                                        <Button className='w-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border border-yellow-500/40 hover:from-yellow-300 hover:to-yellow-500'>
                                            Sign in to purchase
                                        </Button>
                                    </Link>
                                )}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                                Secure checkout. Stars deliver instantly after payment.
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Subscription */}
            <Card className='p-6 bg-card/10 border-border/20 hover:bg-card/20 transition'>
                <div className='grid md:grid-cols-3 gap-6 items-center'>
                    <div className='order-2 md:order-1 space-y-2'>
                        <div className='inline-flex items-center gap-2 text-sm px-2 py-1 rounded-full bg-violet-400/15 border border-violet-400/30 text-violet-300'>
                            <Crown className='w-4 h-4' />
                            Monthly subscription
                        </div>
                        <div className='text-3xl font-bold'>$9.99</div>
                        <div className='text-sm text-muted-foreground'>per month · auto-renew · cancel anytime</div>
                    </div>
                    <div className='order-1 md:order-2 text-center'>
                        <div className='w-16 h-16 mx-auto rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center'>
                            <Crown className='w-8 h-8 text-violet-300' />
                        </div>
                    </div>
                    <div className='order-3 space-y-3'>
                        <ul className='text-sm text-muted-foreground space-y-2'>
                            <li>Support the app and future features</li>
                            <li>Bonus stars and perks (details soon)</li>
                            <li>Priority updates and improvements</li>
                        </ul>
                        {user ? (
                            <Link href='/pricing/subscribe'>
                                <Button className='w-full rounded-full'>Subscribe $9.99/month</Button>
                            </Link>
                        ) : (
                            <Link href={`/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
                                <Button className='w-full rounded-full'>Sign in to subscribe</Button>
                            </Link>
                        )}
                    </div>
                </div>
            </Card>

            {/* FAQ */}
            <div className='grid md:grid-cols-2 gap-6'>
                <Card className='p-6 bg-card/10 border-border/20'>
                    <h3 className='font-serif font-semibold text-lg mb-2'>How fast do stars arrive?</h3>
                    <p className='text-sm text-muted-foreground'>
                        Instantly after payment. If you don't see them, refresh the stars page.
                    </p>
                </Card>
                <Card className='p-6 bg-card/10 border-border/20'>
                    <h3 className='font-serif font-semibold text-lg mb-2'>What is the bonus?</h3>
                    <p className='text-sm text-muted-foreground'>
                        $1 always equals 60 stars. Bigger packs include extra bonus stars on top of the base amount.
                    </p>
                </Card>
            </div>
        </section>
    )
}

