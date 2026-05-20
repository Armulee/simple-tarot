"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"

type OrbitPoint = {
    sign?: string | null
    degree?: number | string | null
    longitude?: number | string | null
    retrograde?: boolean | null
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

// Outer planets first so inner ones layer above.
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
] as const

const ZODIAC_CANONICAL: ReadonlyArray<string> = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
]

// Map alias sign names (e.g. Thai / Sanskrit) back to canonical English so
// charts stamped with locale strings still position correctly on the wheel.
const ZODIAC_ALIAS: Record<string, string> = {
    เมษ: "Aries",
    พฤษภ: "Taurus",
    มิถุน: "Gemini",
    กรกฎ: "Cancer",
    สิงห์: "Leo",
    กันย์: "Virgo",
    ตุลย์: "Libra",
    พิจิก: "Scorpio",
    ธนู: "Sagittarius",
    มกร: "Capricorn",
    กุมภ์: "Aquarius",
    มีน: "Pisces",
    Mesha: "Aries",
    Vrishabha: "Taurus",
    Mithuna: "Gemini",
    Karka: "Cancer",
    Simha: "Leo",
    Kanya: "Virgo",
    Tula: "Libra",
    Vrischika: "Scorpio",
    Dhanu: "Sagittarius",
    Makara: "Capricorn",
    Kumbha: "Aquarius",
    Meena: "Pisces",
}

const VB_W = 1000
const VB_H = 1000
const CX = VB_W / 2
const CY = 500

const WHEEL_RX_OUTER = 478
const WHEEL_RY_OUTER = 402
const WHEEL_RX_MID = 458
const WHEEL_RY_MID = 386

function buildStars(seed: string, count: number, w: number, h: number) {
    let s = 0
    for (let i = 0; i < seed.length; i++)
        s = (s * 31 + seed.charCodeAt(i)) >>> 0
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
    if (ZODIAC_CANONICAL.includes(sign)) return sign
    return ZODIAC_ALIAS[sign] ?? sign
}

function pointOnOrbit(longitude: number, rx: number, ry: number) {
    const angleDeg = 180 - longitude
    const rad = (angleDeg * Math.PI) / 180
    return {
        x: CX + rx * Math.cos(rad),
        y: CY - ry * Math.sin(rad),
    }
}

function longitudeFromSignDegree(sign: string, degree: number): number {
    const canonical = canonicalSign(sign)
    const idx = ZODIAC_CANONICAL.indexOf(canonical)
    const deg = Number.isFinite(degree) ? degree : 0
    if (idx === -1) return ((deg % 360) + 360) % 360
    const lng = idx * 30 + deg
    return ((lng % 360) + 360) % 360
}

function resolveLongitude(point: OrbitPoint): number {
    const lngRaw = Number(point.longitude)
    if (Number.isFinite(lngRaw)) return ((lngRaw % 360) + 360) % 360
    const degRaw = Number(point.degree)
    return longitudeFromSignDegree(
        typeof point.sign === "string" ? point.sign : "",
        Number.isFinite(degRaw) ? degRaw : 0,
    )
}

