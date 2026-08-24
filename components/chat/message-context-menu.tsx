"use client"

import type { LucideIcon } from "lucide-react"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { cn } from "@/lib/utils"

/**
 * Per-message actions, reached by long-pressing the bubble (or right-clicking
 * on a desktop) instead of a row of icons under every message.
 *
 * The icon rows were louder than the conversation itself — three or four
 * buttons under each bubble, on both sides. Tucking them behind a press keeps
 * the thread looking like a conversation and still puts every action one
 * gesture away.
 */

export type MessageMenuItem = {
    id: string
    label: string
    icon: LucideIcon
    onSelect: () => void
    disabled?: boolean
    /** Renders the item as currently applied (e.g. an existing reaction). */
    active?: boolean
}

export function MessageContextMenu({
    items,
    disabled = false,
    children,
}: {
    items: MessageMenuItem[]
    disabled?: boolean
    children: React.ReactNode
}) {
    const available = items.filter((item) => !item.disabled)
    if (disabled || available.length === 0) return <>{children}</>

    return (
        <ContextMenu>
            {/* select-none so a long press opens the menu instead of starting
                a text selection — copying is one of the menu items. */}
            <ContextMenuTrigger asChild className='select-none'>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent className='min-w-[10rem] border-white/10 bg-[#13121f]/95 text-white/85 backdrop-blur-xl'>
                {available.map((item) => {
                    const Icon = item.icon
                    return (
                        <ContextMenuItem
                            key={item.id}
                            onSelect={item.onSelect}
                            className={cn(
                                "gap-2 text-[13px] focus:bg-white/10 focus:text-white",
                                item.active && "text-white",
                            )}
                        >
                            <Icon className='size-3.5 shrink-0' />
                            {item.label}
                        </ContextMenuItem>
                    )
                })}
            </ContextMenuContent>
        </ContextMenu>
    )
}
