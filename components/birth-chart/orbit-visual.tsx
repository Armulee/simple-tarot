"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import {
    getPlanetDignity,
    SANSKRIT_SIGNS,
    type AstroPoint,
    ZODIAC_SIGNS,
} from "@/lib/birth-chart-utils"

type BirthPlanet = {
    sign: string
    degree?: number | string
    longitude?: number | string
    retrograde?: boolean
}

type PlanetVisual = {
    orbit: { rx: number; ry: number }
    img: string
    size: number
    glow?: { rays: number; aura: number }
    mirror?: boolean
}

const EARTH_VISUAL = {
    img: "/assets/planetary/earth.png",
    size: 100,
} as const

const PLANET_VISUAL: Record<string, PlanetVisual> = {
    Moon: {
        orbit: { rx: 128, ry: 108 },
        img: "/assets/planetary/moon.png",
        size: 54,
    },
    Mercury: {
        orbit: { rx: 163, ry: 137 },
        img: "/assets/planetary/mercury.png",
        size: 58,
    },
    Venus: {
        orbit: { rx: 198, ry: 167 },
        img: "/assets/planetary/venus.png",
        size: 64,
    },
    Sun: {
        orbit: { rx: 235, ry: 198 },
        img: "/assets/planetary/sun.png",
        size: 80,
        glow: { rays: 145, aura: 92 },
    },
    Mars: {
        orbit: { rx: 273, ry: 230 },
        img: "/assets/planetary/mars.png",
        size: 62,
    },
    Jupiter: {
        orbit: { rx: 308, ry: 259 },
        img: "/assets/planetary/jupiter.png",
        size: 80,
    },
    Saturn: {
        orbit: { rx: 343, ry: 289 },
        img: "/assets/planetary/saturn.png",
        size: 86,
    },
    Uranus: {
        orbit: { rx: 372, ry: 313 },
        img: "/assets/planetary/uranus.png",
        size: 62,
    },
    Neptune: {
        orbit: { rx: 395, ry: 332 },
        img: "/assets/planetary/neptune.png",
        size: 58,
    },
    Pluto: {
        orbit: { rx: 414, ry: 348 },
        img: "/assets/planetary/pluto.png",
        size: 50,
    },
    Rahu: {
        orbit: { rx: 438, ry: 368 },
        img: "/assets/planetary/rahu.png",
        size: 62,
    },
    Ketu: {
        orbit: { rx: 438, ry: 368 },
        img: "/assets/planetary/rahu.png",
        size: 62,
        mirror: true,
    },
}

const DIGNITY_DEGREE_COLOR = {
    exalted: "#facc15",
    own_sign: "#93c5fd",
    debilitated: "#9ca3af",
    normal: "#e2e8f0",
} as const

const RENDER_ORDER = [
    "Rahu",
    "Ketu",
    "Pluto",
    "Neptune",
    "Uranus",
    "Saturn",
    "Jupiter",
    "Mars",
    "Sun",
    "Venus",
    "Mercury",
    "Moon",
]

const VB_W = 1000
const VB_H = 1000
const CX = VB_W / 2
const CY = 500
const WHEEL_RX_OUTER = 478
const WHEEL_RY_OUTER = 402
const WHEEL_RX_INNER = 438
const WHEEL_RY_INNER = 368
const WHEEL_RX_MID = (WHEEL_RX_OUTER + WHEEL_RX_INNER) / 2
const WHEEL_RY_MID = (WHEEL_RY_OUTER + WHEEL_RY_INNER) / 2

function buildStars(seed: string, count: number, w: number, h: number) {
    let s = 0
    for (let i = 0; i < seed.length; i++) {
        s = (s * 31 + seed.charCodeAt(i)) >>> 0
    }
    const rand = () => {
        s = (s * 1664525 + 1013904223) >>> 0
        return s / 0xffffffff
    }
    return Array.from({ length: count }, (_, id) => ({
        id,
        x: rand() * w,
        y: rand() * h,
        r: rand() * 1.1 + 0.3,
        o: rand() * 0.55 + 0.15,
    }))
}

function canonicalSign(sign: string): string {
    if (ZODIAC_SIGNS.includes(sign)) return sign
    return SANSKRIT_SIGNS[sign] ?? sign
}