export default function OrbitVisual({
    planets,
    dateLabel,
    highlightPlanets,
    starSeed,
    ariaLabel = "Orbit visual",
}: {
    planets?: Record<string, unknown> | null
    /** Optional date label rendered centered at the top of the visual. */
    dateLabel?: string | null
    /** Canonical English planet keys to spotlight with a purple aura. */
    highlightPlanets?: ReadonlyArray<string>
    /** Deterministic seed for the starfield; defaults to dateLabel or a static seed. */
    starSeed?: string
    ariaLabel?: string
}) {
    const tAstro = useTranslations("BirthChart")

    const highlightSet = useMemo(
        () =>
            highlightPlanets && highlightPlanets.length > 0
                ? new Set(highlightPlanets)
                : null,
        [highlightPlanets],
    )

    const stars = useMemo(
        () =>
            buildStars(
                `orbit::${starSeed ?? dateLabel ?? "static"}`,
                90,
                VB_W,
                VB_H,
            ),
        [starSeed, dateLabel],
    )

    const placed = useMemo(() => {
        if (!planets) {
            return [] as Array<{
                name: string
                vis: PlanetVisual
                point: OrbitPoint
                x: number
                y: number
            }>
        }
        const out: Array<{
            name: string
            vis: PlanetVisual
            point: OrbitPoint
            x: number
            y: number
        }> = []
        for (const name of RENDER_ORDER) {
            const raw = planets[name]
            const vis = PLANET_VISUAL[name]
            if (!raw || typeof raw !== "object" || !vis?.orbit) continue
            const point = raw as OrbitPoint
            const lng = resolveLongitude(point)
            const { x, y } = pointOnOrbit(lng, vis.orbit.rx, vis.orbit.ry)
            out.push({ name, vis, point, x, y })
        }
        return out
    }, [planets])

    const hasPlanets = placed.length > 0

    return (
        <div className='relative w-full overflow-hidden'>
            <svg
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                preserveAspectRatio='xMidYMid meet'
                className='block h-auto w-full'
                aria-label={ariaLabel}
            >
                <defs>
                    <radialGradient id='orbit-sky' cx='50%' cy='50%' r='75%'>
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
                    <radialGradient id='orbit-nebula' cx='50%' cy='50%' r='42%'>
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
                    <radialGradient id='sun-glow' cx='50%' cy='50%' r='50%'>
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
                    <radialGradient id='sun-rays' cx='50%' cy='50%' r='50%'>
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
                    <radialGradient id='earth-glow' cx='50%' cy='50%' r='50%'>
                        <stop
                            offset='0%'
                            stopColor='#38bdf8'
                            stopOpacity='0.45'
                        />
                        <stop
                            offset='55%'
                            stopColor='#0ea5e9'
                            stopOpacity='0.18'
                        />
                        <stop
                            offset='100%'
                            stopColor='#0ea5e9'
                            stopOpacity='0'
                        />
                    </radialGradient>
                    <radialGradient
                        id='planet-spotlight'
                        cx='50%'
                        cy='50%'
                        r='50%'
                    >
                        <stop
                            offset='0%'
                            stopColor='#c084fc'
                            stopOpacity='0.85'
                        />
                        <stop
                            offset='40%'
                            stopColor='#a855f7'
                            stopOpacity='0.4'
                        />
                        <stop
                            offset='100%'
                            stopColor='#7e22ce'
                            stopOpacity='0'
                        />
                    </radialGradient>
                </defs>

                <rect width={VB_W} height={VB_H} fill='url(#orbit-sky)' />
                <rect width={VB_W} height={VB_H} fill='url(#orbit-nebula)' />

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

                {dateLabel && (
                    <text
                        x={CX}
                        y={62}
                        textAnchor='middle'
                        fill='#fef3c7'
                        opacity={0.85}
                        fontSize={32}
                        letterSpacing={6}
                        style={{
                            fontFamily:
                                'ui-serif, Georgia, "Times New Roman", serif',
                        }}
                    >
                        {dateLabel}
                    </text>
                )}

                {Object.entries(PLANET_VISUAL).map(([name, vis]) => {
                    if (!vis.orbit) return null
                    // Rahu and Ketu share the same orbital ring; only draw it
                    // once to avoid double-painting the same ellipse.
                    if (name === "Ketu") return null
                    return (
                        <ellipse
                            key={`orbit-${name}`}
                            cx={CX}
                            cy={CY}
                            rx={vis.orbit.rx}
                            ry={vis.orbit.ry}
                            fill='none'
                            stroke='rgba(203, 213, 225, 0.5)'
                            strokeWidth={1.1}
                        />
                    )
                })}

                <g>
                    <ellipse
                        cx={CX}
                        cy={CY}
                        rx={WHEEL_RX_OUTER}
                        ry={WHEEL_RY_OUTER}
                        fill='none'
                        stroke='rgba(252, 211, 77, 0.34)'
                        strokeWidth={1.2}
                    />
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
                                stroke='#ffffffff'
                                strokeOpacity={0.7}
                                strokeWidth={1.2}
                            />
                        )
                    })}
                    {ZODIAC_CANONICAL.map((sign, i) => {
                        const lng = i * 30 + 15
                        const pos = pointOnOrbit(
                            lng,
                            WHEEL_RX_MID,
                            WHEEL_RY_MID,
                        )
                        const name = tAstro(`zodiacSigns.${sign}`, {
                            defaultValue: sign,
                        }).toUpperCase()
                        return (
                            <text
                                key={`wheel-sign-${sign}`}
                                x={pos.x}
                                y={pos.y + 5}
                                textAnchor='middle'
                                fill='#ffffffff'
                                fontSize={16}
                                fontWeight={700}
                                letterSpacing={2}
                                opacity={0.95}
                                style={{
                                    fontFamily:
                                        'ui-sans-serif, system-ui, -apple-system, "Segoe UI"',
                                    filter: "drop-shadow(0 0 6px rgba(0,0,0,0.6))",
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
                    r={EARTH_VISUAL.size * 0.78}
                    fill='url(#earth-glow)'
                />
                <image
                    href={EARTH_VISUAL.img}
                    x={CX - EARTH_VISUAL.size / 2}
                    y={CY - EARTH_VISUAL.size / 2}
                    width={EARTH_VISUAL.size}
                    height={EARTH_VISUAL.size}
                    preserveAspectRatio='xMidYMid slice'
                    style={{
                        filter: "drop-shadow(0 4px 16px rgba(56,189,248,0.35))",
                    }}
                />

                {placed.map(({ name, vis, point, x, y }) => {
                    const planetName = tAstro(`planets.${name}`, {
                        defaultValue: name,
                    })
                    const degreeRaw = Number(point.degree)
                    const degree = Number.isFinite(degreeRaw) ? degreeRaw : 0
                    const isHighlighted = highlightSet
                        ? highlightSet.has(name)
                        : false
                    return (
                        <PlanetMark
                            key={name}
                            x={x}
                            y={y}
                            vis={vis}
                            label={planetName}
                            degreeText={`${degree.toFixed(1)}°`}
                            retrograde={Boolean(point.retrograde)}
                            labelBelow={y < CY + 50}
                            highlighted={isHighlighted}
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
                        {tAstro("loading", { defaultValue: "Loading…" })}
                    </text>
                )}
            </svg>
        </div>
    )
}

function PlanetMark({
    x,
    y,
    vis,
    label,
    degreeText,
    retrograde,
    labelBelow,
    highlighted = false,
}: {
    x: number
    y: number
    vis: PlanetVisual
    label: string
    degreeText: string
    retrograde: boolean
    labelBelow: boolean
    highlighted?: boolean
}) {
    const half = vis.size / 2
    const baseY = labelBelow ? y + half + 22 : y - half - 16 - 50
    const nameY = baseY
    const degreeY = baseY + 28
    const auraRadius = vis.size * 1.6

    return (
        <g>
            {highlighted && (
                <circle
                    cx={x}
                    cy={y}
                    r={auraRadius}
                    fill='url(#planet-spotlight)'
                />
            )}
            {vis.glow && (
                <>
                    <circle
                        cx={x}
                        cy={y}
                        r={vis.glow.rays}
                        fill='url(#sun-rays)'
                    />
                    <circle
                        cx={x}
                        cy={y}
                        r={vis.glow.aura}
                        fill='url(#sun-glow)'
                    />
                </>
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
                    filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.45))",
                }}
            />
            {retrograde && (
                <text
                    x={x + half - 2}
                    y={y - half + 14}
                    fill='#fda4af'
                    fontSize={20}
                    fontWeight={700}
                    textAnchor='end'
                >
                    ℞
                </text>
            )}
            <text
                x={x}
                y={nameY}
                textAnchor='middle'
                fill='#f8fafc'
                fontSize={22}
                fontWeight={600}
                style={{
                    fontFamily:
                        'ui-sans-serif, system-ui, -apple-system, "Segoe UI"',
                }}
            >
                {label}
            </text>
            <text
                x={x}
                y={degreeY}
                textAnchor='middle'
                fontSize={19}
                fill='#e2e8f0'
                opacity={0.9}
                style={{
                    fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
            >
                {degreeText}
            </text>
        </g>
    )
}
