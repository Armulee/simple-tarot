"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useStars } from "@/contexts/stars-context"
import { Star, Clock, Gift, Share2, Users, Megaphone, Check } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PricingCTA } from "@/components/pricing/pricing-cta"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronDown, Infinity as InfinityIcon } from "lucide-react"

function formatRelativeTime(timestamp: number | null | undefined, nowMs: number): string {
    if (!timestamp) return "—"
    const ms = Math.max(0, timestamp - nowMs)
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export default function StarsPage() {
    const { stars, nextRefillAt, refillCap, firstLoginBonusGranted } = useStars()
    const { user } = useAuth()

    const [now, setNow] = useState<number>(Date.now())
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(id)
    }, [])

    const nextIn = useMemo(() => formatRelativeTime(nextRefillAt, now), [nextRefillAt, now])

    const remainingMs = Math.max(0, (nextRefillAt ?? 0) - now)
    const stepMs = user ? 2 * 60 * 60 * 1000 : (() => {
        const offsetMs = 7 * 60 * 60 * 1000
        const bkkNow = new Date(now + offsetMs)
        const bkkMidnight = new Date(bkkNow)
        bkkMidnight.setUTCHours(0, 0, 0, 0)
        const bkkNextMidnight = new Date(bkkNow)
        bkkNextMidnight.setUTCHours(24, 0, 0, 0)
        const start = bkkNow.getTime() < bkkMidnight.getTime() ? bkkMidnight.getTime() : bkkMidnight.getTime()
        const end = bkkNextMidnight.getTime()
        return Math.max(1, end - start)
    })()
    const progress = Math.min(100, Math.max(0, 100 - (remainingMs / stepMs) * 100))

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
                        <p className='text-xs text-muted-foreground text-center'>
                            {user
                                ? <>Auto-refills by 1 star every 2 hours (up to {refillCap}).</>
                                : <>Refills to 5 at 00:00 (UTC+7). Countdown shows time until next midnight.</>}
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

                    {user && (
                        <div className='w-full max-w-2xl mt-3 space-y-2'>
                            <div className='text-center'>
                                <div className='text-xs tracking-wider uppercase text-white/70'>One‑tap top‑ups</div>
                                <div className='text-[11px] text-white/60'>Choose a pack and recharge instantly</div>
                            </div>
                            {/* One-tap grid: 3 cols mobile, 6 cols desktop */}
                            <div className='grid grid-cols-3 md:grid-cols-6 gap-2'>
                                {[
                                    { id: 'pack-1', stars: 60 },
                                    { id: 'pack-2', stars: 130 },
                                    { id: 'pack-3', stars: 200 },
                                    { id: 'pack-5', stars: 350 },
                                    { id: 'pack-7', stars: 500 },
                                ].map((p) => (
                                    <PricingCTA
                                        key={p.id}
                                        mode='pack'
                                        packId={p.id}
                                        customTrigger={
                                            <button
                                                type='button'
                                                className='w-full rounded-full border border-yellow-500/40 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 hover:from-yellow-400/30 hover:to-yellow-600/30 text-yellow-200 px-3 py-1.5 flex items-center justify-center gap-1.5 transition'
                                            >
                                                <Star className='w-3.5 h-3.5' fill='currentColor' />
                                                <span className='text-sm font-semibold'>{p.stars}</span>
                                            </button>
                                        }
                                    />
                                ))}
                                {/* Infinity one-time chip INLINE with grid, larger infinity symbol, styled like others (yellow) */}
                                <PricingCTA
                                    mode='pack'
                                    packId='pack-infinity'
                                    infinityTerm='month'
                                    customTrigger={
                                        <button type='button' className='w-full h-8 rounded-full border border-yellow-500/40 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 hover:from-yellow-400/30 hover:to-yellow-600/30 text-yellow-200 px-3 py-0 text-sm font-semibold flex items-center justify-center gap-1.5 transition'>
                                            <Star className='w-3.5 h-3.5' fill='currentColor' />
                                            <span className='text-xl leading-none'>∞</span>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <span
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                        className='inline-flex items-center justify-center'
                                                        role='button'
                                                        aria-label='Choose infinity term'
                                                    >
                                                        <ChevronDown className='w-4 h-4' />
                                                    </span>
                                                </PopoverTrigger>
                                                <PopoverContent className='w-56 bg-card/95 border-border/30 p-2 space-y-1'>
                                                    <PricingCTA mode='pack' packId='pack-infinity' infinityTerm='month' customTrigger={<button className='w-full text-left text-sm px-2 py-1 rounded hover:bg-white/10'>One month $9.99</button>} />
                                                    <PricingCTA mode='pack' packId='pack-infinity' infinityTerm='year' customTrigger={<button className='w-full text-left text-sm px-2 py-1 rounded hover:bg-white/10'>One year $99.99</button>} />
                                                </PopoverContent>
                                            </Popover>
                                        </button>
                                    }
                                />
                            </div>

                            {/* Subscribe full-width button below the grid */}
                            <div className='mt-2'>
                                <PricingCTA
                                    mode='subscribe'
                                    plan='monthly'
                                    customTrigger={
                                        <button type='button' className='w-full rounded-full bg-accent text-white border border-white/10 hover:brightness-110 transition px-4 py-2 text-sm font-semibold relative'>
                                            <span>Subscribe (Unlimited)</span>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <span
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                        className='absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center'
                                                        role='button'
                                                        aria-label='Choose subscription term'
                                                    >
                                                        <ChevronDown className='w-4 h-4' />
                                                    </span>
                                                </PopoverTrigger>
                                                <PopoverContent className='w-44 bg-card/95 border-border/30 p-2 space-y-1'>
                                                    <PricingCTA mode='subscribe' plan='monthly' customTrigger={<button className='w-full text-left text-sm px-2 py-1 rounded hover:bg-white/10'>Monthly $9.99</button>} />
                                                    <PricingCTA mode='subscribe' plan='annual' customTrigger={<button className='w-full text-left text-sm px-2 py-1 rounded hover:bg-white/10'>Annual $99.99</button>} />
                                                </PopoverContent>
                                            </Popover>
                                        </button>
                                    }
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Ways to earn - Accordion */}
            <div className='space-y-4'>
                <h2 className='font-serif text-2xl font-semibold text-white text-center'>Ways to earn stars</h2>
                <Accordion className='space-y-3'>
                    <AccordionItem className='rounded-xl border border-border/20 bg-card/10 px-2'>
                        <AccordionTrigger className='px-2'>
                            <div className='flex items-center gap-3'>
                                <span className={`h-8 w-8 rounded-full flex items-center justify-center border ${firstLoginBonusGranted ? 'bg-green-500/20 border-green-400/40 text-green-300' : 'bg-white/10 border-white/20 text-white/80'}`}>
                                    {firstLoginBonusGranted ? (<Check className='w-4 h-4' />) : (<Gift className='w-4 h-4' />)}
                                </span>
                                <span className='text-white'>Sign in</span>
                                <span className='ml-2 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-500/30 text-yellow-300 flex items-center gap-1'>
                                    <Star className='w-3.5 h-3.5' fill='currentColor' />
                                    12
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className='space-y-3 p-4 rounded-lg bg-card/20 border border-border/20'>
                                <p>New accounts start with 12 stars. Auto-refills 1 star every 2 hours (cap {refillCap}).</p>
                                {!(user && firstLoginBonusGranted) && (
                                    <Link href={`/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`}>
                                        <Button className='rounded-full'>Sign in</Button>
                                    </Link>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem className='relative overflow-hidden rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-400/15 to-yellow-600/15 px-2 card-glow'>
                        <AccordionTrigger className='px-2'>
                            <div className='flex items-center gap-3'>
                                <span className='h-8 w-8 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-500/30 text-yellow-300 flex items-center justify-center'>
                                    <Star className='w-4 h-4' fill='currentColor' />
                                </span>
                                <span className='text-white'>Purchase stars</span>
                                <span className='ml-2 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-500/30 text-yellow-300 flex items-center gap-1'>
                                    <Star className='w-3.5 h-3.5' fill='currentColor' />
                                    Instant
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className='space-y-3 p-4 rounded-lg bg-card/20 border border-yellow-500/30 relative'>
                                <div className='pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-yellow-400/25 blur-3xl' />
                                <div className='pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl' />
                                <p>Need stars instantly? Buy star packs and use them right away.</p>
                                <Link href='/stars/purchase'>
                                    <Button className='rounded-full'>Purchase Stars</Button>
                                </Link>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem className='rounded-xl border border-border/20 bg-card/10 px-2'>
                        <AccordionTrigger className='px-2'>
                            <div className='flex items-center gap-3'>
                                <span className='h-8 w-8 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center'>
                                    <Megaphone className='w-4 h-4' />
                                </span>
                                <span className='text-white'>Create content about us</span>
                                <span className='ml-2 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-500/30 text-yellow-300 flex items-center gap-1'>
                                    <Star className='w-3.5 h-3.5' fill='currentColor' />
                                    15–50
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className='space-y-3 p-4 rounded-lg bg-card/20 border border-border/20'>
                                <ul className='list-disc list-inside space-y-1'>
                                    <li>Text article or blog post: +15 stars</li>
                                    <li>Image post (e.g. social media): +25 stars</li>
                                    <li>Video content (YouTube/TikTok/Reels): +50 stars</li>
                                </ul>
                                <p className='text-xs'>Share the public link to your content. We will review and approve manually.</p>
                                <Link href='/stars/submit-content'>
                                    <Button variant='outline' className='rounded-full'>Submit content</Button>
                                </Link>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem className='rounded-xl border border-border/20 bg-card/10 px-2'>
                        <AccordionTrigger className='px-2'>
                            <div className='flex items-center gap-3'>
                                <span className='h-8 w-8 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center'>
                                    <Share2 className='w-4 h-4' />
                                </span>
                                <span className='text-white'>Share a reading</span>
                                <span className='ml-2 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-500/30 text-yellow-300 flex items-center gap-1'>
                                    <Star className='w-3.5 h-3.5' fill='currentColor' />
                                    1
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className='space-y-3 p-4 rounded-lg bg-card/20 border border-border/20'>
                                <p>Post or send your reading to earn +1 star.</p>
                                <Link href='/'>
                                    <Button variant='outline' className='rounded-full'>Go to readings</Button>
                                </Link>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem className='rounded-xl border border-border/20 bg-card/10 px-2'>
                        <AccordionTrigger className='px-2'>
                            <div className='flex items-center gap-3'>
                                <span className='h-8 w-8 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center'>
                                    <Users className='w-4 h-4' />
                                </span>
                                <span className='text-white'>Refer a friend</span>
                                <span className='ml-2 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-500/30 text-yellow-300 flex items-center gap-1'>
                                    <Star className='w-3.5 h-3.5' fill='currentColor' />
                                    5
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className='space-y-3 p-4 rounded-lg bg-card/20 border border-border/20'>
                                <p>You and your friend each get +5 stars when they join.</p>
                                <Link href='/contact'>
                                    <Button variant='outline' className='rounded-full'>Get referral link</Button>
                                </Link>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </section>
    )
}

