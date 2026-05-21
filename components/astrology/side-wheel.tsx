"use client"

import React, { useMemo } from "react"
import { ZODIAC_SIGNS } from "@/lib/birth-chart-utils"
import { PLANET_ICONS, PLANET_COLORS } from "./summary-icon"
import { cn } from "@/lib/utils"
import { Sparkles, User, Activity, type LucideIcon } from "lucide-react"

interface SideWheelProps {
    side: "left" | "right"
    planets?: Record<string, unknown> | null
    houses?: Record<string, unknown> | null
    title: string
    subtitle: string
}

function normalizeSign(s: string | null) {
    if (!s) return null
    const found = ZODIAC_SIGNS.find((z) => z.toLowerCase() === s.toLowerCase())
    return found ?? s
}

function extractSign(val: unknown): string | null {
    if (!val) return null
    if (typeof val === "string") return normalizeSign(val)
    if (typeof val === "object") {
        const v = val as { sign?: string }
        if (typeof v.sign === "string") return normalizeSign(v.sign)
    }
    return null
}

function extractDegree(val: unknown): number | null {
    if (!val || typeof val !== "object") return null
    const v = val as { degree?: number | string }
    const d = v.degree
    if (typeof d === "number" && Number.isFinite(d)) return d
    if (typeof d === "string") {
        const n = Number(d)
        if (Number.isFinite(n)) return n
    }
    return null
}

const DEFAULT_PLANETS = [
    "Ascendant",
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Rahu",
    "Ketu",
] as const

interface ProcessedPlanet {
    name: string
    sign: string
    deg: number
    zodiacDeg: number
    icon: LucideIcon
    color: string
}

interface HouseLine {
    houseNum: string
    zodiacDeg: number
}