function longitudeFromSignDegree(sign: string, degree: number): number {
    const canonical = canonicalSign(sign)
    const idx = ZODIAC_SIGNS.indexOf(canonical)
    if (idx === -1) return ((degree % 360) + 360) % 360
    const lng = idx * 30 + degree
    return ((lng % 360) + 360) % 360
}

function pointOnOrbit(longitude: number, rx: number, ry: number) {
    const angleDeg = 180 - longitude
    const rad = (angleDeg * Math.PI) / 180
    return {
        x: CX + rx * Math.cos(rad),
        y: CY - ry * Math.sin(rad),
    }
}

function toBirthPlanet(value: unknown): BirthPlanet | null {
    if (!value || typeof value !== "object") return null
    const point = value as AstroPoint
    if (typeof point.sign !== "string") return null
    return {
        sign: point.sign,
        degree: point.degree,
        longitude: point.longitude,
        retrograde:
            "retrograde" in point && typeof point.retrograde === "boolean"
                ? point.retrograde
                : false,
    }
}

function getDegreeColor(name: string, point: BirthPlanet) {
    const sign = canonicalSign(point.sign)
    const rawPoint = point as AstroPoint
    const dignity = getPlanetDignity(name, sign)

    if (rawPoint.isExalted || dignity.isExalted) {
        return DIGNITY_DEGREE_COLOR.exalted
    }
    if (rawPoint.isDebilitated || dignity.isDebilitated) {
        return DIGNITY_DEGREE_COLOR.debilitated
    }
    if (rawPoint.isOwnSign || dignity.isOwnSign) {
        return DIGNITY_DEGREE_COLOR.own_sign
    }
    return DIGNITY_DEGREE_COLOR.normal
}

