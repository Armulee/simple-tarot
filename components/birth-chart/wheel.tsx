"use client"

import { useEffect, useMemo, useState } from "react"
import { ZODIAC_SIGNS, AstroPoint } from "@/lib/birth-chart-utils"

export type WheelAspectKind =
    | "conjunction"
    | "sextile"
    | "square"
    | "trine"
    | "opposition"

interface BirthChartWheelProps {
    houses?: Record<string, unknown> | null
    planets?: Record<string, unknown> | null
    /** Highlighted planet key (matches keys in `planets`). */
    selectedPlanet?: string | null
    /** Highlighted house number 1-12. */
    selectedHouse?: number | null
    /** Called when the user taps a planet glyph in the wheel. */
    onSelectPlanet?: (planet: string) => void
    /** Called when the user taps an empty house wedge. */
    onSelectHouse?: (house: number) => void
    /** When true, draws major-aspect lines between natal planets. */
    showAspects?: boolean
}

const ZODIAC_SYMBOLS: Record<string, string> = {
    Aries: "♈",
    Taurus: "♉",
    Gemini: "♊",
    Cancer: "♋",
    Leo: "♌",
    Virgo: "♍",
    Libra: "♎",
    Scorpio: "♏",
    Sagittarius: "♐",
    Capricorn: "♑",
    Aquarius: "♒",
    Pisces: "♓",
}

const PLANET_SYMBOLS: Record<string, string> = {
    Sun: "☉",
    Moon: "☽",
    Mercury: "☿",
    Venus: "♀",
    Mars: "♂",
    Jupiter: "♃",
    Saturn: "♄",
    Uranus: "♅",
    Neptune: "♆",
    Pluto: "♇",
    Ascendant: "ASC",
    Rahu: "☊",
    Ketu: "☋",
    Node: "☊",
    Chiron: "⚷",
    Lilith: "⚸",
}

const HOUSE_KEYWORDS = [
    "Self",
    "Money",
    "Mind",
    "Home",
    "Love",
    "Health",
    "Partner",
    "Change",
    "Luck",
    "Career",
    "Gain",
    "Loss",
]

const ASPECT_DEFS: Array<{
    kind: WheelAspectKind
    angle: number
    orb: number
    color: string
    dash?: string
}> = [
    { kind: "conjunction", angle: 0, orb: 7, color: "#fbbf24" },
    { kind: "opposition", angle: 180, orb: 7, color: "#f87171" },
    { kind: "trine", angle: 120, orb: 6, color: "#34d399" },
    { kind: "square", angle: 90, orb: 6, color: "#fb923c" },
    { kind: "sextile", angle: 60, orb: 4, color: "#60a5fa", dash: "4 3" },
]

type PlanetPosition = {
    name: string
    sign: string
    symbol: string
    degree: number
    /** Absolute zodiac longitude in degrees (0..360, Aries 0° → 0). */
    longitude: number
}

function shortestArc(a: number, b: number): number {
    const raw = Math.abs(a - b) % 360
    return raw > 180 ? 360 - raw : raw
}

