"use client"

import type { ComponentType, ReactNode } from "react"

export function LuckyTile({
    label,
    Icon,
    children,
}: {
    label: string
    Icon: ComponentType<{ className?: string }>
    children: ReactNode
}) {
    return (
        <div className='rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-3'>
            <div className='flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/50'>
                <Icon className='h-3 w-3' />
                {label}
            </div>
            {children}
        </div>
    )
}
