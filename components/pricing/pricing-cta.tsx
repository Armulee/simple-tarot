"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { Star, Users } from "lucide-react"

type PricingCTAMode = "pack" | "subscribe"

export function PricingCTA({ mode, packId }: { mode: PricingCTAMode; packId?: string }) {
    const { user } = useAuth()

    const gradientByPack = (id?: string) => {
        switch (id) {
            case "pack-1":
                return "from-yellow-400 to-orange-500"
            case "pack-3":
                return "from-pink-400 to-red-500"
            case "pack-5":
                return "from-cyan-400 to-indigo-500"
            default:
                return "from-yellow-400 to-yellow-600"
        }
    }

    const badgeButtonByPack = (id?: string) => {
        switch (id) {
            case "pack-1":
                return "bg-yellow-400/15 border border-yellow-400/30 text-yellow-300 hover:bg-yellow-400/20"
            case "pack-3":
                return "bg-pink-400/15 border border-pink-400/30 text-pink-300 hover:bg-pink-400/20"
            case "pack-5":
                return "bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/20"
            default:
                return "bg-yellow-400/15 border border-yellow-400/30 text-yellow-300 hover:bg-yellow-400/20"
        }
    }

    if (mode === "pack") {
        if (packId === 'pack-infinity') {
            if (user) {
                return (
                    <Link href={`/stars/purchase?pack=${encodeURIComponent(packId)}`}>
                        <Button className={`w-full rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 hover:bg-amber-400/20 transition-shadow flex items-center justify-center gap-2`}>
                            <Star className='w-4 h-4' />
                            Purchase
                        </Button>
                    </Link>
                )
            }
            return (
                <Link href={`/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
                    <Button className={`w-full rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 hover:bg-amber-400/20 transition-shadow flex items-center justify-center gap-2`}>
                        <Users className='w-4 h-4' />
                        Sign in to purchase
                    </Button>
                </Link>
            )
        }
        if (user) {
            return (
                <Link href={`/stars/purchase?pack=${encodeURIComponent(packId || "")}`}>
                    <Button className={`w-full rounded-full ${badgeButtonByPack(packId)} transition-shadow flex items-center justify-center gap-2`}>
                        <Star className='w-4 h-4' />
                        Purchase
                    </Button>
                </Link>
            )
        }
        return (
            <Link href={`/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
                <Button className={`w-full rounded-full ${badgeButtonByPack(packId)} transition-shadow flex items-center justify-center gap-2`}>
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

