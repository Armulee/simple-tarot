"use client"

import { Checkout } from "../checkout"
import { Star, Zap } from "lucide-react"
import type { CurrencyCode } from "@/lib/payments/currency-utils"
import { STAR_PACKS, getPackPriceId } from "@/lib/payments/star-products"

type Pack = {
    id: string
    stars: number
    name: string
    color: string
}

const packs: Pack[] = STAR_PACKS.filter((sp) => !!sp.id).map((sp) => ({
    id: sp.id ?? "",
    stars: sp.stars,
    name: sp.name,
    color: "yellow",
}))

const getColorClasses = (color: string) => {
    const colorMap = {
        blue: {
            bg: "from-blue-400/20 to-cyan-500/20",
            hoverBg: "hover:from-blue-400/30 hover:to-cyan-500/30",
            border: "border-blue-500/40",
            text: "text-blue-200",
            icon: "text-blue-300",
        },
        green: {
            bg: "from-green-400/20 to-emerald-500/20",
            hoverBg: "hover:from-green-400/30 hover:to-emerald-500/30",
            border: "border-green-500/40",
            text: "text-green-200",
            icon: "text-green-300",
        },
        purple: {
            bg: "from-purple-400/20 to-violet-500/20",
            hoverBg: "hover:from-purple-400/30 hover:to-violet-500/30",
            border: "border-purple-500/40",
            text: "text-purple-200",
            icon: "text-purple-300",
        },
        amber: {
            bg: "from-amber-400/20 to-orange-500/20",
            hoverBg: "hover:from-amber-400/30 hover:to-orange-500/30",
            border: "border-amber-500/40",
            text: "text-amber-200",
            icon: "text-amber-300",
        },
        rose: {
            bg: "from-rose-400/20 to-pink-500/20",
            hoverBg: "hover:from-rose-400/30 hover:to-pink-500/30",
            border: "border-rose-500/40",
            text: "text-rose-200",
            icon: "text-rose-300",
        },
        yellow: {
            bg: "from-amber-300/25 via-yellow-400/20 to-orange-400/25",
            hoverBg:
                "hover:from-amber-300/35 hover:via-yellow-400/30 hover:to-orange-400/35",
            border: "border-gradient-to-r border-amber-400/50 border-yellow-500/40 border-orange-400/50",
            text: "text-amber-100",
            icon: "text-amber-200",
        },
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.blue
}

type OneTapTopUpProps = {
    currency: CurrencyCode
    locale?: string
}

export default function OneTapTopUp({ currency }: OneTapTopUpProps) {
    return (
        <div className='w-full max-w-5xl mx-auto'>
            {/* Star Packs Grid */}
            <div className='mb-8'>
                <div className='grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-6 gap-4'>
                    {packs.map((p, idx) => {
                        const colors = getColorClasses(p.color)
                        const sp = STAR_PACKS[idx]
                        const packId = sp ? getPackPriceId(sp, currency) : p.id
                        return (
                            <Checkout
                                key={p.id}
                                mode='addon'
                                packId={packId}
                                currency={currency}
                                customTrigger={
                                    <button
                                        type='button'
                                        className={`group relative w-full rounded-2xl border border-amber-400/50 bg-gradient-to-br ${colors.bg} ${colors.hoverBg} ${colors.text} p-3 flex flex-col items-center gap-3 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/25 overflow-hidden`}
                                    >
                                        {/* Modern gradient background */}
                                        <div className='absolute inset-0 bg-gradient-to-br from-amber-300/20 via-yellow-400/15 to-orange-400/20 group-hover:from-amber-300/30 group-hover:via-yellow-400/25 group-hover:to-orange-400/30 transition-all duration-500' />

                                        {/* Animated star field background */}
                                        <div className='absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-500'>
                                            <div className='absolute top-2 left-3 w-1 h-1 bg-amber-200 rounded-full animate-star-twinkle' />
                                            <div className='absolute top-4 right-4 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-star-twinkle-2 delay-100' />
                                            <div className='absolute bottom-3 left-4 w-1 h-1 bg-orange-200 rounded-full animate-star-twinkle-3 delay-200' />
                                            <div className='absolute bottom-2 right-2 w-1 h-1 bg-amber-300 rounded-full animate-star-twinkle delay-300' />
                                            <div className='absolute top-1/2 left-2 w-1 h-1 bg-yellow-200 rounded-full animate-star-twinkle-2 delay-400' />
                                            <div className='absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-orange-300 rounded-full animate-star-twinkle-3 delay-500' />
                                            <div className='absolute bottom-1/3 right-1/4 w-1 h-1 bg-amber-400 rounded-full animate-star-twinkle delay-700' />
                                        </div>

                                        {/* Animated background glow */}
                                        <div
                                            className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colors.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl`}
                                        />

                                        {/* Content */}
                                        <div className='relative z-10 flex items-center gap-2'>
                                            <div
                                                className={`p-2 rounded-full bg-gradient-to-br from-amber-300/30 via-yellow-400/25 to-orange-400/30 border border-amber-400/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 relative overflow-hidden`}
                                            >
                                                {/* Star sparkle effect */}
                                                <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse' />

                                        <Star
                                            className={`w-5 h-5 ${colors.icon} drop-shadow-sm group-hover:animate-spin-slow`}
                                            fill='currentColor'
                                        />
                                            </div>

                                            <div className='text-center'>
                                                <p
                                                    className={`text-xl font-bold ${colors.text} drop-shadow-sm`}
                                                >
                                            {p.stars}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Enhanced hover effect indicator */}
                                        <div
                                            className={`absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-amber-400/40 to-yellow-500/40 border border-amber-300/50 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110`}
                                        >
                                            <Zap className='w-2.5 h-2.5 text-white m-0.5 drop-shadow-sm' />
                                        </div>

                                        {/* Modern border glow effect */}
                                        <div className='absolute inset-0 rounded-2xl border border-amber-400/30 group-hover:border-amber-400/60 transition-colors duration-300' />
                                    </button>
                                }
                            />
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
