"use client"

import { cn } from "@/lib/utils"

export default function BrandLoader({
    className,
    label = "Asking Fate",
}: {
    className?: string
    label?: string
}) {
    return (
        <div
            className={cn(
                "w-full min-h-screen text-center select-none relative",
                className
            )}
            aria-live='polite'
            aria-busy='true'
        >
            <div className='absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-3 w-full'>
                <div className='absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse' />
                <div className='w-14 h-14 relative rounded-full bg-white/20 flex items-center justify-center border border-primary/30 shadow-[0_10px_30px_-10px_rgba(99,102,241,0.35)]'>
                    <span className='text-white font-serif text-xl animate-spin'>
                        ✦
                    </span>
                </div>
                <div className='font-serif font-semibold text-white tracking-wide w-full'>
                    {label}
                </div>
            </div>
        </div>
    )
}
