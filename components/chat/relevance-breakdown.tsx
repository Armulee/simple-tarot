"use client"

export type RelevanceStat = {
    label: string
    pct: number
    color: string
}

type Props = {
    stats: RelevanceStat[]
}

export function RelevanceBreakdown({ stats }: Props) {
    const visible = stats.filter((s) => s.pct > 0)
    if (visible.length === 0) return null

    return (
        <div className='space-y-2'>
            <div className='flex gap-2'>
                {visible.map((s) => (
                    <div
                        key={s.label}
                        className='relative flex flex-col items-center justify-center overflow-hidden'
                        style={{
                            flex: s.pct,
                            minWidth: 0,
                            padding: "12px 10px 10px",
                            borderRadius: 14,
                            backgroundColor: `${s.color}25`,
                            border: `1px solid ${s.color}25`,
                        }}
                    >
                        <span className='text-[20px] font-light leading-none text-white'>
                            {Math.round(s.pct)}%
                        </span>
                        <span
                            className='mt-1 max-w-full truncate text-[10px]'
                            style={{ color: "rgba(255,255,255,0.45)" }}
                        >
                            {s.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
