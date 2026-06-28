"use client"

import { useCallback, useMemo, useRef, useState } from "react"

export type ChartSeries = {
    key: string
    label: string
    color: string
    values: number[]
    dashed?: boolean
}

const W = 720

/**
 * Generic responsive multi-series line chart with hover tooltip and gradient
 * fills. All series must share the same x-axis (same `values.length` as
 * `xLabels`). Used by the analytics sections (retention curve, trends…).
 */
export function LineChart({
    series,
    xLabels,
    height = 240,
    yFormat = (v) => `${v}`,
    area = true,
}: {
    series: ChartSeries[]
    xLabels: string[]
    height?: number
    yFormat?: (v: number) => string
    area?: boolean
}) {
    const H = height
    const PAD = { top: 16, right: 18, bottom: 28, left: 44 }
    const PLOT_W = W - PAD.left - PAD.right
    const PLOT_H = H - PAD.top - PAD.bottom
    const n = xLabels.length

    const [hover, setHover] = useState<number | null>(null)
    const wrapRef = useRef<HTMLDivElement>(null)

    const domainMax = useMemo(() => {
        let m = 0
        for (const s of series) for (const v of s.values) m = Math.max(m, v)
        return m > 0 ? m * 1.15 : 1
    }, [series])

    const xFor = useCallback(
        (i: number) =>
            n <= 1 ? PAD.left + PLOT_W / 2 : PAD.left + (i / (n - 1)) * PLOT_W,
        [n, PLOT_W, PAD.left],
    )
    const yFor = useCallback(
        (v: number) => PAD.top + PLOT_H - (v / domainMax) * PLOT_H,
        [domainMax, PLOT_H, PAD.top],
    )

    const pathFor = useCallback(
        (vals: number[]) =>
            vals
                .map(
                    (v, i) =>
                        `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`,
                )
                .join(" "),
        [xFor, yFor],
    )

    const yTicks = useMemo(
        () => Array.from({ length: 5 }, (_, i) => (domainMax / 4) * i),
        [domainMax],
    )
    const xTickIdx = useMemo(() => {
        const count = Math.min(n, 6)
        if (n <= 1) return [0]
        return Array.from({ length: count }, (_, i) =>
            Math.round((i / (count - 1)) * (n - 1)),
        )
    }, [n])

    const onMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (n === 0) return
            const rect = wrapRef.current?.getBoundingClientRect()
            if (!rect) return
            const frac = (e.clientX - rect.left) / rect.width
            const idx = Math.round(((frac * W - PAD.left) / PLOT_W) * (n - 1))
            setHover(Math.max(0, Math.min(n - 1, idx)))
        },
        [n, PLOT_W, PAD.left],
    )

    return (
        <div
            ref={wrapRef}
            className="relative"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
        >
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full"
                style={{ height: "auto" }}
                preserveAspectRatio="none"
            >
                <defs>
                    {series.map((s) => (
                        <linearGradient
                            key={s.key}
                            id={`lc-${s.key}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                            <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                        </linearGradient>
                    ))}
                </defs>

                {yTicks.map((v, i) => {
                    const y = yFor(v)
                    return (
                        <g key={i}>
                            <line
                                x1={PAD.left}
                                y1={y}
                                x2={W - PAD.right}
                                y2={y}
                                stroke="rgba(255,255,255,0.07)"
                                strokeWidth={1}
                            />
                            <text
                                x={PAD.left - 6}
                                y={y + 3}
                                textAnchor="end"
                                fontSize={10}
                                fill="rgba(255,255,255,0.4)"
                            >
                                {yFormat(v)}
                            </text>
                        </g>
                    )
                })}

                {xTickIdx.map((idx) => (
                    <text
                        key={idx}
                        x={xFor(idx)}
                        y={H - 9}
                        textAnchor="middle"
                        fontSize={10}
                        fill="rgba(255,255,255,0.4)"
                    >
                        {xLabels[idx]}
                    </text>
                ))}

                {hover != null ? (
                    <line
                        x1={xFor(hover)}
                        y1={PAD.top}
                        x2={xFor(hover)}
                        y2={PAD.top + PLOT_H}
                        stroke="rgba(255,255,255,0.25)"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                    />
                ) : null}

                {area
                    ? series.map((s) => {
                          const base = yFor(0)
                          const d = `${pathFor(s.values)} L${xFor(n - 1).toFixed(1)},${base.toFixed(1)} L${xFor(0).toFixed(1)},${base.toFixed(1)} Z`
                          return (
                              <path key={s.key} d={d} fill={`url(#lc-${s.key})`} />
                          )
                      })
                    : null}

                {series.map((s) => (
                    <path
                        key={s.key}
                        d={pathFor(s.values)}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={2}
                        strokeDasharray={s.dashed ? "5 4" : undefined}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                    />
                ))}

                {hover != null
                    ? series.map((s) => (
                          <circle
                              key={s.key}
                              cx={xFor(hover)}
                              cy={yFor(s.values[hover])}
                              r={3.5}
                              fill={s.color}
                          />
                      ))
                    : null}
            </svg>

            {hover != null ? (
                <div
                    className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-lg border border-white/15 bg-slate-900/95 px-2.5 py-1.5 text-xs shadow-xl"
                    style={{ left: `${(xFor(hover) / W) * 100}%` }}
                >
                    <div className="mb-1 font-medium text-white/70">
                        {xLabels[hover]}
                    </div>
                    {series.map((s) => (
                        <div
                            key={s.key}
                            className="flex items-center gap-2 whitespace-nowrap"
                        >
                            <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ backgroundColor: s.color }}
                            />
                            <span className="text-white/60">{s.label}</span>
                            <span className="ml-auto pl-3 font-medium text-white">
                                {yFormat(s.values[hover])}
                            </span>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    )
}
