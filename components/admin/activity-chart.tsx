"use client"

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { Activity, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { supabase } from "@/lib/supabase"
import type {
    AdminActivityResponse,
    ActivityGranularity,
    ActivityPoint,
} from "@/app/api/admin/activity/route"

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

// SVG coordinate space (scaled responsively via viewBox).
const W = 760
const H = 260
const PAD = { top: 16, right: 18, bottom: 30, left: 44 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

const PLAYS_COLOR = "#fbbf24" // amber-400
const SIGNUPS_COLOR = "#34d399" // emerald-400

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

export default function AdminActivityChart() {
    const t = useTranslations("Admin")
    const [range, setRange] = useState<RangeKey>("7d")
    const [customFrom, setCustomFrom] = useState("")
    const [customTo, setCustomTo] = useState("")
    const [data, setData] = useState<AdminActivityResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [hover, setHover] = useState<number | null>(null)
    const wrapRef = useRef<HTMLDivElement>(null)

    const locale =
        typeof navigator !== "undefined" ? navigator.language : "en-US"

    const fetchData = useCallback(
        async (fromISO: string, toISO: string) => {
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
                    {
                        headers: {
                            Authorization: `Bearer ${session.access_token}`,
                        },
                    },
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
        },
        [],
    )

    // Resolve the active [from, to] window from the chosen range.
    useEffect(() => {
        if (range === "custom") {
            if (!customFrom || !customTo) return
            fetchData(customFrom, customTo)
            return
        }
        const now = new Date()
        const to = toISODate(now)
        const from = toISODate(
            new Date(now.getTime() - (RANGE_DAYS[range] - 1) * 86400000),
        )
        fetchData(from, to)
    }, [range, customFrom, customTo, fetchData])

    const points: ActivityPoint[] = useMemo(
        () => data?.points ?? [],
        [data],
    )
    const granularity = data?.granularity ?? "day"

    const maxY = useMemo(() => {
        let m = 0
        for (const p of points) m = Math.max(m, p.plays, p.signups)
        return niceCeil(m || 1)
    }, [points])

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

    const linePath = useCallback(
        (key: "plays" | "signups") => {
            if (points.length === 0) return ""
            return points
                .map(
                    (p, i) =>
                        `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(p[key]).toFixed(1)}`,
                )
                .join(" ")
        },
        [points, xFor, yFor],
    )

    const yTicks = useMemo(() => {
        const n = 4
        return Array.from({ length: n + 1 }, (_, i) => (maxY / n) * i)
    }, [maxY])

    const xTickIdx = useMemo(() => {
        const n = Math.min(points.length, 6)
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
            // Map pixel fraction into plot coordinates → nearest index.
            const plotFrac =
                (xFrac * W - PAD.left) / PLOT_W
            const idx = Math.round(plotFrac * (points.length - 1))
            setHover(Math.max(0, Math.min(points.length - 1, idx)))
        },
        [points.length],
    )

    const totals = data?.totals ?? { plays: 0, signups: 0 }

    return (
        <div className='rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                    <div className='flex items-center gap-2 text-amber-400/80'>
                        <Activity className='h-4 w-4' />
                        <span className='text-xs font-medium uppercase tracking-wider'>
                            {t("activityLabel")}
                        </span>
                    </div>
                    <h2 className='mt-1.5 font-serif text-xl font-semibold text-white'>
                        {t("activityTitle")}
                    </h2>
                </div>

                <div className='flex flex-wrap gap-1.5'>
                    {RANGES.map((r) => (
                        <button
                            key={r}
                            type='button'
                            onClick={() => setRange(r)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                                range === r
                                    ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/40"
                                    : "text-white/55 hover:bg-white/5 hover:text-white/80"
                            }`}
                        >
                            {t(`range_${r}`)}
                        </button>
                    ))}
                </div>
            </div>

            {range === "custom" ? (
                <div className='mt-4 flex flex-wrap items-center gap-2 text-sm'>
                    <input
                        type='date'
                        value={customFrom}
                        max={customTo || toISODate(new Date())}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className='rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white outline-none focus:border-amber-400/40 [color-scheme:dark]'
                    />
                    <span className='text-white/40'>—</span>
                    <input
                        type='date'
                        value={customTo}
                        min={customFrom}
                        max={toISODate(new Date())}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className='rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white outline-none focus:border-amber-400/40 [color-scheme:dark]'
                    />
                </div>
            ) : null}

            {/* Legend + totals */}
            <div className='mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm'>
                <span className='flex items-center gap-2'>
                    <span
                        className='inline-block h-2.5 w-2.5 rounded-full'
                        style={{ backgroundColor: PLAYS_COLOR }}
                    />
                    <span className='text-white/70'>{t("activityPlays")}</span>
                    <span className='font-medium text-white'>
                        {totals.plays.toLocaleString()}
                    </span>
                </span>
                <span className='flex items-center gap-2'>
                    <span
                        className='inline-block h-2.5 w-2.5 rounded-full'
                        style={{ backgroundColor: SIGNUPS_COLOR }}
                    />
                    <span className='text-white/70'>
                        {t("activitySignups")}
                    </span>
                    <span className='font-medium text-white'>
                        {totals.signups.toLocaleString()}
                    </span>
                </span>
            </div>

            {/* Chart */}
            <div
                ref={wrapRef}
                className='relative mt-4'
                onMouseMove={onMove}
                onMouseLeave={() => setHover(null)}
            >
                {error ? (
                    <div className='flex h-[260px] items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/5 text-sm text-rose-200/80'>
                        {t("listError")}
                    </div>
                ) : loading && !data ? (
                    <div className='flex h-[260px] items-center justify-center text-white/40'>
                        <Loader2 className='h-6 w-6 animate-spin' />
                    </div>
                ) : points.length === 0 ? (
                    <div className='flex h-[260px] items-center justify-center text-sm text-white/40'>
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
                            {/* Y gridlines + labels */}
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
                                            x={PAD.left - 8}
                                            y={y + 3}
                                            textAnchor='end'
                                            fontSize={10}
                                            fill='rgba(255,255,255,0.4)'
                                        >
                                            {Math.round(v)}
                                        </text>
                                    </g>
                                )
                            })}

                            {/* X labels */}
                            {xTickIdx.map((idx) => (
                                <text
                                    key={idx}
                                    x={xFor(idx)}
                                    y={H - 10}
                                    textAnchor='middle'
                                    fontSize={10}
                                    fill='rgba(255,255,255,0.4)'
                                >
                                    {formatTick(
                                        points[idx].date,
                                        granularity,
                                        locale,
                                    )}
                                </text>
                            ))}

                            {/* Hover guide */}
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

                            {/* Lines */}
                            <path
                                d={linePath("plays")}
                                fill='none'
                                stroke={PLAYS_COLOR}
                                strokeWidth={2}
                                strokeLinejoin='round'
                                strokeLinecap='round'
                                vectorEffect='non-scaling-stroke'
                            />
                            <path
                                d={linePath("signups")}
                                fill='none'
                                stroke={SIGNUPS_COLOR}
                                strokeWidth={2}
                                strokeLinejoin='round'
                                strokeLinecap='round'
                                vectorEffect='non-scaling-stroke'
                            />

                            {/* Hover dots */}
                            {hover != null ? (
                                <>
                                    <circle
                                        cx={xFor(hover)}
                                        cy={yFor(points[hover].plays)}
                                        r={3.5}
                                        fill={PLAYS_COLOR}
                                    />
                                    <circle
                                        cx={xFor(hover)}
                                        cy={yFor(points[hover].signups)}
                                        r={3.5}
                                        fill={SIGNUPS_COLOR}
                                    />
                                </>
                            ) : null}
                        </svg>

                        {/* Tooltip */}
                        {hover != null ? (
                            <div
                                className='pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border border-white/15 bg-slate-900/95 px-3 py-2 text-xs shadow-xl'
                                style={{
                                    left: `${(xFor(hover) / W) * 100}%`,
                                }}
                            >
                                <div className='mb-1 font-medium text-white/80'>
                                    {new Date(
                                        points[hover].date,
                                    ).toLocaleDateString(locale, {
                                        year: "numeric",
                                        month: "short",
                                        day:
                                            granularity === "month"
                                                ? undefined
                                                : "numeric",
                                    })}
                                </div>
                                <div className='flex items-center gap-2 whitespace-nowrap'>
                                    <span
                                        className='inline-block h-2 w-2 rounded-full'
                                        style={{ backgroundColor: PLAYS_COLOR }}
                                    />
                                    <span className='text-white/60'>
                                        {t("activityPlays")}
                                    </span>
                                    <span className='ml-auto font-medium text-white'>
                                        {points[hover].plays.toLocaleString()}
                                    </span>
                                </div>
                                <div className='mt-0.5 flex items-center gap-2 whitespace-nowrap'>
                                    <span
                                        className='inline-block h-2 w-2 rounded-full'
                                        style={{
                                            backgroundColor: SIGNUPS_COLOR,
                                        }}
                                    />
                                    <span className='text-white/60'>
                                        {t("activitySignups")}
                                    </span>
                                    <span className='ml-auto font-medium text-white'>
                                        {points[hover].signups.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ) : null}

                        {loading ? (
                            <div className='absolute right-2 top-2'>
                                <Loader2 className='h-4 w-4 animate-spin text-white/40' />
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    )
}
