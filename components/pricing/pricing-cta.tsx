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

export function PricingCTA({ mode, packId, plan, infinityTerm, theme }: { mode: PricingCTAMode; packId?: string; plan?: "monthly" | "annual"; infinityTerm?: "month" | "year"; theme?: "violet" | "sky" | "slate" | "zinc" }) {
    const { user } = useAuth()
    const { addStars } = useStars()
    const [open, setOpen] = useState(false)
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
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button className={`w-full rounded-full bg-white text-black hover:brightness-90 transition-shadow flex items-center justify-center gap-2`} onClick={() => setOpen(true)}>
                        <Star className='w-4 h-4' />
                        Purchase
                    </Button>
                </DialogTrigger>
                <DialogContent className='max-w-md bg-card/95 backdrop-blur-md border-border/30'>
                    <DialogHeader>
                        <DialogTitle>Checkout</DialogTitle>
                    </DialogHeader>
                    <div className='space-y-4'>
                        <div className='flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10'>
                            <div className='text-sm'>
                                <div className='font-semibold'>{selectedMeta?.label || 'Plan'}</div>
                                {packMeta?.stars ? (
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
                    <DialogFooter>
                        <Button className='w-full rounded-full bg-white text-black hover:brightness-95' onClick={handleSimulatedPay}>Pay ${(selectedMeta?.price || 0).toFixed(2)}</Button>
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

