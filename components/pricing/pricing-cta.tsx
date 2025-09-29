"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { Star, Users } from "lucide-react"

type PricingCTAMode = "pack" | "subscribe"

export function PricingCTA({ mode, packId }: { mode: PricingCTAMode; packId?: string }) {
    const { user } = useAuth()

    if (mode === "pack") {
        if (user) {
            return (
                <Link href={`/stars/purchase?pack=${encodeURIComponent(packId || "")}`}>
                    <Button className='w-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border border-yellow-500/40 hover:from-yellow-300 hover:to-yellow-500 transition-shadow flex items-center justify-center gap-2'>
                        <Star className='w-4 h-4' />
                        Purchase
                    </Button>
                </Link>
            )
        }
        return (
            <Link href={`/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
                <Button className='w-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border border-yellow-500/40 hover:from-yellow-300 hover:to-yellow-500 transition-shadow flex items-center justify-center gap-2'>
                    <Users className='w-4 h-4' />
                    Sign in to purchase
                </Button>
            </Link>
        )
    }

    // subscribe
    if (user) {
        return (
            <Link href='/pricing/subscribe'>
                <Button className='w-full rounded-full'>Subscribe $9.99/month</Button>
            </Link>
        )
    }
    return (
        <Link href={`/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
            <Button className='w-full rounded-full'>Sign in to subscribe</Button>
        </Link>
    )
}

