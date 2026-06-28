"use client"

export type HBarItem = {
    key: string
    label: string
    value: number
    color?: string
}

/**
 * Horizontal bar list with smoothly animated widths. Reused by the
 * readings-per-user distribution and the popular-categories chart.
 */
export function HBars({
    items,
    showPct = false,
    valueFormat = (v) => v.toLocaleString(),
    defaultColor = "#fbbf24",
}: {
    items: HBarItem[]
    showPct?: boolean
    valueFormat?: (v: number) => string
    defaultColor?: string
}) {
    const total = items.reduce((a, b) => a + b.value, 0)
    const max = Math.max(1, ...items.map((i) => i.value))

    return (
        <div className="space-y-2.5">
            {items.map((it) => {
                const widthPct = (it.value / max) * 100
                const sharePct = total > 0 ? (it.value / total) * 100 : 0
                return (
                    <div key={it.key} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 truncate text-xs text-white/60">
                            {it.label}
                        </span>
                        <div className="h-5 flex-1 overflow-hidden rounded-md bg-white/[0.04]">
                            <div
                                className="h-full rounded-md transition-[width] duration-700 ease-out"
                                style={{
                                    width: `${widthPct}%`,
                                    backgroundColor: it.color ?? defaultColor,
                                    opacity: 0.85,
                                }}
                            />
                        </div>
                        <span className="w-16 shrink-0 text-right text-xs font-medium text-white/80">
                            {showPct
                                ? `${sharePct.toFixed(0)}%`
                                : valueFormat(it.value)}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}