export default function BirthChartWheel({
    houses,
    planets,
    selectedPlanet = null,
    selectedHouse = null,
    onSelectPlanet,
    onSelectHouse,
    showAspects = false,
}: BirthChartWheelProps) {
    const { ascendantSign, planetPositions } = useMemo(() => {
        let ascSign = "Aries"
        if (houses && (houses["1"] || houses["House 1"])) {
            const h1 = houses["1"] || houses["House 1"]
            if (typeof h1 === "string") ascSign = h1
            else if (typeof h1 === "object" && h1 && "sign" in h1)
                ascSign = (h1 as AstroPoint).sign
        } else if (planets && planets["Ascendant"]) {
            const asc = planets["Ascendant"]
            if (typeof asc === "string") ascSign = asc
            else if (typeof asc === "object" && asc && "sign" in asc)
                ascSign = (asc as AstroPoint).sign
        }

        const positions: PlanetPosition[] = []

        if (planets) {
            Object.entries(planets).forEach(([key, val]) => {
                let sign = ""
                let degree = 15
                if (typeof val === "string") {
                    sign = val
                } else if (typeof val === "object" && val) {
                    if ("sign" in val) sign = (val as AstroPoint).sign
                    if ("degree" in val)
                        degree = Number((val as AstroPoint).degree)
                }
                const normSign = ZODIAC_SIGNS.find(
                    (s) => s.toLowerCase() === sign.toLowerCase(),
                )
                if (normSign) {
                    const signIdx = ZODIAC_SIGNS.indexOf(normSign)
                    const symbolKey = Object.keys(PLANET_SYMBOLS).find(
                        (k) => k.toLowerCase() === key.toLowerCase(),
                    )
                    positions.push({
                        name: key,
                        sign: normSign,
                        symbol:
                            (symbolKey && PLANET_SYMBOLS[symbolKey]) ||
                            key.substring(0, 2),
                        degree,
                        longitude: (signIdx * 30 + degree) % 360,
                    })
                }
            })
        }

        return { ascendantSign: ascSign, planetPositions: positions }
    }, [houses, planets])

    const ascendantSignObj = ZODIAC_SIGNS.find(
        (s) => s.toLowerCase() === ascendantSign.toLowerCase(),
    )
    const ascIndex = ZODIAC_SIGNS.indexOf(ascendantSignObj || "Aries")
    const ascAngle = ascIndex * 30
    const rotation = 180 - ascAngle

    // Reveal animation: 0 → 1 on mount. Drives wheel rotation-in and a
    // staggered fade for planets / aspect lines.
    const [revealStep, setRevealStep] = useState(0)
    useEffect(() => {
        const id1 = window.setTimeout(() => setRevealStep(1), 30)
        const id2 = window.setTimeout(() => setRevealStep(2), 700)
        return () => {
            window.clearTimeout(id1)
            window.clearTimeout(id2)
        }
    }, [])

    // Map planet longitude to wheel xy at a given radius. The base wheel
    // draws CCW (Aries at angle 0, Taurus at -30, ...) and the whole
    // group is rotated by `-rotation` to put ASC on the left.
    const planetXY = (longitude: number, r: number) => {
        const angle = -longitude
        const rad = (angle * Math.PI) / 180
        return { x: 200 + r * Math.cos(rad), y: 200 + r * Math.sin(rad) }
    }

    const aspects = useMemo(() => {
        if (!showAspects) return []
        const list: Array<{
            key: string
            a: PlanetPosition
            b: PlanetPosition
            kind: WheelAspectKind
            color: string
            dash?: string
            orb: number
        }> = []
        for (let i = 0; i < planetPositions.length; i++) {
            for (let j = i + 1; j < planetPositions.length; j++) {
                const a = planetPositions[i]
                const b = planetPositions[j]
                if (!a || !b) continue
                const sep = shortestArc(a.longitude, b.longitude)
                for (const def of ASPECT_DEFS) {
                    const orb = Math.abs(sep - def.angle)
                    if (orb <= def.orb) {
                        list.push({
                            key: `${a.name}-${b.name}-${def.kind}`,
                            a,
                            b,
                            kind: def.kind,
                            color: def.color,
                            dash: def.dash,
                            orb,
                        })
                        break
                    }
                }
            }
        }
        return list
    }, [planetPositions, showAspects])

    const wheelGroupTransform = `rotate(${
        revealStep === 0 ? -rotation - 45 : -rotation
    } 200 200)`
    const wheelGroupOpacity = revealStep === 0 ? 0 : 1

    return (
        <div className='w-full aspect-square max-w-lg mx-auto relative select-none'>
            <svg
                viewBox='0 0 400 400'
                className='w-full h-full drop-shadow-2xl'
            >
                <defs>
                    <filter
                        id='bc-wheel-glow'
                        x='-50%'
                        y='-50%'
                        width='200%'
                        height='200%'
                    >
                        <feGaussianBlur stdDeviation='3' result='coloredBlur' />
                        <feMerge>
                            <feMergeNode in='coloredBlur' />
                            <feMergeNode in='SourceGraphic' />
                        </feMerge>
                    </filter>
                    <filter
                        id='bc-wheel-planet-glow'
                        x='-50%'
                        y='-50%'
                        width='200%'
                        height='200%'
                    >
                        <feGaussianBlur stdDeviation='4' result='coloredBlur' />
                        <feMerge>
                            <feMergeNode in='coloredBlur' />
                            <feMergeNode in='SourceGraphic' />
                        </feMerge>
                    </filter>
                    <radialGradient id='bc-wheel-bg' cx='50%' cy='50%'>
                        <stop offset='0%' stopColor='#1a1f3a' />
                        <stop offset='50%' stopColor='#0A0F26' />
                        <stop offset='100%' stopColor='#050810' />
                    </radialGradient>
                    <linearGradient
                        id='bc-wheel-z1'
                        x1='0%'
                        y1='0%'
                        x2='100%'
                        y2='100%'
                    >
                        <stop offset='0%' stopColor='rgba(255,255,255,0.1)' />
                        <stop offset='100%' stopColor='rgba(255,255,255,0.05)' />
                    </linearGradient>
                    <linearGradient
                        id='bc-wheel-z2'
                        x1='0%'
                        y1='0%'
                        x2='100%'
                        y2='100%'
                    >
                        <stop offset='0%' stopColor='rgba(255,255,255,0.15)' />
                        <stop offset='100%' stopColor='rgba(255,255,255,0.08)' />
                    </linearGradient>
                </defs>

                {/* Outer Glow Ring */}
                <circle
                    cx='200'
                    cy='200'
                    r='195'
                    fill='none'
                    stroke='url(#bc-wheel-bg)'
                    strokeWidth='2'
                    opacity='0.5'
                />

                {/* Background */}
                <circle
                    cx='200'
                    cy='200'
                    r='198'
                    fill='url(#bc-wheel-bg)'
                    stroke='rgba(255,255,255,0.15)'
                    strokeWidth='2'
                />

                {/* Rotatable Group */}
                <g
                    transform={wheelGroupTransform}
                    opacity={wheelGroupOpacity}
                    style={{
                        transition:
                            "transform 900ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease",
                    }}
                >
                    {/* Zodiac Ring */}
                    <g className='opacity-90'>
                        {ZODIAC_SIGNS.map((sign, i) => {
                            const angle = -i * 30
                            const rad = (angle * Math.PI) / 180
                            const nextRad = ((angle - 30) * Math.PI) / 180
                            const rOuter = 190
                            const rInner = 150
                            const x1 = 200 + rOuter * Math.cos(rad)
                            const y1 = 200 + rOuter * Math.sin(rad)
                            const x2 = 200 + rOuter * Math.cos(nextRad)
                            const y2 = 200 + rOuter * Math.sin(nextRad)
                            const x3 = 200 + rInner * Math.cos(nextRad)
                            const y3 = 200 + rInner * Math.sin(nextRad)
                            const x4 = 200 + rInner * Math.cos(rad)
                            const y4 = 200 + rInner * Math.sin(rad)
                            const midRad = ((angle - 15) * Math.PI) / 180
                            const textR = (rOuter + rInner) / 2
                            const tx = 200 + textR * Math.cos(midRad)
                            const ty = 200 + textR * Math.sin(midRad)
                            return (
                                <g key={sign}>
                                    <path
                                        d={`M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 0 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 0 1 ${x4} ${y4} Z`}
                                        fill={
                                            i % 2 === 0
                                                ? "url(#bc-wheel-z1)"
                                                : "url(#bc-wheel-z2)"
                                        }
                                        stroke='rgba(255,255,255,0.25)'
                                        strokeWidth='1.5'
                                    />
                                    <text
                                        x={tx}
                                        y={ty}
                                        fill='white'
                                        fontSize='20'
                                        fontWeight='bold'
                                        textAnchor='middle'
                                        dominantBaseline='middle'
                                        transform={`rotate(${angle - 15} ${tx} ${ty})`}
                                        filter='url(#bc-wheel-glow)'
                                    >
                                        {ZODIAC_SYMBOLS[sign]}
                                    </text>
                                </g>
                            )
                        })}
                    </g>

                    {/* Aspect lines between planets — drawn under the planets */}
                    {showAspects &&
                        aspects.map((aspect) => {
                            const aXY = planetXY(aspect.a.longitude, 120)
                            const bXY = planetXY(aspect.b.longitude, 120)
                            return (
                                <line
                                    key={aspect.key}
                                    x1={aXY.x}
                                    y1={aXY.y}
                                    x2={bXY.x}
                                    y2={bXY.y}
                                    stroke={aspect.color}
                                    strokeWidth={1.3}
                                    strokeOpacity={
                                        revealStep < 2 ? 0 : 0.65
                                    }
                                    strokeDasharray={aspect.dash}
                                    style={{
                                        transition:
                                            "stroke-opacity 600ms ease",
                                    }}
                                />
                            )
                        })}

                    {/* Planets */}
                    {planetPositions.map((p, i) => {
                        const { x: px, y: py } = planetXY(p.longitude, 120)
                        const isSelected = selectedPlanet === p.name
                        const planetReveal = revealStep === 2
                        const delay = i * 80
                        return (
                            <g
                                key={`${p.name}-${i}`}
                                opacity={planetReveal ? 1 : 0}
                                style={{
                                    transition: `opacity 500ms ease ${delay}ms, transform 500ms ease ${delay}ms`,
                                    transformOrigin: `${px}px ${py}px`,
                                    transform: planetReveal
                                        ? "scale(1)"
                                        : "scale(0.4)",
                                    cursor: onSelectPlanet
                                        ? "pointer"
                                        : undefined,
                                }}
                                onClick={(event) => {
                                    if (!onSelectPlanet) return
                                    event.stopPropagation()
                                    onSelectPlanet(p.name)
                                }}
                            >
                                <line
                                    x1='200'
                                    y1='200'
                                    x2={px}
                                    y2={py}
                                    stroke={
                                        isSelected
                                            ? "rgba(252,211,77,0.55)"
                                            : "rgba(255,255,255,0.15)"
                                    }
                                    strokeWidth={isSelected ? 2 : 1.5}
                                    strokeDasharray='2 2'
                                />
                                <circle
                                    cx={px}
                                    cy={py}
                                    r={isSelected ? 15 : 12}
                                    fill='rgba(10,15,38,0.9)'
                                    stroke={
                                        isSelected ? "#fbbf24" : "#FFD700"
                                    }
                                    strokeWidth={isSelected ? 2.5 : 2}
                                    filter='url(#bc-wheel-planet-glow)'
                                />
                                <circle
                                    cx={px}
                                    cy={py}
                                    r={isSelected ? 11 : 8}
                                    fill={
                                        isSelected
                                            ? "rgba(252,211,77,0.32)"
                                            : "rgba(255,215,0,0.2)"
                                    }
                                />
                                <text
                                    x={px}
                                    y={py}
                                    fill={isSelected ? "#fff7e0" : "#FFD700"}
                                    fontSize='14'
                                    fontWeight='bold'
                                    textAnchor='middle'
                                    dominantBaseline='middle'
                                    filter='url(#bc-wheel-glow)'
                                    style={{ pointerEvents: "none" }}
                                >
                                    {p.symbol}
                                </text>
                                <title>{p.name}</title>
                            </g>
                        )
                    })}
                </g>

                {/* Fixed elements (house wedges, numbers, ASC/DSC/MC/IC) */}
                <g>
                    {/* House wedges (invisible click targets, optional highlight). */}
                    {Array.from({ length: 12 }, (_, i) => {
                        const houseNum = i + 1
                        // House 1 sits at 165° to 195° (left, where ASC is).
                        const start = 165 - i * 30
                        const end = start - 30
                        const startRad = (start * Math.PI) / 180
                        const endRad = (end * Math.PI) / 180
                        const rOuter = 140
                        const rInner = 18
                        const x1 = 200 + rOuter * Math.cos(startRad)
                        const y1 = 200 + rOuter * Math.sin(startRad)
                        const x2 = 200 + rOuter * Math.cos(endRad)
                        const y2 = 200 + rOuter * Math.sin(endRad)
                        const x3 = 200 + rInner * Math.cos(endRad)
                        const y3 = 200 + rInner * Math.sin(endRad)
                        const x4 = 200 + rInner * Math.cos(startRad)
                        const y4 = 200 + rInner * Math.sin(startRad)
                        const isSelected = selectedHouse === houseNum
                        return (
                            <path
                                key={`house-wedge-${houseNum}`}
                                d={`M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 0 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 0 1 ${x4} ${y4} Z`}
                                fill={
                                    isSelected
                                        ? "rgba(252,211,77,0.18)"
                                        : "rgba(255,255,255,0)"
                                }
                                stroke={
                                    isSelected
                                        ? "rgba(252,211,77,0.55)"
                                        : "transparent"
                                }
                                strokeWidth={isSelected ? 1.5 : 0}
                                style={{
                                    cursor: onSelectHouse
                                        ? "pointer"
                                        : undefined,
                                    transition:
                                        "fill 200ms ease, stroke 200ms ease",
                                }}
                                onClick={(event) => {
                                    if (!onSelectHouse) return
                                    event.stopPropagation()
                                    onSelectHouse(houseNum)
                                }}
                            >
                                <title>{`House ${houseNum}`}</title>
                            </path>
                        )
                    })}

                    {/* House grid lines */}
                    <g className='pointer-events-none'>
                        {[
                            0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300,
                            330,
                        ].map((angle, i) => {
                            const rad = (angle * Math.PI) / 180
                            const x2 = 200 + 140 * Math.cos(rad)
                            const y2 = 200 + 140 * Math.sin(rad)
                            return (
                                <line
                                    key={i}
                                    x1='200'
                                    y1='200'
                                    x2={x2}
                                    y2={y2}
                                    stroke='rgba(255,255,255,0.2)'
                                    strokeDasharray='4 4'
                                />
                            )
                        })}
                        {Array.from({ length: 12 }, (_, i) => {
                            const houseNum = i + 1
                            const angle = 165 - i * 30
                            const rad = (angle * Math.PI) / 180
                            const rNum = 35
                            const nx = 200 + rNum * Math.cos(rad)
                            const ny = 200 + rNum * Math.sin(rad)
                            const rKey = 75
                            const kx = 200 + rKey * Math.cos(rad)
                            const ky = 200 + rKey * Math.sin(rad)
                            const isSelected = selectedHouse === houseNum
                            return (
                                <g key={i}>
                                    <circle
                                        cx={nx}
                                        cy={ny}
                                        r='8'
                                        fill={
                                            isSelected
                                                ? "rgba(252,211,77,0.25)"
                                                : "rgba(255,255,255,0.1)"
                                        }
                                        stroke={
                                            isSelected
                                                ? "rgba(252,211,77,0.7)"
                                                : "rgba(255,255,255,0.3)"
                                        }
                                        strokeWidth='1'
                                    />
                                    <text
                                        x={nx}
                                        y={ny}
                                        fill={
                                            isSelected
                                                ? "#fef3c7"
                                                : "rgba(255,255,255,0.9)"
                                        }
                                        fontSize='9'
                                        fontWeight='bold'
                                        textAnchor='middle'
                                        dominantBaseline='middle'
                                    >
                                        {houseNum}
                                    </text>
                                    <text
                                        x={kx}
                                        y={ky}
                                        fill={
                                            isSelected
                                                ? "rgba(252,211,77,0.8)"
                                                : "rgba(255,255,255,0.6)"
                                        }
                                        fontSize='9'
                                        fontWeight='bold'
                                        textAnchor='middle'
                                        dominantBaseline='middle'
                                    >
                                        {HOUSE_KEYWORDS[i].toUpperCase()}
                                    </text>
                                </g>
                            )
                        })}

                        {/* ASC / DSC / MC / IC markers */}
                        {[
                            { cx: 10, cy: 200, label: "ASC" },
                            { cx: 390, cy: 200, label: "DSC" },
                            { cx: 200, cy: 15, label: "MC" },
                            { cx: 200, cy: 390, label: "IC" },
                        ].map((m) => (
                            <g key={m.label}>
                                <circle
                                    cx={m.cx}
                                    cy={m.cy}
                                    r='15'
                                    fill='rgba(255,255,255,0.1)'
                                    stroke='rgba(255,255,255,0.3)'
                                />
                                <text
                                    x={m.cx}
                                    y={m.cy}
                                    fill='#FFD700'
                                    fontSize='10'
                                    fontWeight='bold'
                                    textAnchor='middle'
                                    dominantBaseline='middle'
                                >
                                    {m.label}
                                </text>
                            </g>
                        ))}
                    </g>
                </g>
            </svg>
        </div>
    )
}