export default function SideWheel({
    side,
    planets,
    houses,
    title,
    subtitle,
}: SideWheelProps) {
    const processedPlanets = useMemo<ProcessedPlanet[]>(() => {
        if (!planets) return []
        return DEFAULT_PLANETS.map((pName) => {
            const val = planets[pName] ?? planets[pName.toLowerCase()]
            const sign = extractSign(val)
            const deg = extractDegree(val)
            if (!sign || deg == null) return null

            const signIdx = ZODIAC_SIGNS.findIndex(
                (s) => s.toLowerCase() === sign.toLowerCase()
            )
            const zodiacDeg = (signIdx * 30 + deg) % 360

            return {
                name: pName,
                sign,
                deg,
                zodiacDeg,
                icon: PLANET_ICONS[pName] || Sparkles,
                color:
                    PLANET_COLORS[pName] ||
                    "text-accent bg-accent/10 border-accent/20",
            }
        }).filter(Boolean) as ProcessedPlanet[]
    }, [planets])

    const houseLines = useMemo<HouseLine[]>(() => {
        if (!houses) return []
        return Object.entries(houses)
            .map(([key, data]) => {
                const houseNum = key.replace(/\D/g, "")
                const sign = extractSign(data)
                const deg = extractDegree(data) || 0
                if (!sign) return null

                const signIdx = ZODIAC_SIGNS.findIndex(
                    (s) => s.toLowerCase() === sign.toLowerCase()
                )
                const zodiacDeg = (signIdx * 30 + deg) % 360
                return { houseNum, zodiacDeg }
            })
            .filter(Boolean) as HouseLine[]
    }, [houses])

    const radius = 240
    const trackCenter = 210
    const innerRadius = 180
    const centerX = side === "left" ? 60 : 290
    const centerY = 325

    const getCoordinates = (zodiacDeg: number, r: number) => {
        let angleDeg
        if (side === "left") {
            angleDeg = (zodiacDeg / 360) * 180 - 90
        } else {
            angleDeg = (zodiacDeg / 360) * 180 + 90
        }

        const angleRad = (angleDeg * Math.PI) / 180
        const x = centerX + r * Math.cos(angleRad)
        const y = centerY + r * Math.sin(angleRad)
        return { x, y, angleDeg }
    }

    return (
        <div
            className={cn(
                "fixed top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center pointer-events-none z-0 transition-all duration-1000 group/wheel",
                side === "left"
                    ? "left-[-60px] items-start hover:left-[-10px]"
                    : "right-[-60px] items-end hover:right-[-10px]",
                "opacity-90 hover:opacity-100"
            )}
        >
            {/* Background Aura - Brighter & More Vibrant */}
            <div
                className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-[600px] h-[600px] blur-[120px] transition-all duration-1000 opacity-40 group-hover/wheel:opacity-70 group-hover/wheel:scale-125",
                    side === "left"
                        ? "left-0 bg-amber-400 shadow-[0_0_200px_rgba(251,191,36,0.6)]"
                        : "right-0 bg-indigo-400 shadow-[0_0_200px_rgba(129,140,248,0.6)]"
                )}
            />

            {/* Title Section - More Contrast */}
            <div
                className={cn(
                    "mb-10 text-center px-4 transition-all duration-700 relative z-10",
                    side === "left"
                        ? "translate-x-32 group-hover/wheel:translate-x-36"
                        : "-translate-x-32 group-hover/wheel:-translate-x-36"
                )}
            >
                <div className='flex flex-col items-center gap-3'>
                    <div
                        className={cn(
                            "p-4 rounded-2xl border-2 transition-all duration-700 group-hover/wheel:scale-110",
                            side === "left"
                                ? "bg-amber-400 border-amber-300 text-amber-950 group-hover/wheel:shadow-[0_0_40px_rgba(251,191,36,0.8)]"
                                : "bg-indigo-400 border-indigo-300 text-indigo-950 group-hover/wheel:shadow-[0_0_40px_rgba(129,140,248,0.8)]"
                        )}
                    >
                        {side === "left" ? (
                            <User size={28} strokeWidth={3} />
                        ) : (
                            <Activity size={28} strokeWidth={3} />
                        )}
                    </div>

                    <div className='space-y-1'>
                        <p
                            className={cn(
                                "text-xs font-black uppercase tracking-[0.5em] drop-shadow-md",
                                side === "left"
                                    ? "text-amber-300"
                                    : "text-indigo-300"
                            )}
                        >
                            {subtitle}
                        </p>
                        <h3 className='text-4xl font-serif font-black text-white tracking-widest drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]'>
                            {title}
                        </h3>
                    </div>

                    <div
                        className={cn(
                            "mt-4 p-4 rounded-2xl bg-white/20 border-2 border-white/30 backdrop-blur-2xl transition-all duration-500 group-hover/wheel:bg-white/30 group-hover/wheel:border-white/50",
                            "text-[11px] font-black text-white uppercase tracking-[0.2em] max-w-[200px] leading-relaxed shadow-2xl",
                            side === "left"
                                ? "text-left border-l-4 border-l-amber-400"
                                : "text-right border-r-4 border-r-indigo-400"
                        )}
                    >
                        {side === "left"
                            ? "The celestial blueprint of your birth moment."
                            : "The current planetary flows in the sky."}
                    </div>
                </div>
            </div>

            <svg
                width='350'
                height='650'
                viewBox='0 0 350 650'
                className='overflow-visible relative z-10'
            >
                <defs>
                    <radialGradient
                        id={`svg-aura-bright-${side}`}
                        cx='50%'
                        cy='50%'
                        r='50%'
                    >
                        <stop
                            offset='0%'
                            stopColor={side === "left" ? "#FBBF24" : "#818CF8"}
                            stopOpacity='0.7'
                        />
                        <stop
                            offset='100%'
                            stopColor='transparent'
                            stopOpacity='0'
                        />
                    </radialGradient>
                </defs>

                {/* Internal SVG Aura */}
                <circle
                    cx={centerX}
                    cy={centerY}
                    r='250'
                    fill={`url(#svg-aura-bright-${side})`}
                    className='transition-all duration-1000 group-hover/wheel:r-[300] group-hover/wheel:opacity-100'
                />

                {/* Outer Wheel boundary */}
                <path
                    d={
                        side === "left"
                            ? `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 0 1 ${centerX} ${centerY + radius}`
                            : `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 0 0 ${centerX} ${centerY + radius}`
                    }
                    fill='none'
                    stroke='white'
                    strokeWidth='8'
                    strokeOpacity='0.8'
                    className='transition-all duration-700 group-hover/wheel:stroke-opacity-100'
                />

                {/* Inner Wheel boundary */}
                <path
                    d={
                        side === "left"
                            ? `M ${centerX} ${centerY - innerRadius} A ${innerRadius} ${innerRadius} 0 0 1 ${centerX} ${centerY + innerRadius}`
                            : `M ${centerX} ${centerY - innerRadius} A ${innerRadius} ${innerRadius} 0 0 0 ${centerX} ${centerY + innerRadius}`
                    }
                    fill='rgba(255,255,255,0.15)'
                    stroke='white'
                    strokeWidth='4'
                    strokeOpacity='0.4'
                />

                {/* Wheel Track Background */}
                <path
                    d={
                        side === "left"
                            ? `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 0 1 ${centerX} ${centerY + radius} L ${centerX} ${centerY + innerRadius} A ${innerRadius} ${innerRadius} 0 0 0 ${centerX} ${centerY - innerRadius} Z`
                            : `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 0 0 ${centerX} ${centerY + radius} L ${centerX} ${centerY + innerRadius} A ${innerRadius} ${innerRadius} 0 0 1 ${centerX} ${centerY - innerRadius} Z`
                    }
                    fill='rgba(255,255,255,0.1)'
                    className='transition-all duration-700 group-hover/wheel:fill-white/20'
                />

                {/* House Divisions - Solid lines inside the track */}
                {houseLines.map((h) => {
                    const start = getCoordinates(h.zodiacDeg, innerRadius)
                    const end = getCoordinates(h.zodiacDeg, radius)
                    const mid = getCoordinates(
                        h.zodiacDeg + 15,
                        (innerRadius + radius) / 2
                    )
                    return (
                        <g
                            key={`house-${h.houseNum}`}
                            className='transition-all duration-500'
                        >
                            <line
                                x1={start.x}
                                y1={start.y}
                                x2={end.x}
                                y2={end.y}
                                stroke='white'
                                strokeOpacity='1'
                                strokeWidth='4'
                            />
                            {/* House Numbers inside the track */}
                            <text
                                x={mid.x}
                                y={mid.y}
                                fill='white'
                                fillOpacity='1'
                                fontSize='18'
                                fontWeight='900'
                                textAnchor='middle'
                                alignmentBaseline='middle'
                                className='font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                            >
                                {h.houseNum}
                            </text>
                        </g>
                    )
                })}

                {/* Zodiac Signs - Mapped just outside the track */}
                {ZODIAC_SIGNS.map((sign, i) => {
                    const { x, y, angleDeg } = getCoordinates(
                        i * 30 + 15,
                        radius + 35
                    )
                    return (
                        <g
                            key={sign}
                            className='opacity-90 group-hover/wheel:opacity-100 transition-all duration-700'
                        >
                            <text
                                x={x}
                                y={y}
                                fill='white'
                                fontSize='14'
                                fontWeight='900'
                                textAnchor='middle'
                                alignmentBaseline='middle'
                                transform={`rotate(${side === "left" ? angleDeg : angleDeg + 180}, ${x}, ${y})`}
                                className='tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                            >
                                {sign.substring(0, 3).toUpperCase()}
                            </text>
                        </g>
                    )
                })}

                {/* Planet Markers - Mapped INSIDE the wheel track */}
                {processedPlanets.map((p) => {
                    const { x, y } = getCoordinates(p.zodiacDeg, trackCenter)
                    const Icon = p.icon

                    return (
                        <g
                            key={p.name}
                            className='group/planet pointer-events-auto cursor-help'
                        >
                            {/* Connector line to center - Brighter */}
                            <line
                                x1={centerX}
                                y1={centerY}
                                x2={x}
                                y2={y}
                                stroke='white'
                                strokeOpacity='0.4'
                                strokeWidth='3'
                                strokeDasharray='6 6'
                                className='group-hover/planet:stroke-opacity-80 transition-all duration-300'
                            />

                            {/* Main Planet Node - Brighter background */}
                            <circle
                                cx={x}
                                cy={y}
                                r='22'
                                fill='rgba(255,255,255,0.25)'
                                stroke='white'
                                strokeOpacity='1'
                                strokeWidth='4'
                                className='transition-all duration-300 group-hover/planet:scale-125 group-hover/planet:fill-white/40 group-hover/planet:stroke-white backdrop-blur-md shadow-2xl'
                            />

                            <foreignObject
                                x={x - 14}
                                y={y - 14}
                                width='28'
                                height='28'
                                className='pointer-events-none'
                            >
                                <div
                                    className={cn(
                                        "w-full h-full flex items-center justify-center transition-all duration-300 group-hover/planet:scale-110",
                                        p.color.split(" ")[0]
                                    )}
                                >
                                    <Icon
                                        size={20}
                                        strokeWidth={3.5}
                                        className='drop-shadow-[0_0_12px_currentColor]'
                                    />
                                </div>
                            </foreignObject>

                            {/* Enhanced Tooltip */}
                            <g className='opacity-0 group-hover/planet:opacity-100 transition-all duration-500 translate-y-4 group-hover/planet:translate-y-0'>
                                <rect
                                    x={side === "left" ? x + 40 : x - 160}
                                    y={y - 25}
                                    width='120'
                                    height='50'
                                    rx='16'
                                    fill='white'
                                    className='shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
                                />
                                <text
                                    x={side === "left" ? x + 100 : x - 100}
                                    y={y}
                                    fill='#000'
                                    fontSize='18'
                                    fontWeight='900'
                                    textAnchor='middle'
                                    alignmentBaseline='middle'
                                    className='font-sans uppercase tracking-[0.2em]'
                                >
                                    {p.name}
                                </text>
                            </g>
                        </g>
                    )
                })}
            </svg>
        </div>
    )
}
