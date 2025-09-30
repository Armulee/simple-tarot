"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { Star, Users } from "lucide-react"
import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useStars } from "@/contexts/stars-context"

type PricingCTAMode = "pack" | "subscribe"

export function PricingCTA({ mode, packId, plan, infinityTerm }: { mode: PricingCTAMode; packId?: string; plan?: "monthly" | "annual"; infinityTerm?: "month" | "year" }) {
    const { user } = useAuth()
    const { addStars } = useStars()
    const [open, setOpen] = useState(false)
    const [stage, setStage] = useState<"summary" | "payment">("summary")
    const [cardName, setCardName] = useState("")
    const [cardNumber, setCardNumber] = useState("")
    const [cardExpiry, setCardExpiry] = useState("")
    const [cardCvc, setCardCvc] = useState("")

    const packMeta = useMemo(() => {
        if (mode !== "pack") return null
        switch (packId) {
            case "pack-1":
                return { label: "60 stars", stars: 60, price: 0.99 }
            case "pack-3":
                return { label: "200 stars", stars: 200, price: 2.99 }
            case "pack-5":
                return { label: "350 stars", stars: 350, price: 4.99 }
            case "pack-infinity":
                return { label: infinityTerm === "year" ? "Infinity (1 year)" : "Infinity (1 month)", stars: undefined, price: infinityTerm === "year" ? 99.99 : 9.99 }
            default:
                return null
        }
    }, [mode, packId, infinityTerm])

    const subscribeMeta = useMemo(() => {
        if (mode !== "subscribe") return null
        if (plan === "annual") return { label: "Annual subscription", price: 99.99 }
        return { label: "Monthly subscription", price: 9.99 }
    }, [mode, plan])

    const selectedMeta = packMeta ?? subscribeMeta

    const handleSimulatedPay = async () => {
        if (!user) return
        if (mode === "pack" && packMeta && typeof packMeta.stars === "number") {
            addStars(packMeta.stars)
        }
        setOpen(false)
    }

    const round2 = (n: number) => Math.round(n * 100) / 100
    const basePerDollar = 60
    const monthlyPrice = 9.99

    const summary = useMemo(() => {
        if (!selectedMeta) return null
        // Packs
        if (mode === "pack" && packMeta) {
            if (typeof packMeta.stars === "number") {
                const base = round2((packMeta.stars / basePerDollar) * 1)
                const discount = round2(base - packMeta.price)
                return { label: packMeta.label, stars: packMeta.stars, base, discount, total: packMeta.price }
            }
            // Infinity one-time
            const isYear = infinityTerm === "year"
            const base = isYear ? round2(monthlyPrice * 12) : monthlyPrice
            const price = isYear ? 99.99 : 9.99
            const discount = round2(base - price)
            return { label: packMeta.label, stars: undefined as number | undefined, base, discount, total: price }
        }
        // Subscriptions
        if (mode === "subscribe" && subscribeMeta) {
            const isYear = plan === "annual"
            const base = isYear ? round2(monthlyPrice * 12) : monthlyPrice
            const price = subscribeMeta.price
            const discount = round2(base - price)
            return { label: subscribeMeta.label, stars: undefined as number | undefined, base, discount, total: price }
        }
        return null
    }, [selectedMeta, mode, packMeta, subscribeMeta, infinityTerm, plan])


    if (mode === "pack") {
        if (!user) {
            return (
                <Link href={`/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
                    <Button className={`w-full rounded-full bg-white text-black hover:brightness-90 transition-shadow flex items-center justify-center gap-2`}>
                        <Users className='w-4 h-4' />
                        Sign in to purchase
                    </Button>
                </Link>
            )
        }
        return (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setStage("summary") }}>
                <DialogTrigger asChild>
                    <Button className={`w-full rounded-full bg-white text-black hover:brightness-90 transition-shadow flex items-center justify-center gap-2`} onClick={() => { setStage("summary"); setOpen(true) }}>
                        <Star className='w-4 h-4' />
                        Purchase
                    </Button>
                </DialogTrigger>
                <DialogContent className='max-w-md bg-card/95 backdrop-blur-md border-border/30'>
                    <DialogHeader>
                        <DialogTitle>Checkout</DialogTitle>
                    </DialogHeader>
                    {stage === "summary" && (
                        <div className='space-y-4'>
                            <div className='p-4 rounded-lg bg-white/5 border border-white/10'>
                                <div className='flex items-center justify-between'>
                                    <div className='text-sm'>
                                        <div className='font-semibold'>{selectedMeta?.label || 'Plan'}</div>
                                        {typeof packMeta?.stars === 'number' ? (
                                            <div className='text-white/70'>{packMeta.stars} stars</div>
                                        ) : (
                                            <div className='text-white/70'>Unlimited</div>
                                        )}
                                    </div>
                                    <div className='text-right'>
                                        <div className='font-semibold'>${(selectedMeta?.price || 0).toFixed(2)}</div>
                                        <div className='text-[10px] text-white/60'>Amount due</div>
                                    </div>
                                </div>
                                {summary && (
                                    <div className='mt-3'>
                                        <Separator className='my-2' />
                                        <div className='mb-1 text-xs text-white/70'>Pricing breakdown</div>
                                        <div className='space-y-1'>
                                            <div className='flex items-center justify-between text-sm'>
                                                <span className='text-white/80'>Base price</span>
                                                <span>${summary.base.toFixed(2)}</span>
                                            </div>
                                            <div className='flex items-center justify-between text-sm'>
                                                <span className='text-white/80'>Package discount</span>
                                                <span>- ${summary.discount.toFixed(2)}</span>
                                            </div>
                                            <div className='flex items-center justify-between'>
                                                <span className='font-semibold'>Total</span>
                                                <span className='font-bold text-lg'>${summary.total.toFixed(2)}</span>
                                            </div>
                                            <div className='pt-2 text-[11px] text-white/60'>
                                                {(() => {
                                                    if (mode === 'pack' && typeof packMeta?.stars === 'number') {
                                                        return `Base is computed at $1 = 60 stars → ${packMeta.stars} ÷ 60 = ${(packMeta.stars / 60).toFixed(2)} × $1 = $${((packMeta.stars / 60) * 1).toFixed(2)}`
                                                    }
                                                    if (mode === 'pack' && typeof packMeta?.stars !== 'number') {
                                                        const isYear = infinityTerm === 'year'
                                                        const base = isYear ? (9.99 * 12) : 9.99
                                                        return `Base for unlimited is ${isYear ? '12 × $9.99' : '$9.99'} = $${base.toFixed(2)}`
                                                    }
                                                    return null
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {stage === "payment" && (
                        <div className='space-y-4'>
                            <div className='flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10'>
                                <div className='text-sm'>
                                    <div className='font-semibold'>{selectedMeta?.label || 'Plan'}</div>
                                    {typeof packMeta?.stars === 'number' ? (
                                        <div className='text-white/70'>{packMeta.stars} stars</div>
                                    ) : (
                                        <div className='text-white/70'>Unlimited</div>
                                    )}
                                </div>
                                <div className='text-right font-semibold'>${(selectedMeta?.price || 0).toFixed(2)}</div>
                            </div>
                            <div className='grid grid-cols-3 gap-2'>
                                <Button className='w-full rounded-lg bg-white text-black hover:brightness-95'>Apple Pay</Button>
                                <Button className='w-full rounded-lg bg-white text-black hover:brightness-95'>Google Pay</Button>
                                <Button className='w-full rounded-lg bg-white text-black hover:brightness-95'>PayPal</Button>
                            </div>
                            <div className='flex items-center gap-2'>
                                <Separator className='flex-1' />
                                <span className='text-xs text-white/60'>or pay with card</span>
                                <Separator className='flex-1' />
                            </div>
                            <div className='space-y-3'>
                                <div className='space-y-1'>
                                    <Label htmlFor='card-name'>Name on card</Label>
                                    <Input id='card-name' value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder='Jane Doe' />
                                </div>
                                <div className='space-y-1'>
                                    <Label htmlFor='card-number'>Card number</Label>
                                    <Input id='card-number' value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder='4242 4242 4242 4242' />
                                </div>
                                <div className='grid grid-cols-2 gap-2'>
                                    <div className='space-y-1'>
                                        <Label htmlFor='card-expiry'>Expiry</Label>
                                        <Input id='card-expiry' value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder='MM/YY' />
                                    </div>
                                    <div className='space-y-1'>
                                        <Label htmlFor='card-cvc'>CVC</Label>
                                        <Input id='card-cvc' value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} placeholder='CVC' />
                                    </div>
                                </div>
                                <div className='text-xs text-white/60'>Processed securely by Checkout.com</div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        {stage === "summary" ? (
                            <Button className='w-full rounded-full bg-white text-black hover:brightness-95' onClick={() => setStage("payment")}>
                                Checkout
                            </Button>
                        ) : (
                            <div className='flex w-full gap-2'>
                                <Button variant='outline' className='w-32' onClick={() => setStage("summary")}>Back</Button>
                                <Button className='flex-1 rounded-full bg-white text-black hover:brightness-95' onClick={handleSimulatedPay}>
                                    Pay ${(selectedMeta?.price || 0).toFixed(2)}
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
    }

    // subscribe
    if (user) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button className={`w-full rounded-full bg-white text-black hover:brightness-90`} onClick={() => setOpen(true)}>Subscribe</Button>
                </DialogTrigger>
                <DialogContent className='max-w-md bg-card/95 backdrop-blur-md border-border/30'>
                    <DialogHeader>
                        <DialogTitle>Checkout</DialogTitle>
                    </DialogHeader>
                    <div className='space-y-4'>
                        <div className='flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10'>
                            <div className='text-sm'>
                                <div className='font-semibold'>{subscribeMeta?.label}</div>
                                <div className='text-white/70'>Unlimited</div>
                            </div>
                            <div className='text-right font-semibold'>${(subscribeMeta?.price || 0).toFixed(2)}</div>
                        </div>
                        <div className='grid grid-cols-3 gap-2'>
                            <Button className='w-full rounded-lg bg-white text-black hover:brightness-95'>Apple Pay</Button>
                            <Button className='w-full rounded-lg bg-white text-black hover:brightness-95'>Google Pay</Button>
                            <Button className='w-full rounded-lg bg-white text-black hover:brightness-95'>PayPal</Button>
                        </div>
                        <div className='flex items-center gap-2'>
                            <Separator className='flex-1' />
                            <span className='text-xs text-white/60'>or pay with card</span>
                            <Separator className='flex-1' />
                        </div>
                        <div className='space-y-3'>
                            <div className='space-y-1'>
                                <Label htmlFor='sub-card-name'>Name on card</Label>
                                <Input id='sub-card-name' value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder='Jane Doe' />
                            </div>
                            <div className='space-y-1'>
                                <Label htmlFor='sub-card-number'>Card number</Label>
                                <Input id='sub-card-number' value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder='4242 4242 4242 4242' />
                            </div>
                            <div className='grid grid-cols-2 gap-2'>
                                <div className='space-y-1'>
                                    <Label htmlFor='sub-card-expiry'>Expiry</Label>
                                    <Input id='sub-card-expiry' value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder='MM/YY' />
                                </div>
                                <div className='space-y-1'>
                                    <Label htmlFor='sub-card-cvc'>CVC</Label>
                                    <Input id='sub-card-cvc' value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} placeholder='CVC' />
                                </div>
                            </div>
                            <div className='text-xs text-white/60'>Processed securely by Checkout.com</div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className='w-full rounded-full bg-white text-black hover:brightness-95' onClick={() => setOpen(false)}>
                            Pay ${(subscribeMeta?.price || 0).toFixed(2)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
    }
    return (
        <Link href={`/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
            <Button className={`w-full rounded-full bg-white text-black hover:brightness-90`}>Sign in to subscribe</Button>
        </Link>
    )
}

