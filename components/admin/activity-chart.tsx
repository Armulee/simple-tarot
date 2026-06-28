"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { supabase } from "@/lib/supabase"
import {
    type AdminActivityResponse,
    type ActivityGranularity,
    type ActivityPoint,
    type MetricKey,
} from "@/lib/admin/activity-metrics"

type RangeKey = "7d" | "1m" | "3m" | "6m" | "1y" | "5y" | "custom"

const RANGE_DAYS: Record<Exclude<RangeKey, "custom">, number> = {
    "7d": 7,
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
    "5y": 1825,
}

const RANGES: RangeKey[] = ["7d", "1m", "3m", "6m", "1y", "5y", "custom"]

export const METRIC_COLOR: Record<MetricKey, string> = {
    totalUsers: "#a78bfa", // violet-400
    anonymousUsers: "#94a3b8", // slate-400
    authenticatedUsers: "#34d399", // emerald-400
    interpretations: "#fbbf24", // amber-400
    paidSubscribers: "#fb7185", // rose-400
}

// Per-metric chart coordinate space (scaled responsively via viewBox).
const W = 420
const H = 150
const PAD = { top: 12, right: 14, bottom: 24, left: 34 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

function toISODate(d: Date): string {
    const p = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function niceCeil(value: number): number {
    if (value <= 5) return 5
    const pow = Math.pow(10, Math.floor(Math.log10(value)))
    const norm = value / pow
    const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
    return step * pow
}

function formatTick(
    iso: string,
    gran: ActivityGranularity,
    locale: string,
): string {
    const d = new Date(iso)
    if (gran === "month") {
        return d.toLocaleDateString(locale, {
            month: "short",
            year: "2-digit",
        })
    }
    return d.toLocaleDateString(locale, { month: "short", day: "numeric" })
}

export type ActivityController = {
    range: RangeKey
    setRange: (r: RangeKey) => void
    customFrom: string
    setCustomFrom: (v: string) => void
    customTo: string
    setCustomTo: (v: string) => void
    data: AdminActivityResponse | null
    loading: boolean
    error: boolean
    points: ActivityPoint[]
    granularity: ActivityGranularity
    locale: string
    /** Resolved window (YYYY-MM-DD), shared with the analytics endpoint. */
    fromISO: string
    toISO: string
}

/** Shared range + data source for all the per-metric charts. */
export function useActivityData(): ActivityController {
    const [range, setRange] = useState<RangeKey>("7d")
    const [customFrom, setCustomFrom] = useState("")
    const [customTo, setCustomTo] = useState("")
    const [data, setData] = useState<AdminActivityResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    const locale =
        typeof navigator !== "undefined" ? navigator.language : "en-US"

    const fetchData = useCallback(async (fromISO: string, toISO: string) => {
        setLoading(true)
        setError(false)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) {
                setError(true)
                return
            }
            const res = await fetch(
                `/api/admin/activity?from=${fromISO}&to=${toISO}`,
                { headers: { Authorization: `Bearer ${session.access_token}` } },
            )
            if (!res.ok) {
                setError(true)
                return
            }
            setData((await res.json()) as AdminActivityResponse)
        } catch {
            setError(true)
        } finally {
            setLoading(false)
        }
    }, [])

    // The resolved [from, to] window, shared by every chart and the analytics.
    const { fromISO, toISO } = useMemo(() => {
        if (range === "custom") {
            return { fromISO: customFrom, toISO: customTo }
        }
        const now = new Date()
        return {
            toISO: toISODate(now),
            fromISO: toISODate(
                new Date(now.getTime() - (RANGE_DAYS[range] - 1) * 86400000),
            ),
        }
    }, [range, customFrom, customTo])

    useEffect(() => {
        if (!fromISO || !toISO) return
        fetchData(fromISO, toISO)
    }, [fromISO, toISO, fetchData])

    const points = useMemo(() => data?.points ?? [], [data])
    const granularity = data?.granularity ?? "day"

    return {
        range,
        setRange,
        customFrom,
        setCustomFrom,
        customTo,
        setCustomTo,
        data,
        loading,
        error,
        points,
        granularity,
        locale,
        fromISO,
        toISO,
    }
}

