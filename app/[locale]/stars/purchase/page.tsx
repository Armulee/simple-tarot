"use client"

import { useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, CreditCard, ArrowLeft, CircleAlert } from "lucide-react"
import Link from "next/link"
import { useStars } from "@/contexts/stars-context"
import { useAuth } from "@/hooks/use-auth"

type Pack = {
    id: string
    priceUsd: number
    stars: number
    bonus: number
    label?: string
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

    const selectedPack = useMemo(() => {
        const packId = params.get("pack") || "pack-3"
        if (packId === "pack-infinity") return { id: packId } as any
        return PACKS[packId] ?? PACKS["pack-3"]
    }, [params])

    const canPurchase = Boolean(user) && selectedPack && selectedPack.id !== "pack-infinity"

    const handlePay = async () => {
        if (!canPurchase) return
        const starsToAdd = (selectedPack as Pack).stars + Math.max(0, (selectedPack as Pack).bonus)
        // Optimistic add; server reconciles in provider
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

            {/* Order summary */}
            <Card className='relative overflow-hidden p-6 rounded-xl bg-card/10 border-border/20'>
                {selectedPack?.id === "pack-infinity" ? (
                    <div className='space-y-4'>
                        <div className='flex items-center gap-2 text-amber-200'>
                            <CircleAlert className='w-4 h-4' />
                            <span className='text-sm'>Infinity pack checkout is coming soon.</span>
                        </div>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-3'>
                                <div className='w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center'>
                                    <span className='text-xl text-amber-200 leading-none'>∞</span>
                                </div>
                                <div>
                                    <div className='font-semibold'>Infinity stars</div>
                                    <div className='text-xs text-muted-foreground'>one-time · time-limited access</div>
                                </div>
                            </div>
                            <div className='text-right'>
                                <div className='text-lg font-bold'>$9.99</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className='space-y-4'>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-3'>
                                <div className='w-10 h-10 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center'>
                                    <Star className='w-5 h-5 text-yellow-300' />
                                </div>
                                <div>
                                    <div className='font-semibold'>{(selectedPack as Pack).stars} stars</div>
                                    <div className='text-xs text-muted-foreground'>one-time · instant delivery</div>
                                </div>
                            </div>
                            <div className='text-right'>
                                <div className='text-lg font-bold'>${(selectedPack as Pack).priceUsd.toFixed(2)}</div>
                                {(selectedPack as Pack).bonus > 0 && (
                                    <div className='text-xs text-emerald-300'>+{(selectedPack as Pack).bonus} bonus</div>
                                )}
                            </div>
                        </div>
                        <div className='flex items-center justify-between text-sm'>
                            <span>Subtotal</span>
                            <span>${(selectedPack as Pack).priceUsd.toFixed(2)}</span>
                        </div>
                        <div className='flex items-center justify-between text-sm'>
                            <span>Fees</span>
                            <span>$0.00</span>
                        </div>
                        <div className='flex items-center justify-between'>
                            <span className='font-semibold'>Total</span>
                            <span className='font-bold text-xl'>${(selectedPack as Pack).priceUsd.toFixed(2)}</span>
                        </div>
                    </div>
                )}
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