export default function BirthChartOrbitVisual({
    planets,
}: {
    planets?: Record<string, unknown> | null
}) {
    const t = useTranslations("BirthChart")

    const stars = useMemo(
        () => buildStars("birth-chart-orbit", 90, VB_W, VB_H),
        [],
    )

    const placed = useMemo(() => {
        if (!planets) {
            return [] as Array<{
                name: string
                vis: PlanetVisual
                point: BirthPlanet
                degreeColor: string
                x: number
                y: number
            }>
        }

        const out: Array<{
            name: string
            vis: PlanetVisual
            point: BirthPlanet
            degreeColor: string
            x: number
            y: number
        }> = []

        for (const name of RENDER_ORDER) {
            const rawPoint = planets[name]
            const vis = PLANET_VISUAL[name]
            const point = toBirthPlanet(rawPoint)
            if (!point || !vis) continue

            const degree = Number(point.degree)
            const longitude = Number.isFinite(Number(point.longitude))
                ? Number(point.longitude)
                : longitudeFromSignDegree(
                      point.sign,
                      Number.isFinite(degree) ? degree : 0,
                  )
            const { x, y } = pointOnOrbit(longitude, vis.orbit.rx, vis.orbit.ry)
            out.push({
                name,
                vis,
                point,
                degreeColor: getDegreeColor(name, point),
                x,
                y,
            })
        }

        return out
    }, [planets])

    const hasPlanets = placed.length > 0

    return (
        <div className='relative w-full'>
            <svg
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                preserveAspectRatio='xMidYMid meet'
                className='block h-auto w-full'
                aria-label='Birth chart orbit visual'
            >
                <defs>
                    <radialGradient
                        id='birth-orbit-sky'
                        cx='50%'
                        cy='50%'
                        r='75%'
                    >
                        <stop
                            offset='0%'
                            stopColor='#000000'
                            stopOpacity='0'
                        />
                        <stop
                            offset='70%'
                            stopColor='#04060f'
                            stopOpacity='0.25'
                        />
                        <stop
                            offset='100%'
                            stopColor='#04060f'
                            stopOpacity='0.7'
                        />
                    </radialGradient>
                    <radialGradient
                        id='birth-orbit-nebula'
                        cx='50%'
                        cy='50%'
                        r='42%'
                    >
                        <stop
                            offset='0%'
                            stopColor='#8b5cf6'
                            stopOpacity='0.16'
                        />
                        <stop
                            offset='55%'
                            stopColor='#6366f1'
                            stopOpacity='0.05'
                        />
                        <stop
                            offset='100%'
                            stopColor='#6366f1'
                            stopOpacity='0'
                        />
                    </radialGradient>
                    <radialGradient
                        id='birth-sun-glow'
                        cx='50%'
                        cy='50%'
                        r='50%'
                    >
                        <stop
                            offset='0%'
                            stopColor='#fde68a'
                            stopOpacity='0.9'
                        />
                        <stop
                            offset='35%'
                            stopColor='#f59e0b'
                            stopOpacity='0.45'
                        />
                        <stop
                            offset='100%'
                            stopColor='#f59e0b'
                            stopOpacity='0'
                        />
                    </radialGradient>
                    <radialGradient
                        id='birth-sun-rays'
                        cx='50%'
                        cy='50%'
                        r='50%'
                    >
                        <stop
                            offset='0%'
                            stopColor='#fcd34d'
                            stopOpacity='0.7'
                        />
                        <stop
                            offset='60%'
                            stopColor='#f59e0b'
                            stopOpacity='0.15'
                        />
                        <stop
                            offset='100%'
                            stopColor='#f59e0b'
                            stopOpacity='0'
                        />
                    </radialGradient>
                    <radialGradient
                        id='birth-earth-glow'
                        cx='50%'
                        cy='50%'
                        r='50%'
                    >
                        <stop
                            offset='0%'
                            stopColor='#38bdf8'
                            stopOpacity='0.55'
                        />
                        <stop
                            offset='55%'
                            stopColor='#0ea5e9'
                            stopOpacity='0.2'
                        />
                        <stop
                            offset='100%'
                            stopColor='#0ea5e9'
                            stopOpacity='0'
                        />
                    </radialGradient>
                    <radialGradient
                        id='birth-planet-halo'
                        cx='50%'
                        cy='50%'
                        r='50%'
                    >
                        <stop
                            offset='0%'
                            stopColor='#ffffff'
                            stopOpacity='0.25'
                        />
                        <stop
                            offset='60%'
                            stopColor='#ffffff'
                            stopOpacity='0.04'
                        />
                        <stop
                            offset='100%'
                            stopColor='#ffffff'
                            stopOpacity='0'
                        />
                    </radialGradient>
                </defs>

                <rect width={VB_W} height={VB_H} fill='url(#birth-orbit-sky)' />
                <rect
                    width={VB_W}
                    height={VB_H}
                    fill='url(#birth-orbit-nebula)'
                />

                {stars.map((s) => (
                    <circle
                        key={s.id}
                        cx={s.x}
                        cy={s.y}
                        r={s.r}
                        fill='white'
                        opacity={s.o}
                    />
                ))}

                {Object.entries(PLANET_VISUAL).map(([name, vis]) => {
                    const isSunOrbit = name === "Sun"
                    return (
                        <ellipse
                            key={`orbit-${name}`}
                            cx={CX}
                            cy={CY}
                            rx={vis.orbit.rx}
                            ry={vis.orbit.ry}
                            fill='none'
                            stroke={
                                isSunOrbit
                                    ? "rgba(252, 211, 77, 0.55)"
                                    : "rgba(203, 213, 225, 0.5)"
                            }
                            strokeWidth={isSunOrbit ? 1.3 : 1.1}
                        />
                    )
                })}

                <g>
                    <ellipse
                        cx={CX}
                        cy={CY}
                        rx={WHEEL_RX_INNER}
                        ry={WHEEL_RY_INNER}
                        fill='none'
                        stroke='rgba(252, 211, 77, 0.28)'
                        strokeWidth={1}
                    />
                    <ellipse
                        cx={CX}
                        cy={CY}
                        rx={WHEEL_RX_OUTER}
                        ry={WHEEL_RY_OUTER}
                        fill='none'
                        stroke='rgba(252, 211, 77, 0.45)'
                        strokeWidth={1.2}
                    />
                    {/* Full radial spokes: zodiac cusps → center (readable like classic wheel) */}
                    {Array.from({ length: 12 }, (_, i) => {
                        const lng = i * 30
                        const outer = pointOnOrbit(
                            lng,
                            WHEEL_RX_OUTER,
                            WHEEL_RY_OUTER,
                        )
                        return (
                            <line
                                key={`wheel-spoke-${i}`}
                                x1={CX}
                                y1={CY}
                                x2={outer.x}
                                y2={outer.y}
                                stroke='rgba(255, 255, 255, 0.42)'
                                strokeWidth={1.35}
                                strokeLinecap='round'
                            />
                        )
                    })}
                    {/* Tick marks on the ring for extra definition at each cusp */}
                    {Array.from({ length: 12 }, (_, i) => {
                        const lng = i * 30
                        const inner = pointOnOrbit(
                            lng,
                            WHEEL_RX_INNER,
                            WHEEL_RY_INNER,
                        )
                        const outer = pointOnOrbit(
                            lng,
                            WHEEL_RX_OUTER,
                            WHEEL_RY_OUTER,
                        )
                        return (
                            <line
                                key={`wheel-tick-${i}`}
                                x1={inner.x}
                                y1={inner.y}
                                x2={outer.x}
                                y2={outer.y}
                                stroke='rgba(252, 211, 77, 0.72)'
                                strokeWidth={1.5}
                                strokeLinecap='round'
                            />
                        )
                    })}
                    {ZODIAC_SIGNS.map((sign, i) => {
                        const lng = i * 30 + 15
                        const pos = pointOnOrbit(
                            lng,
                            WHEEL_RX_MID,
                            WHEEL_RY_MID,
                        )
                        const name = t(`zodiacSigns.${sign}`, {
                            defaultValue: sign,
                        }).toUpperCase()
                        return (
                            <text
                                key={`wheel-sign-${sign}`}
                                x={pos.x}
                                y={pos.y + 5}
                                textAnchor='middle'
                                fill='rgba(253, 230, 138, 0.95)'
                                fontSize={14}
                                fontWeight={600}
                                letterSpacing={4}
                                style={{
                                    fontFamily:
                                        'ui-sans-serif, system-ui, -apple-system, "Segoe UI"',
                                    filter: "drop-shadow(0 0 6px rgba(0,0,0,0.7))",
                                }}
                            >
                                {name}
                            </text>
                        )
                    })}
                </g>

                <circle
                    cx={CX}
                    cy={CY}
                    r={EARTH_VISUAL.size * 0.95}
                    fill='url(#birth-earth-glow)'
                />
                <circle
                    cx={CX}
                    cy={CY}
                    r={EARTH_VISUAL.size / 2 + 2}
                    fill='none'
                    stroke='rgba(125, 211, 252, 0.45)'
                    strokeWidth={1}
                />
                <image
                    href={EARTH_VISUAL.img}
                    x={CX - EARTH_VISUAL.size / 2}
                    y={CY - EARTH_VISUAL.size / 2}
                    width={EARTH_VISUAL.size}
                    height={EARTH_VISUAL.size}
                    preserveAspectRatio='xMidYMid slice'
                    style={{
                        filter: "drop-shadow(0 6px 20px rgba(56,189,248,0.45))",
                    }}
                />

                {placed.map(({ name, vis, point, degreeColor, x, y }) => {
                    const degree = Number(point.degree)
                    return (
                        <PlanetMark
                            key={name}
                            x={x}
                            y={y}
                            vis={vis}
                            label={t(`planets.${name}`, { defaultValue: name })}
                            degreeText={`${(Number.isFinite(degree) ? degree : 0).toFixed(1)}°`}
                            degreeColor={degreeColor}
                            retrograde={Boolean(point.retrograde)}
                            labelBelow={y < CY + 50}
                        />
                    )
                })}

                {!hasPlanets && (
                    <text
                        x={CX}
                        y={CY + 160}
                        textAnchor='middle'
                        fill='#cbd5e1'
                        opacity={0.6}
                        fontSize={18}
                        letterSpacing={3}
                    >
                        {t("loading", { defaultValue: "Loading…" })}
                    </text>
                )}
            </svg>

            <DignityLegend />
        </div>
    )
}

