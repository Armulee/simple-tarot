"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { Star, Users } from "lucide-react"

type PricingCTAMode = "pack" | "subscribe"

export function PricingCTA({ mode, packId, plan, infinityTerm, theme }: { mode: PricingCTAMode; packId?: string; plan?: "monthly" | "annual"; infinityTerm?: "month" | "year"; theme?: "violet" | "sky" | "slate" | "zinc" }) {
    const { user } = useAuth()


    if (mode === "pack") {
        if (packId === 'pack-infinity') {
            if (user) {
                return (
                    <Link href={`/stars/purchase?pack=${encodeURIComponent(packId)}${infinityTerm ? `&term=${infinityTerm}` : ''}`}>
                        <Button className={`w-full rounded-full bg-white text-black hover:brightness-90 transition-shadow flex items-center justify-center gap-2`}>
                            <Star className='w-4 h-4' />
                            Purchase
                        </Button>
                    </Link>
                )
            }
            return (
                <Link href={`/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
                    <Button className={`w-full rounded-full bg-white text-black hover:brightness-90 transition-shadow flex items-center justify-center gap-2`}>
                        <Users className='w-4 h-4' />
                        Sign in to purchase
                    </Button>
                </Link>
            )
        }
        if (user) {
            return (
                <Link href={`/stars/purchase?pack=${encodeURIComponent(packId || "")}`}>
                    <Button className={`w-full rounded-full bg-white text-black hover:brightness-90 transition-shadow flex items-center justify-center gap-2`}>
                        <Star className='w-4 h-4' />
                        Purchase
                    </Button>
                </Link>
            )
        }
        return (
            <Link href={`/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
                <Button className={`w-full rounded-full bg-white text-black hover:brightness-90 transition-shadow flex items-center justify-center gap-2`}>
                    <Users className='w-4 h-4' />
                    Sign in to purchase
                </Button>
            </Link>
        )
    }

    // subscribe
    if (user) {
        return (
            <Link href={`/stars/purchase?plan=${encodeURIComponent(plan || 'monthly')}`}>
                <Button className={`w-full rounded-full bg-white text-black hover:brightness-90`}>Subscribe</Button>
            </Link>
        )
    }
    return (
        <Link href={`/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
            <Button className={`w-full rounded-full bg-white text-black hover:brightness-90`}>Sign in to subscribe</Button>
        </Link>
    )
}

