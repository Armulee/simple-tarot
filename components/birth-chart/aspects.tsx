"use client"

import { useMemo } from "react"
import { Sparkles, Triangle } from "lucide-react"
import { useTranslations } from "next-intl"

import { AspectIcon } from "@/components/astrology/aspect-icon"
import { AstroPoint, ZODIAC_SIGNS } from "@/lib/birth-chart-utils"
import { cn } from "@/lib/utils"

type AspectKind =
    | "conjunction"
    | "sextile"
    | "square"
    | "trine"
    | "opposition"

const ASPECT_DEFS: Array<{
    kind: AspectKind
    angle: number
    orb: number
    tone: string
    sentiment: "good" | "challenging" | "neutral"
}> = [
    { kind: "conjunction", angle: 0, orb: 7, tone: "amber", sentiment: "neutral" },
    { kind: "opposition", angle: 180, orb: 7, tone: "rose", sentiment: "challenging" },
    { kind: "trine", angle: 120, orb: 6, tone: "emerald", sentiment: "good" },
    { kind: "square", angle: 90, orb: 6, tone: "orange", sentiment: "challenging" },
    { kind: "sextile", angle: 60, orb: 4, tone: "sky", sentiment: "good" },
]

const TONE_STYLES: Record<string, { dot: string; chip: string; line: string }> = {
    amber: {
        dot: "bg-amber-300",
        chip: "border-amber-300/30 bg-amber-300/[0.08] text-amber-100",
        line: "from-amber-300/60",
    },
    rose: {
        dot: "bg-rose-300",
        chip: "border-rose-300/30 bg-rose-300/[0.08] text-rose-100",
        line: "from-rose-300/60",
    },
    emerald: {
        dot: "bg-emerald-300",
        chip: "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-100",
        line: "from-emerald-300/60",
    },
    orange: {
        dot: "bg-orange-300",
        chip: "border-orange-300/30 bg-orange-300/[0.08] text-orange-100",
        line: "from-orange-300/60",
    },
    sky: {
        dot: "bg-sky-300",
        chip: "border-sky-300/30 bg-sky-300/[0.08] text-sky-100",
        line: "from-sky-300/60",
    },
}

function shortestArc(a: number, b: number): number {
    const raw = Math.abs(a - b) % 360
    return raw > 180 ? 360 - raw : raw
}

function planetLongitude(planet: unknown): number | null {
    if (!planet || typeof planet !== "object") return null
    const sign = (planet as AstroPoint).sign
    const degree = Number((planet as AstroPoint).degree)
    if (!sign || !Number.isFinite(degree)) return null
    const idx = ZODIAC_SIGNS.findIndex(
        (s) => s.toLowerCase() === sign.toLowerCase(),
    )
    if (idx < 0) return null
    return (idx * 30 + degree) % 360
}

export default function BirthChartAspects({
    planets,
    showOverlay,
    onToggleOverlay,
}: {
    planets?: Record<string, unknown> | null
    showOverlay: boolean
    onToggleOverlay: (next: boolean) => void
}) {
    const t = useTranslations("BirthChart")
    const aspects = useMemo(() => {
        if (!planets) return []
        const entries = Object.entries(planets).filter(
            ([key]) => key !== "Ascendant",
        )
        const list: Array<{
            key: string
            a: string
            b: string
            kind: AspectKind
            orb: number
            tone: string
        }> = []
        for (let i = 0; i < entries.length; i++) {
            for (let j = i + 1; j < entries.length; j++) {
                const [aName, aVal] = entries[i]
                const [bName, bVal] = entries[j]
                const aLng = planetLongitude(aVal)
                const bLng = planetLongitude(bVal)
                if (aLng === null || bLng === null) continue
                const sep = shortestArc(aLng, bLng)
                for (const def of ASPECT_DEFS) {
                    const orb = Math.abs(sep - def.angle)
                    if (orb <= def.orb) {
                        list.push({
                            key: `${aName}-${bName}-${def.kind}`,
                            a: aName,
                            b: bName,
                            kind: def.kind,
                            orb,
                            tone: def.tone,
                        })
                        break
                    }
                }
            }
        }
        return list.sort((x, y) => x.orb - y.orb)
    }, [planets])

    const planetLabel = (planet: string) =>
        t(`planets.${planet}`, { defaultValue: planet })
    const aspectLabel = (kind: AspectKind) =>
        t(`aspects.${kind}`, { defaultValue: kind })

    return (
        <section className='space-y-5'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                    <span className='h-px w-8 bg-gradient-to-r from-amber-300/80 to-transparent' />
                    <span className='inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-300/10 ring-1 ring-amber-300/30'>
                        <Triangle className='h-3.5 w-3.5 text-amber-200' />
                    </span>
                    <p className='text-[11px] font-medium uppercase tracking-[0.32em] text-amber-200/80'>
                        {t("aspectsTitle")}
                    </p>
                    <Sparkles className='h-3.5 w-3.5 text-amber-200/70' />
                </div>
                <label className='inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/75 transition-colors hover:border-white/30'>
                    <input
                        type='checkbox'
                        checked={showOverlay}
                        onChange={(e) => onToggleOverlay(e.target.checked)}
                        className='h-3.5 w-3.5 accent-amber-300'
                    />
                    {t("aspectsOverlayToggle")}
                </label>
            </div>

            {aspects.length === 0 ? (
                <p className='text-sm text-white/55'>{t("aspectsEmpty")}</p>
            ) : (
                <ul className='grid grid-cols-1 gap-2'>
                    {aspects.map((a) => {
                        const tone = TONE_STYLES[a.tone] ?? TONE_STYLES.amber
                        return (
                            <li
                                key={a.key}
                                className='group relative flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent px-3 py-2.5 transition-colors hover:border-white/20'
                            >
                                <span
                                    aria-hidden
                                    className={cn(
                                        "pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b to-transparent",
                                        tone.line,
                                    )}
                                />
                                <div className='flex flex-1 items-center justify-between gap-3 pl-2'>
                                    <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]'>
                                        <span className='font-medium text-white'>
                                            {planetLabel(a.a)}
                                        </span>
                                        <span
                                            className={cn(
                                                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                                                tone.chip,
                                            )}
                                        >
                                            <AspectIcon
                                                aspectType={a.kind}
                                                className='h-3 w-3'
                                            />
                                            {aspectLabel(a.kind)}
                                        </span>
                                        <span className='font-medium text-white'>
                                            {planetLabel(a.b)}
                                        </span>
                                    </div>
                                    <span className='shrink-0 font-mono text-[11px] tabular-nums text-white/45'>
                                        {a.orb.toFixed(1)}°
                                    </span>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}