function DignityLegend() {
    const t = useTranslations("BirthChart")
    const items = [
        {
            key: "exalted",
            color: DIGNITY_DEGREE_COLOR.exalted,
            label: t("stats.status.exalted", { defaultValue: "Exalted" }),
        },
        {
            key: "own_sign",
            color: DIGNITY_DEGREE_COLOR.own_sign,
            label: t("stats.status.ownSign", { defaultValue: "Own Sign" }),
        },
        {
            key: "normal",
            color: DIGNITY_DEGREE_COLOR.normal,
            label: t("stats.status.normal", { defaultValue: "Neutral" }),
        },
        {
            key: "debilitated",
            color: DIGNITY_DEGREE_COLOR.debilitated,
            label: t("stats.status.debilitated", {
                defaultValue: "Debilitated",
            }),
        },
    ]

    return (
        <div className='mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] uppercase tracking-[0.22em] text-white/55 backdrop-blur-md'>
            {items.map((it) => (
                <span key={it.key} className='inline-flex items-center gap-2'>
                    <span
                        aria-hidden
                        className='inline-block h-1.5 w-3.5 rounded-full'
                        style={{
                            backgroundColor: it.color,
                            boxShadow: `0 0 8px ${it.color}66`,
                        }}
                    />
                    {it.label}
                </span>
            ))}
        </div>
    )
}

