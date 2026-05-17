"use client"

import type { ComponentType } from "react"

export function SectionHeader({
    icon: Icon,
    label,
}: {
    icon: ComponentType<{ className?: string }>
    label: string
}) {
    return (
        <div className='flex items-center gap-2'>
            <span className='inline-flex h-5 w-5 items-center justify-center rounded-lg bg-white/[0.05] ring-1 ring-white/10'>
                <Icon className='h-3 w-3 text-white/60' />
            </span>
            <span className='text-[11px] font-medium uppercase tracking-[0.18em] text-white/55'>
                {label}
            </span>
            <span className='h-px flex-1 bg-gradient-to-r from-white/10 to-transparent' />
        </div>
    )
}