/** Shared range buttons + custom date inputs. */
export function ActivityRangeControls({ c }: { c: ActivityController }) {
    const t = useTranslations("Admin")
    return (
        <div className='flex flex-col items-start gap-2'>
            <div className='flex flex-wrap gap-1.5'>
                {RANGES.map((r) => (
                    <button
                        key={r}
                        type='button'
                        onClick={() => c.setRange(r)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                            c.range === r
                                ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/40"
                                : "text-white/55 hover:bg-white/5 hover:text-white/80"
                        }`}
                    >
                        {t(`range_${r}`)}
                    </button>
                ))}
            </div>
            {c.range === "custom" ? (
                <div className='flex flex-wrap items-center gap-2 text-sm'>
                    <input
                        type='date'
                        value={c.customFrom}
                        max={c.customTo || toISODate(new Date())}
                        onChange={(e) => c.setCustomFrom(e.target.value)}
                        className='rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white outline-none focus:border-amber-400/40 [color-scheme:dark]'
                    />
                    <span className='text-white/40'>—</span>
                    <input
                        type='date'
                        value={c.customTo}
                        min={c.customFrom}
                        max={toISODate(new Date())}
                        onChange={(e) => c.setCustomTo(e.target.value)}
                        className='rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white outline-none focus:border-amber-400/40 [color-scheme:dark]'
                    />
                </div>
            ) : null}
        </div>
    )
}

/** A single metric's trend, designed to sit directly under its stat card. */
export function MetricChart({
    metric,
    c,
}: {
    metric: MetricKey
    c: ActivityController
}) {
    const t = useTranslations("Admin")
    const { points, granularity, locale, loading, error } = c
    const color = METRIC_COLOR[metric]
    const [hover, setHover] = useState<number | null>(null)
    const wrapRef = useRef<HTMLDivElement>(null)

    const maxY = useMemo(() => {
        let m = 0
        for (const p of points) m = Math.max(m, p[metric])
        return niceCeil(m || 1)
    }, [points, metric])

    const xFor = useCallback(
        (i: number) => {
            if (points.length <= 1) return PAD.left + PLOT_W / 2
            return PAD.left + (i / (points.length - 1)) * PLOT_W
        },
        [points.length],
    )
    const yFor = useCallback(
        (v: number) => PAD.top + PLOT_H - (v / maxY) * PLOT_H,
        [maxY],
    )

    const linePath = useMemo(() => {
        if (points.length === 0) return ""
        return points
            .map(
                (p, i) =>
                    `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(p[metric]).toFixed(1)}`,
            )
            .join(" ")
    }, [points, metric, xFor, yFor])

    const areaPath = useMemo(() => {
        if (points.length === 0) return ""
        const baseY = yFor(0)
        const lastX = xFor(points.length - 1)
        const firstX = xFor(0)
        return `${linePath} L${lastX.toFixed(1)},${baseY.toFixed(1)} L${firstX.toFixed(1)},${baseY.toFixed(1)} Z`
    }, [linePath, points.length, xFor, yFor])

    const yTicks = useMemo(() => {
        const n = 3
        return Array.from({ length: n + 1 }, (_, i) => (maxY / n) * i)
    }, [maxY])

    const xTickIdx = useMemo(() => {
        const n = Math.min(points.length, 4)
        if (points.length <= 1) return points.map((_, i) => i)
        return Array.from({ length: n }, (_, i) =>
            Math.round((i / (n - 1)) * (points.length - 1)),
        )
    }, [points])

    const onMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (points.length === 0) return
            const rect = wrapRef.current?.getBoundingClientRect()
            if (!rect) return
            const xFrac = (e.clientX - rect.left) / rect.width
            const plotFrac = (xFrac * W - PAD.left) / PLOT_W
            const idx = Math.round(plotFrac * (points.length - 1))
            setHover(Math.max(0, Math.min(points.length - 1, idx)))
        },
        [points.length],
    )

    const gradId = `area-${metric}`
    const showLoading = loading && !c.data

    return (
        <div
            ref={wrapRef}
            className='relative px-1'
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
        >
            {error ? (
                <div className='flex h-[120px] items-center justify-center text-xs text-rose-200/70'>
                    {t("listError")}
                </div>
            ) : showLoading ? (
                <div className='flex h-[120px] items-center justify-center text-white/40'>
                    <Loader2 className='h-5 w-5 animate-spin' />
                </div>
            ) : points.length === 0 ? (
                <div className='flex h-[120px] items-center justify-center text-xs text-white/40'>
                    {t("listEmpty")}
                </div>
            ) : (
                <>
                    <svg
                        viewBox={`0 0 ${W} ${H}`}
                        className='w-full'
                        style={{ height: "auto" }}
                        preserveAspectRatio='none'
                    >
                        <defs>
                            <linearGradient
                                id={gradId}
                                x1='0'
                                y1='0'
                                x2='0'
                                y2='1'
                            >
                                <stop
                                    offset='0%'
                                    stopColor={color}
                                    stopOpacity={0.28}
                                />
                                <stop
                                    offset='100%'
                                    stopColor={color}
                                    stopOpacity={0}
                                />
                            </linearGradient>
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
                                        stroke='rgba(255,255,255,0.07)'
                                        strokeWidth={1}
                                    />
                                    <text
                                        x={PAD.left - 6}
                                        y={y + 3}
                                        textAnchor='end'
                                        fontSize={9}
                                        fill='rgba(255,255,255,0.4)'
                                    >
                                        {Math.round(v)}
                                    </text>
                                </g>
                            )
                        })}

                        {xTickIdx.map((idx) => (
                            <text
                                key={idx}
                                x={xFor(idx)}
                                y={H - 8}
                                textAnchor='middle'
                                fontSize={9}
                                fill='rgba(255,255,255,0.4)'
                            >
                                {formatTick(points[idx].date, granularity, locale)}
                            </text>
                        ))}

                        <path d={areaPath} fill={`url(#${gradId})`} />

                        {hover != null ? (
                            <line
                                x1={xFor(hover)}
                                y1={PAD.top}
                                x2={xFor(hover)}
                                y2={PAD.top + PLOT_H}
                                stroke='rgba(255,255,255,0.25)'
                                strokeWidth={1}
                                strokeDasharray='3 3'
                            />
                        ) : null}

                        <path
                            d={linePath}
                            fill='none'
                            stroke={color}
                            strokeWidth={2}
                            strokeLinejoin='round'
                            strokeLinecap='round'
                            vectorEffect='non-scaling-stroke'
                        />

                        {/* Value labels — shown when the line isn't too dense. */}
                        {points.length <= 16
                            ? points.map((p, i) =>
                                  p[metric] > 0 ? (
                                      <text
                                          key={i}
                                          x={xFor(i)}
                                          y={yFor(p[metric]) - 6}
                                          textAnchor='middle'
                                          fontSize={9}
                                          fontWeight={600}
                                          fill='rgba(255,255,255,0.85)'
                                      >
                                          {p[metric].toLocaleString()}
                                      </text>
                                  ) : null,
                              )
                            : null}

                        {hover != null ? (
                            <circle
                                cx={xFor(hover)}
                                cy={yFor(points[hover][metric])}
                                r={3.5}
                                fill={color}
                            />
                        ) : null}
                    </svg>

                    {hover != null ? (
                        <div
                            className='pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-white/15 bg-slate-900/95 px-2.5 py-1.5 text-xs shadow-xl'
                            style={{ left: `${(xFor(hover) / W) * 100}%` }}
                        >
                            <div className='font-medium text-white/70'>
                                {new Date(points[hover].date).toLocaleDateString(
                                    locale,
                                    {
                                        year: "numeric",
                                        month: "short",
                                        day:
                                            granularity === "month"
                                                ? undefined
                                                : "numeric",
                                    },
                                )}
                            </div>
                            <div className='mt-0.5 flex items-center gap-2 whitespace-nowrap'>
                                <span
                                    className='inline-block h-2 w-2 rounded-full'
                                    style={{ backgroundColor: color }}
                                />
                                <span className='font-medium text-white'>
                                    {points[hover][metric].toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    )
}