function PlanetMark({
    x,
    y,
    vis,
    label,
    degreeText,
    degreeColor,
    retrograde,
    labelBelow,
}: {
    x: number
    y: number
    vis: PlanetVisual
    label: string
    degreeText: string
    degreeColor: string
    retrograde: boolean
    labelBelow: boolean
}) {
    const half = vis.size / 2
    const baseY = labelBelow ? y + half + 24 : y - half - 56
    const nameY = baseY
    const degreeY = baseY + 24
    const pillWidth = 64

    return (
        <g>
            {vis.glow ? (
                <>
                    <circle
                        cx={x}
                        cy={y}
                        r={vis.glow.rays}
                        fill='url(#birth-sun-rays)'
                    />
                    <circle
                        cx={x}
                        cy={y}
                        r={vis.glow.aura}
                        fill='url(#birth-sun-glow)'
                    />
                </>
            ) : (
                <circle
                    cx={x}
                    cy={y}
                    r={half + 6}
                    fill='url(#birth-planet-halo)'
                />
            )}
            <image
                href={vis.img}
                x={x - half}
                y={y - half}
                width={vis.size}
                height={vis.size}
                preserveAspectRatio='xMidYMid slice'
                transform={vis.mirror ? `rotate(180 ${x} ${y})` : undefined}
                style={{
                    filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.55))",
                }}
            />
            {retrograde ? (
                <g>
                    <circle
                        cx={x + half - 6}
                        cy={y - half + 8}
                        r={9}
                        fill='rgba(253, 164, 175, 0.18)'
                        stroke='rgba(253, 164, 175, 0.7)'
                        strokeWidth={0.8}
                    />
                    <text
                        x={x + half - 6}
                        y={y - half + 12}
                        fill='#fecdd3'
                        fontSize={12}
                        fontWeight={700}
                        textAnchor='middle'
                        style={{
                            fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, monospace",
                        }}
                    >
                        ℞
                    </text>
                </g>
            ) : null}
            <text
                x={x}
                y={nameY}
                textAnchor='middle'
                fill='#f8fafc'
                fontSize={19}
                fontStyle='italic'
                fontWeight={500}
                style={{
                    fontFamily:
                        'ui-serif, Georgia, "Iowan Old Style", "Times New Roman", serif',
                    filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.7))",
                }}
            >
                {label}
            </text>
            <g>
                <rect
                    x={x - pillWidth / 2}
                    y={degreeY - 14}
                    width={pillWidth}
                    height={20}
                    rx={10}
                    fill='rgba(2, 6, 23, 0.55)'
                    stroke={degreeColor}
                    strokeOpacity={0.45}
                    strokeWidth={1}
                />
                <text
                    x={x}
                    y={degreeY + 1}
                    textAnchor='middle'
                    fontSize={13}
                    fontWeight={600}
                    fill={degreeColor}
                    style={{
                        fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                        letterSpacing: "0.04em",
                    }}
                >
                    {degreeText}
                </text>
            </g>
        </g>
    )
}
