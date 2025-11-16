"use client"

import { useAvailabilityCountdown } from "@/hooks/use-availability-countdown"
import { cn } from "@/lib/utils"

type Props = {
    fallbackLabel?: string
    className?: string
}

export function LiveAvailabilityLabel({ fallbackLabel, className }: Props) {
    const { label } = useAvailabilityCountdown()
    const text = label ?? fallbackLabel
    if (!text) return null
    return (
        <span className={cn("text-xs font-semibold text-black/70", className)}>
            {text}
        </span>
    )
}
