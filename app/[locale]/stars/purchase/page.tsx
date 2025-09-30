"use client"

import { useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, CreditCard, ArrowLeft, CircleAlert } from "lucide-react"
import Link from "next/link"
import { useStars } from "@/contexts/stars-context"
import { useAuth } from "@/hooks/use-auth"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

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

const SUBSCRIPTIONS: Record<Extract<SelectionKey, "monthly" | "annual">, { id: SelectionKey; priceUsd: number; label: string }> = {
    monthly: { id: "monthly", priceUsd: 9.99, label: "Monthly subscription" },
    annual: { id: "annual", priceUsd: 99.99, label: "Annual subscription" },
}

const INFINITY_PLANS: Record<Extract<SelectionKey, "infinity-month" | "infinity-year">, { id: SelectionKey; priceUsd: number; label: string }> = {
    "infinity-month": { id: "infinity-month", priceUsd: 9.99, label: "Infinity (1 month)" },
    "infinity-year": { id: "infinity-year", priceUsd: 99.99, label: "Infinity (1 year)" },
}

const PACKS: Record<string, Pack> = {
    "pack-1": { id: "pack-1", priceUsd: 0.99, stars: 60, bonus: 0 },
    "pack-3": { id: "pack-3", priceUsd: 2.99, stars: 200, bonus: 200 - 3 * 60, label: "Popular" },
    "pack-5": { id: "pack-5", priceUsd: 4.99, stars: 350, bonus: 350 - 5 * 60, label: "Best value" },
    // Infinity handled separately (coming soon for payments)
}

