"use client"

import { Checkout } from "../checkout"
import { Star } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { ChevronDown } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

const packs = [
    { id: "pack-1", stars: 60 },
    { id: "pack-2", stars: 130 },
    { id: "pack-3", stars: 200 },
    { id: "pack-5", stars: 350 },
    { id: "pack-7", stars: 500 },
]

export default function OneTapTopUp() {
    const { user } = useAuth()
    return (
        <>
            {user && (
                <div className='w-full max-w-2xl mx-auto'>
                    <div className='grid grid-cols-3 md:grid-cols-6 gap-2'>
                        {packs.map((p) => (
                            <Checkout
                                key={p.id}
                                mode='pack'
                                packId={p.id}
                                customTrigger={
                                    <button
                                        type='button'
                                        className='w-full rounded-full border border-yellow-500/40 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 hover:from-yellow-400/30 hover:to-yellow-600/30 text-yellow-200 px-3 py-1.5 flex items-center justify-center gap-1.5 transition'
                                    >
                                        <Star
                                            className='w-3.5 h-3.5'
                                            fill='currentColor'
                                        />
                                        <span className='text-sm font-semibold'>
                                            {p.stars}
                                        </span>
                                    </button>
                                }
                            />
                        ))}
                        <Checkout
                            mode='pack'
                            packId='pack-infinity'
                            infinityTerm='month'
                            customTrigger={
                                <button
                                    type='button'
                                    className='w-full h-8 rounded-full border border-yellow-500/40 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 hover:from-yellow-400/30 hover:to-yellow-600/30 text-yellow-200 px-3 py-0 text-sm font-semibold flex items-center justify-center gap-1.5 transition'
                                >
                                    <Star
                                        className='w-3.5 h-3.5'
                                        fill='currentColor'
                                    />
                                    <span className='text-xl leading-none'>
                                        ∞
                                    </span>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <span
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                }}
                                                className='inline-flex items-center justify-center'
                                                role='button'
                                                aria-label='Choose infinity term'
                                            >
                                                <ChevronDown className='w-4 h-4' />
                                            </span>
                                        </PopoverTrigger>
                                        <PopoverContent className='w-56 bg-card/95 border-border/30 p-2 space-y-1'>
                                            <Checkout
                                                mode='pack'
                                                packId='pack-infinity'
                                                infinityTerm='month'
                                                customTrigger={
                                                    <button className='w-full text-left text-sm px-2 py-1 rounded hover:bg-white/10'>
                                                        One month $9.99
                                                    </button>
                                                }
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </button>
                            }
                        />
                    </div>
                    <div className='mt-2'>
                        <Checkout
                            mode='subscribe'
                            plan='monthly'
                            customTrigger={
                                <button
                                    type='button'
                                    className='w-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border border-yellow-500/40 hover:from-yellow-300 hover:to-yellow-500 transition px-4 py-2 text-sm font-semibold relative'
                                >
                                    <span>Subscribe (Unlimited)</span>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <span
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                }}
                                                className='absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center'
                                                role='button'
                                                aria-label='Choose subscription term'
                                            >
                                                <ChevronDown className='w-4 h-4' />
                                            </span>
                                        </PopoverTrigger>
                                        <PopoverContent className='w-44 bg-card/95 border-border/30 p-2 space-y-1'>
                                            <Checkout
                                                mode='subscribe'
                                                plan='monthly'
                                                customTrigger={
                                                    <button className='w-full text-left text-sm px-2 py-1 rounded hover:bg-white/10'>
                                                        Monthly $9.99
                                                    </button>
                                                }
                                            />
                                            <Checkout
                                                mode='subscribe'
                                                plan='annual'
                                                customTrigger={
                                                    <button className='w-full text-left text-sm px-2 py-1 rounded hover:bg-white/10'>
                                                        Annual $99.99
                                                    </button>
                                                }
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </button>
                            }
                        />
                    </div>
                </div>
            )}
        </>
    )
}
