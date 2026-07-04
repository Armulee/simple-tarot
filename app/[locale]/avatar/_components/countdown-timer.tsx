"use client"

import { cn } from "@/lib/utils"

/**
 * On-screen countdown for a paid minute (e.g. 0:60 → 0:00). Turns amber, then
 * red+pulsing as it nears zero so the user is warned before the session ends.
 */
export function CountdownTimer({ seconds }: { seconds: number }) {
    const mm = Math.floor(seconds / 60)
    const ss = seconds % 60
    const nearEnd = seconds <= 10
    const warning = seconds <= 20

    return (
        <div
            className={cn(
                "pointer-events-none absolute top-3 right-3 rounded-full px-3 py-1 text-sm font-semibold tabular-nums backdrop-blur-md",
                "border border-white/15 bg-black/40 text-white shadow-lg",
                warning && "text-amber-300",
                nearEnd && "animate-pulse text-red-400",
            )}
            aria-live="polite"
        >
            {mm}:{ss.toString().padStart(2, "0")}
        </div>
    )
}