export default function PurchasePage() {
    const params = useSearchParams()
    const router = useRouter()
    const { addStars } = useStars()
    const { user } = useAuth()

    const initialSelection = useMemo<SelectionKey>(() => {
        const plan = params.get("plan") as SelectionKey | null
        if (plan === "monthly" || plan === "annual") return plan
        const pack = params.get("pack")
        if (pack === "pack-1" || pack === "pack-3" || pack === "pack-5") return pack
        if (pack === "pack-infinity") {
            const term = params.get("term")
            return term === "year" ? "infinity-year" : "infinity-month"
        }
        return "pack-3"
    }, [params])

    const [selectedKey, setSelectedKey] = useState<SelectionKey>(initialSelection)

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
    const canPurchase = Boolean(user) && !isUnlimited && selectedPack !== null

    const handlePay = async () => {
        if (!canPurchase) return
        const pack = selectedPack as Pack
        const starsToAdd = pack.stars + Math.max(0, pack.bonus)
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

            {/* Plans selection */}
            <Card className='relative overflow-hidden p-6 rounded-xl bg-card/10 border-border/20'>
                <h2 className='font-serif text-xl mb-3'>Choose a plan</h2>
                <Accordion type='single' collapsible value={selectedKey} onValueChange={(v) => setSelectedKey((v || selectedKey) as SelectionKey)} className='space-y-2'>
                    {/* Subscriptions */}
                    <AccordionItem value='monthly' className='rounded-xl border border-border/20 bg-white/5'>
                        <AccordionTrigger className='px-3'>
                            <div className='flex items-center justify-between w-full'>
                                <div className='flex items-center gap-3'>
                                    <span className='text-2xl'>∞</span>
                                    <span>Monthly subscription</span>
                                </div>
                                <div className='text-right text-sm'>
                                    <div className='font-semibold'>$9.99</div>
                                    <div className='text-white/70'>Unlimited</div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className='px-3 pb-3 text-sm text-white/80'>Auto-renewing monthly plan with unlimited stars. Cancel anytime.</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value='annual' className='rounded-xl border border-border/20 bg-white/5'>
                        <AccordionTrigger className='px-3'>
                            <div className='flex items-center justify-between w-full'>
                                <div className='flex items-center gap-3'>
                                    <span className='text-2xl'>∞</span>
                                    <span>Annual subscription</span>
                                </div>
                                <div className='text-right text-sm'>
                                    <div className='font-semibold'>$99.99</div>
                                    <div className='text-white/70'>Unlimited</div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className='px-3 pb-3 text-sm text-white/80'>Billed yearly, best value. Unlimited stars, cancel renewal anytime.</AccordionContent>
                    </AccordionItem>

                    {/* Infinity one-time */}
                    <AccordionItem value='infinity-month' className='rounded-xl border border-amber-500/30 bg-amber-500/10'>
                        <AccordionTrigger className='px-3'>
                            <div className='flex items-center justify-between w-full'>
                                <div className='flex items-center gap-3'>
                                    <span className='text-2xl text-amber-200'>∞</span>
                                    <span>Infinity (1 month)</span>
                                </div>
                                <div className='text-right text-sm'>
                                    <div className='font-semibold'>$9.99</div>
                                    <div className='text-amber-200/90'>Unlimited</div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className='px-3 pb-3 text-sm text-white/80'>One-time purchase for 30 days of unlimited usage. No auto-renew.</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value='infinity-year' className='rounded-xl border border-rose-500/30 bg-rose-500/10'>
                        <AccordionTrigger className='px-3'>
                            <div className='flex items-center justify-between w-full'>
                                <div className='flex items-center gap-3'>
                                    <span className='text-2xl text-rose-200'>∞</span>
                                    <span>Infinity (1 year)</span>
                                </div>
                                <div className='text-right text-sm'>
                                    <div className='font-semibold'>$99.99</div>
                                    <div className='text-rose-200/90'>Unlimited</div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className='px-3 pb-3 text-sm text-white/80'>One-time purchase for 365 days of unlimited usage. No auto-renew.</AccordionContent>
                    </AccordionItem>

                    {/* Packs */}
                    <AccordionItem value='pack-1' className='rounded-xl border border-yellow-500/30 bg-yellow-500/10'>
                        <AccordionTrigger className='px-3'>
                            <div className='flex items-center justify-between w-full'>
                                <div className='flex items-center gap-3'>
                                    <div className='w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/30 grid place-items-center'>
                                        <Star className='w-4 h-4 text-yellow-300' />
                                    </div>
                                    <span>60 stars</span>
                                </div>
                                <div className='text-right text-sm'>
                                    <div className='font-semibold'>$0.99</div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className='px-3 pb-3 text-sm text-white/80'>One-time pack. Instant delivery after payment.</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value='pack-3' className='rounded-xl border border-pink-500/30 bg-pink-500/10'>
                        <AccordionTrigger className='px-3'>
                            <div className='flex items-center justify-between w-full'>
                                <div className='flex items-center gap-3'>
                                    <div className='w-8 h-8 rounded-full bg-pink-500/20 border border-pink-500/30 grid place-items-center'>
                                        <Star className='w-4 h-4 text-pink-300' />
                                    </div>
                                    <span>200 stars</span>
                                </div>
                                <div className='text-right text-sm'>
                                    <div className='font-semibold'>$2.99</div>
                                    <div className='text-emerald-300'>+{PACKS["pack-3"].bonus} bonus</div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className='px-3 pb-3 text-sm text-white/80'>Better value pack with bonus stars included. Instant delivery.</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value='pack-5' className='rounded-xl border border-cyan-500/30 bg-cyan-500/10'>
                        <AccordionTrigger className='px-3'>
                            <div className='flex items-center justify-between w-full'>
                                <div className='flex items-center gap-3'>
                                    <div className='w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 grid place-items-center'>
                                        <Star className='w-4 h-4 text-cyan-300' />
                                    </div>
                                    <span>350 stars</span>
                                </div>
                                <div className='text-right text-sm'>
                                    <div className='font-semibold'>$4.99</div>
                                    <div className='text-emerald-300'>+{PACKS["pack-5"].bonus} bonus</div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className='px-3 pb-3 text-sm text-white/80'>Best value pack with the biggest bonus. Instant delivery.</AccordionContent>
                    </AccordionItem>
                </Accordion>
            </Card>

            {/* Checkout summary */}
            <Card className='relative overflow-hidden p-6 rounded-xl bg-card/10 border-border/20'>
                <div className='space-y-4'>
                    <div className='grid grid-cols-2 gap-4 text-center'>
                        <div className='p-3 rounded-lg bg-white/5 border border-white/10'>
                            <div className='text-xs text-white/70'>Current stars</div>
                            <div className='text-2xl font-bold'>{typeof (useStars().stars) === 'number' ? useStars().stars : '—'}</div>
                        </div>
                        <div className='p-3 rounded-lg bg-white/5 border border-white/10'>
                            <div className='text-xs text-white/70'>After purchase</div>
                            <div className='text-2xl font-bold'>
                                {isUnlimited ? (
                                    <span>∞ <span className='text-base font-normal'>(Unlimited)</span></span>
                                ) : (
                                    (() => {
                                        const s = useStars().stars ?? 0
                                        const p = selectedPack as Pack
                                        return s + p.stars + Math.max(0, p.bonus)
                                    })()
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

