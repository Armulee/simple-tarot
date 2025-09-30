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
    const [hasSavedPayment, setHasSavedPayment] = useState<boolean>(false)
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
        // Unified computation for all plans
        if (!selectedMeta) return null
        // Star packs
        if (packMeta && typeof packMeta.stars === "number") {
            const total = packMeta.price
            const base = round2((packMeta.stars / basePerDollar) * 1)
            const discount = round2(base - total)
            return { label: packMeta.label, stars: packMeta.stars, base, discount, total }
        }
        // Infinity (one-time unlimited)
        if (packMeta && typeof packMeta.stars !== "number") {
            const isYear = infinityTerm === "year"
            const total = isYear ? 99.99 : 9.99
            const base = isYear ? round2(monthlyPrice * 12) : monthlyPrice
            const discount = round2(base - total)
            return { label: packMeta.label, stars: undefined as number | undefined, base, discount, total }
        }
        // Subscriptions
        if (subscribeMeta) {
            const isYear = plan === "annual"
            const total = subscribeMeta.price
            const base = isYear ? round2(monthlyPrice * 12) : monthlyPrice
            const discount = round2(base - total)
            return { label: subscribeMeta.label, stars: undefined as number | undefined, base, discount, total }
        }
        return null
    }, [selectedMeta, packMeta, subscribeMeta, infinityTerm, plan])


    // Unified rendering for both pack and subscribe
    if (user) {
        return (
            <Dialog open={open} onOpenChange={(v: boolean) => { setOpen(v); if (!v) setStage("summary") }}>
                <DialogTrigger asChild>
                    <Button className={`w-full rounded-full bg-white text-black hover:brightness-90`} onClick={() => { setStage("summary"); setOpen(true) }}>{mode === 'pack' ? 'Purchase' : 'Subscribe'}</Button>
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
                                        <div className='font-semibold'>{summary?.label || 'Plan'}</div>
                                        {typeof packMeta?.stars === 'number' ? (
                                            <div className='text-white/70'>{packMeta.stars} stars</div>
                                        ) : (
                                            <div className='text-white/70'>Unlimited</div>
                                        )}
                                    </div>
                                    <div className='text-right'>
                                        <div className='font-semibold'>${(summary?.total || 0).toFixed(2)}</div>
                                        <div className='text-[10px] text-white/60'>Amount due</div>
                                    </div>
                                </div>
                                <div className='mt-3'>
                                    <Separator className='my-2' />
                                    {/* Breakdown with base price and package discount restored */}
                                    <div className='flex items-center justify-between text-sm'>
                                        <span className='text-white/80'>Base price</span>
                                        <span>${(summary?.base || 0).toFixed(2)}</span>
                                    </div>
                                    <div className='flex items-center justify-between text-sm'>
                                        <span className='text-white/80'>Package discount</span>
        								<span>- ${(summary?.discount || 0).toFixed(2)}</span>
                                    </div>
                                    <div className='flex items-center justify-between'>
                                        <span className='font-semibold'>Total</span>
                                        <span className='font-bold text-lg'>${(summary?.total || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {stage === "payment" && (
                        <div className='space-y-4'>
                            <div className='flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10'>
                                <div className='text-sm'>
                                    <div className='font-semibold'>{summary?.label || 'Plan'}</div>
                                    {typeof packMeta?.stars === 'number' ? (
                                        <div className='text-white/70'>{packMeta.stars} stars</div>
                                    ) : (
                                        <div className='text-white/70'>Unlimited</div>
                                    )}
                                </div>
                                <div className='text-right font-semibold'>${(summary?.total || 0).toFixed(2)}</div>
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
                                    <Label htmlFor='card-name-unified'>Name on card</Label>
                                    <Input id='card-name-unified' value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder='Jane Doe' />
                                </div>
                                <div className='space-y-1'>
                                    <Label htmlFor='card-number-unified'>Card number</Label>
                                    <Input id='card-number-unified' value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder='4242 4242 4242 4242' />
                                </div>
                                <div className='grid grid-cols-2 gap-2'>
                                    <div className='space-y-1'>
                                        <Label htmlFor='card-expiry-unified'>Expiry</Label>
                                        <Input id='card-expiry-unified' value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder='MM/YY' />
                                    </div>
                                    <div className='space-y-1'>
                                        <Label htmlFor='card-cvc-unified'>CVC</Label>
                                        <Input id='card-cvc-unified' value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} placeholder='CVC' />
                                    </div>
                                </div>
                                <div className='text-xs text-white/60'>Processed securely by Checkout.com</div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        {stage === "summary" ? (
                            <Button
                                className='w-full rounded-full bg-white text-black hover:brightness-95'
                                onClick={() => setStage(hasSavedPayment ? "payment" : "payment")}
                            >
                                Checkout
                            </Button>
                        ) : (
                            <div className='flex w-full gap-2'>
                                <Button variant='outline' className='w-32' onClick={() => setStage("summary")}>Back</Button>
                                <Button className='flex-1 rounded-full bg-white text-black hover:brightness-95' onClick={handleSimulatedPay}>
                                    Pay ${(summary?.total || 0).toFixed(2)}
                                </Button>
                            </div>
                        )}
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

