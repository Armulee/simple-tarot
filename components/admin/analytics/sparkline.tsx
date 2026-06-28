"use client"

import { useId } from "react"

/**
 * Tiny gradient-filled trend line with no axes — for KPI cards.
 * Scales to its container width via a viewBox; renders nothing useful
 * for <2 points (caller can decide to hide it).
 */
export function Sparkline({
    values,
    color = "#a78bfa",
    className,
    height = 36,
}: {
    values: number[]
    color?: string
    className?: string
    height?: number
}) {
    const gid = useId()
    const W = 120
    const H = height
    const pad = 3

    if (!values || values.length < 2) {
        return <div className={className} style={{ height: H }} aria-hidden />
    }

    const max = Math.max(...values)
    const min = Math.min(...values)
    const span = max - min || 1
    const stepX = (W - pad * 2) / (values.length - 1)
    const x = (i: number) => pad + i * stepX
    const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2)

    const line = values
        .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
        .join(" ")
    const area = `${line} L${x(values.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className={className}
            preserveAspectRatio="none"
            style={{ width: "100%", height: H }}
        >
            <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gid})`} />
            <path
                d={line}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    )
}
