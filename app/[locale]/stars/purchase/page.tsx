"use client"

import { useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Star, CreditCard, ArrowLeft, CircleAlert, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { useStars } from "@/contexts/stars-context"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

type Pack = {
    id: string
    priceUsd: number
    stars: number
    bonus: number
    label?: string
}

type InfinityPack = { id: "pack-infinity" }
type SelectedPack = Pack | InfinityPack

type SelectionKey = "monthly" | "annual" | "infinity-month" | "infinity-year" | "pack-1" | "pack-3" | "pack-5"

const PACKS: Record<string, Pack> = {
    "pack-1": { id: "pack-1", priceUsd: 0.99, stars: 60, bonus: 0 },
    "pack-3": { id: "pack-3", priceUsd: 2.99, stars: 200, bonus: 200 - 3 * 60, label: "Popular" },
    "pack-5": { id: "pack-5", priceUsd: 4.99, stars: 350, bonus: 350 - 5 * 60, label: "Best value" },
    // Infinity handled separately (coming soon for payments)
}

export default function PurchasePage() {
    const params = useSearchParams()
    const router = useRouter()
    const { addStars, stars } = useStars()
    const { user } = useAuth()

    const initialSelection = useMemo<SelectionKey | null>(() => {
        const plan = params.get("plan") as SelectionKey | null
        if (plan === "monthly" || plan === "annual") return plan
        const pack = params.get("pack")
        if (pack === "pack-1" || pack === "pack-3" || pack === "pack-5") return pack
        if (pack === "pack-infinity") {
            const term = params.get("term")
            return term === "year" ? "infinity-year" : "infinity-month"
        }
        return null
    }, [params])

    const [selectedKey, setSelectedKey] = useState<SelectionKey | null>(initialSelection)
    const [showOnlySelected, setShowOnlySelected] = useState<boolean>(true)

    const selectedPack = useMemo<SelectedPack | null>(() => {
        if (selectedKey === "pack-1" || selectedKey === "pack-3" || selectedKey === "pack-5") {
            return PACKS[selectedKey]
        }
        if (selectedKey === "infinity-month" || selectedKey === "infinity-year") {
            return { id: "pack-infinity" }
        }
        return null
    }, [selectedKey])

    const isUnlimited = selectedKey === "monthly" || selectedKey === "annual" || selectedKey === "infinity-month" || selectedKey === "infinity-year"
    const finalStars = useMemo(() => {
        if (isUnlimited || !selectedPack) return null
        const p = selectedPack as Pack
        const current = typeof stars === 'number' ? stars : 0
        return current + p.stars
    }, [isUnlimited, selectedPack, stars])
    const canPurchase = Boolean(user) && !isUnlimited && selectedPack !== null

    const handlePay = async () => {
        if (!canPurchase) return
        const pack = selectedPack as Pack
        const starsToAdd = pack.stars
        addStars(starsToAdd)
        router.push("/stars")
    }

    return (
        <section className='relative z-10 max-w-3xl mx-auto px-6 py-10 space-y-6'>
            <div className='flex items-center gap-3'>
                <Link href='/pricing' className='inline-flex items-center gap-2 text-sm text-white/80 hover:text-white'>
                    <ArrowLeft className='w-4 h-4' /> Back to pricing
                </Link>
            </div>

            <div className='text-center space-y-2'>
                <h1 className='font-serif font-bold text-3xl'>Checkout</h1>
                <p className='text-sm text-muted-foreground'>Secure and instant delivery after payment.</p>
            </div>

            {/* Plans selection: uniform grid of selectable cards */}
            <Card className='relative overflow-hidden p-6 rounded-xl bg-card/10 border-border/20'>
                <h2 className='font-serif text-xl mb-3'>Choose a plan</h2>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {[{
                        key: "monthly" as SelectionKey,
                        title: "Monthly subscription",
                        price: "$9.99",
                        subtitle: "Unlimited",
                        icon: <span className='text-2xl'>∞</span>,
                        details: "Auto-renewing monthly plan with unlimited stars. Cancel anytime.",
                    }, {
                        key: "annual" as SelectionKey,
                        title: "Annual subscription",
                        price: "$99.99",
                        subtitle: "Unlimited",
                        icon: <span className='text-2xl'>∞</span>,
                        details: "Billed yearly, best value. Unlimited stars, cancel renewal anytime.",
                    }, {
                        key: "infinity-month" as SelectionKey,
                        title: "Infinity (1 month)",
                        price: "$9.99",
                        subtitle: "Unlimited",
                        icon: <span className='text-2xl'>∞</span>,
                        details: "One-time purchase for 30 days of unlimited usage. No auto-renew.",
                    }, {
                        key: "infinity-year" as SelectionKey,
                        title: "Infinity (1 year)",
                        price: "$99.99",
                        subtitle: "Unlimited",
                        icon: <span className='text-2xl'>∞</span>,
                        details: "One-time purchase for 365 days of unlimited usage. No auto-renew.",
                    }, {
                        key: "pack-1" as SelectionKey,
                        title: "60 stars",
                        price: "$0.99",
                        subtitle: "Instant delivery",
                        icon: <div className='w-8 h-8 rounded-full bg-white/10 border border-white/20 grid place-items-center'><Star className='w-4 h-4 text-yellow-300' /></div>,
                        details: "One-time pack. Instant delivery after payment.",
                    }, {
                        key: "pack-3" as SelectionKey,
                        title: "200 stars",
                        price: "$2.99",
                        subtitle: `+${PACKS["pack-3"].bonus} bonus` ,
                        icon: <div className='w-8 h-8 rounded-full bg-white/10 border border-white/20 grid place-items-center'><Star className='w-4 h-4 text-yellow-300' /></div>,
                        details: "Better value pack with bonus stars included. Instant delivery.",
                    }, {
                        key: "pack-5" as SelectionKey,
                        title: "350 stars",
                        price: "$4.99",
                        subtitle: `+${PACKS["pack-5"].bonus} bonus` ,
                        icon: <div className='w-8 h-8 rounded-full bg-white/10 border border-white/20 grid place-items-center'><Star className='w-4 h-4 text-yellow-300' /></div>,
                        details: "Best value pack with the biggest bonus. Instant delivery.",
                    }].map((card) => {
                        const selected = selectedKey === card.key
                        if (showOnlySelected && selectedKey && !selected) return null
                        return (
                            <button
                                key={card.key}
                                type='button'
                                onClick={() => setSelectedKey(card.key)}
                                className={cn(
                                    'text-left rounded-xl border transition-all p-4 bg-white/5',
                                    selected ? 'border-white/50 ring-2 ring-white/25 shadow-lg bg-white/10' : 'border-border/20 hover:border-white/30'
                                )}
                            >
                                <div className='flex items-start justify-between gap-3'>
                                    <div className='flex items-center gap-3'>
                                        {card.icon}
                                        <div>
                                            <div className='font-semibold'>{card.title}</div>
                                            <div className='text-xs text-muted-foreground'>{card.subtitle}</div>
                                        </div>
                                    </div>
                                    <div className='text-right'>
                                        <div className='font-semibold'>{card.price}</div>
                                        <Checkbox checked={selected} onCheckedChange={() => setSelectedKey(card.key)} className='ml-auto' />
                                    </div>
                                </div>
                                {selected && (
                                    <div className='mt-3 text-sm text-white/80'>{card.details}</div>
                                )}
                            </button>
                        )
                    })}
                </div>
                {selectedKey && (
                    <div className='mt-2 flex justify-center'>
                        <Button
                            type='button'
                            variant='link'
                            className='h-auto px-0 text-white underline'
                            onClick={() => setShowOnlySelected(!showOnlySelected)}
                        >
                            {showOnlySelected ? (
                                <>
                                    <ChevronDown className='w-4 h-4 mr-1' /> Show more plans
                                </>
                            ) : (
                                <>
                                    <ChevronUp className='w-4 h-4 mr-1' /> Show less
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </Card>

            {/* Checkout summary: show only new stars amount (current in navbar) */}
            <Card className='relative overflow-hidden p-6 rounded-xl bg-card/10 border-border/20'>
                <div className='space-y-4'>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-center'>
                        <div className='p-3 rounded-lg bg-white/5 border border-white/10 md:col-start-2'>
                            <div className='text-xs text-white/70'>New stars after purchase</div>
                            <div className='text-2xl font-bold'>
                                {isUnlimited ? (
                                    <span>∞ <span className='text-base font-normal'>(Unlimited)</span></span>
                                ) : (
                                    finalStars ?? '—'
                                )}
                            </div>
                        </div>
                    </div>
                    {!isUnlimited && selectedPack && (
                        <div className='flex items-center justify-between'>
                            <span className='font-semibold'>Total</span>
                            <span className='font-bold text-xl'>${(selectedPack as Pack).priceUsd.toFixed(2)}</span>
                        </div>
                    )}
                    {isUnlimited && (
                        <div className='flex items-center gap-2 text-amber-200 text-sm'>
                            <CircleAlert className='w-4 h-4' />
                            <span>Unlimited plans checkout is coming soon.</span>
                        </div>
                    )}
                </div>
            </Card>

            {/* Payment action */}
            <Card className='p-6 rounded-xl bg-card/10 border-border/20 space-y-4'>
                {!user && (
                    <div className='text-sm text-white/80'>
                        Please sign in to purchase.
                    </div>
                )}
                <Button
                    className='w-full rounded-full bg-white text-black hover:brightness-90 flex items-center justify-center gap-2'
                    onClick={handlePay}
                    disabled={!canPurchase}
                >
                    <CreditCard className='w-4 h-4' />
                    {selectedPack?.id === "pack-infinity" ? "Coming soon" : "Pay now"}
                </Button>
                <div className='text-xs text-muted-foreground text-center'>Payments are handled securely. Stars deliver instantly after payment.</div>
            </Card>
        </section>
    )
}

