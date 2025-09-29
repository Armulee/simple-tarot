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

    if (mode === "pack") {
        if (user) {
            return (
                <Link href={`/stars/purchase?pack=${encodeURIComponent(packId || "")}`}>
                    <Button className={`w-full rounded-full bg-gradient-to-r ${gradientByPack(packId)} text-black border border-white/20 hover:brightness-110 transition-shadow flex items-center justify-center gap-2`}>
                        <Star className='w-4 h-4' />
                        Purchase
                    </Button>
                </Link>
            )
        }
        return (
            <Link href={`/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
                <Button className={`w-full rounded-full bg-gradient-to-r ${gradientByPack(packId)} text-black border border-white/20 hover:brightness-110 transition-shadow flex items-center justify-center gap-2`}>
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

