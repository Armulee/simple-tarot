"use client"

import { useMemo } from "react"
import { useFormatter, useTranslations } from "next-intl"

type TransitPlanet = {
    sign: string
    degree: number
    longitude: number
    retrograde?: boolean
}

type TransitChartData = {
    transit?: {
        date?: {
            day?: number | null
            month?: number | null
            year?: number | null
        } | null
        charts?: Array<{
            planets?: Record<string, TransitPlanet>
        }> | null
    } | null
} | null

type PlanetVisual = {
    /** Astrological glyph for the planet (Unicode) */
    glyph: string
    /** Glyph + degree text accent color */
    color: string
    /** Elliptical orbit dimensions */
    orbit: { rx: number; ry: number } | null
    /** PNG asset path */
    img: string
    /** Size (px in SVG units) */
    size: number
    /** Optional radial glow rendered behind the planet image (for the Sun). */
    glow?: { rays: number; aura: number }
}

/** Earth sits at the geocentric center (not iterated as a moving planet). */
const EARTH_VISUAL = {
    img: "/assets/planetary/earth.png",
    size: 100,
} as const

/**
 * Geocentric astrology layout: Earth at center, and every body — including the
 * Sun — sits on its own concentric ellipse. Order from inside out follows the
 * classical Ptolemaic sequence (Moon → Mercury → Venus → Sun → Mars → ... →
 * Pluto). Orbital radii are tuned for layout (not to scale) so adjacent planet
 * sprites have room to breathe.
 */
const PLANET_VISUAL: Record<string, PlanetVisual> = {
    Moon: {
        glyph: "\u263E",
        color: "#e5e7eb",
        orbit: { rx: 128, ry: 108 },
        img: "/assets/planetary/moon.png",
        size: 54,
    },
    Mercury: {
        glyph: "\u263F",
        color: "#a78bfa",
        orbit: { rx: 163, ry: 137 },
        img: "/assets/planetary/mercury.png",
        size: 58,
    },
    Venus: {
        glyph: "\u2640",
        color: "#fde68a",
        orbit: { rx: 198, ry: 167 },
        img: "/assets/planetary/venus.png",
        size: 64,
    },
    Sun: {
        glyph: "\u2609",
        color: "#fbbf24",
        orbit: { rx: 235, ry: 198 },
        img: "/assets/planetary/sun.png",
        size: 80,
        glow: { rays: 145, aura: 92 },
    },
    Mars: {
        glyph: "\u2642",
        color: "#ef4444",
        orbit: { rx: 273, ry: 230 },
        img: "/assets/planetary/mars.png",
        size: 62,
    },
    Jupiter: {
        glyph: "\u2643",
        color: "#fb923c",
        orbit: { rx: 308, ry: 259 },
        img: "/assets/planetary/jupiter.png",
        size: 80,
    },
    Saturn: {
        glyph: "\u2644",
        color: "#fcd34d",
        orbit: { rx: 343, ry: 289 },
        img: "/assets/planetary/saturn.png",
        size: 86,
    },
    Uranus: {
        glyph: "\u2645",
        color: "#22d3ee",
        orbit: { rx: 372, ry: 313 },
        img: "/assets/planetary/uranus.png",
        size: 62,
    },
    Neptune: {
        glyph: "\u2646",
        color: "#60a5fa",
        orbit: { rx: 395, ry: 332 },
        img: "/assets/planetary/neptune.png",
        size: 58,
    },
    Pluto: {
        glyph: "\u2647",
        color: "#c084fc",
        orbit: { rx: 414, ry: 348 },
        img: "/assets/planetary/pluto.png",
        size: 50,
    },
}

/** Render order — outer planets first so inner ones layer above. */
const RENDER_ORDER = [
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

/** Deterministic, SSR-safe star field so layout doesn't twitch on rerender. */
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

const VB_W = 1000
const VB_H = 1000
const CX = VB_W / 2
const CY = 500

function pointOnOrbit(longitude: number, rx: number, ry: number) {
    // Astrology longitude: 0° = Aries. We rotate so that 0° lands at the left
    // ("ascendant" position) and we walk counter-clockwise from there. In SVG
    // (y-down) we negate the y term so visually counter-clockwise looks right.
    const angleDeg = 180 - longitude
    const rad = (angleDeg * Math.PI) / 180
    return {
        x: CX + rx * Math.cos(rad),
        y: CY - ry * Math.sin(rad),
    }
}

// Map alias sign names (e.g. Thai) back to the canonical English key so we can
// resolve a sign index from any locale-stamped chart data.
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
}

function canonicalSign(sign: string): string {
    if (ZODIAC_CANONICAL.includes(sign)) return sign
    return ZODIAC_ALIAS[sign] ?? sign
}

/**
 * Reconstruct ecliptic longitude (0–360°) from the exact `sign` + `degree`
 * fields the transit grid displays. The wheel position should always match
 * what the grid says: a planet shown as "Leo 27°" must sit near the end of
 * the Leo slice, not wherever a separately-stored longitude happens to land.
 */
function longitudeFromSignDegree(sign: string, degree: number): number {
    const canonical = canonicalSign(sign)
    const idx = ZODIAC_CANONICAL.indexOf(canonical)
    if (idx === -1) return ((degree % 360) + 360) % 360
    const deg = Number.isFinite(degree) ? degree : 0
    const lng = idx * 30 + deg
    return ((lng % 360) + 360) % 360
}

// Outer zodiac wheel: a single bounding ellipse sits just outside Pluto's
// orbit, with 12 radial spokes from the center forming sign segments and the
// sign name sitting on each slice at the "mid" radius.
const WHEEL_RX_OUTER = 478
const WHEEL_RY_OUTER = 402
const WHEEL_RX_MID = 458
const WHEEL_RY_MID = 386

export default function TransitOrbitVisual({
    chartData,
}: {
    chartData: TransitChartData | Record<string, unknown> | null | undefined
}) {
    const tAstro = useTranslations("BirthChart")
    const formatter = useFormatter()

    const data = (chartData ?? null) as TransitChartData
    const rawPlanets = data?.transit?.charts?.[0]?.planets ?? null

    const dateLabel = useMemo(() => {
        const d = data?.transit?.date
        if (!d?.day || !d?.month || !d?.year) return null
        try {
            const utc = new Date(
                Date.UTC(d.year, (d.month ?? 1) - 1, d.day ?? 1, 12, 0, 0),
            )
            if (Number.isNaN(utc.getTime())) return null
            return formatter.dateTime(utc, {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
            })
        } catch {
            return null
        }
    }, [data, formatter])

    const stars = useMemo(
        () => buildStars(`orbit::${dateLabel ?? "static"}`, 90, VB_W, VB_H),
        [dateLabel],
    )

    // Build a render list with computed positions; outer-first so inner overlap.
    const placed = useMemo(() => {
        if (!rawPlanets)
            return [] as Array<{
                name: string
                vis: PlanetVisual
                point: TransitPlanet
                x: number
                y: number
            }>
        const out: Array<{
            name: string
            vis: PlanetVisual
            point: TransitPlanet
            x: number
            y: number
        }> = []
        for (const name of RENDER_ORDER) {
            const point = rawPlanets[name]
            const vis = PLANET_VISUAL[name]
            if (!point || !vis?.orbit) continue
            // Position from the grid's displayed values (sign + degree) so the
            // wheel and the grid never disagree, even if upstream `longitude`
            // drifts from those fields due to rounding or system mismatch.
            const lng = longitudeFromSignDegree(point.sign, point.degree)
            const { x, y } = pointOnOrbit(lng, vis.orbit.rx, vis.orbit.ry)
            out.push({ name, vis, point, x, y })
        }
        return out
    }, [rawPlanets])

    const hasPlanets = (placed?.length ?? 0) > 0

    return (
        <div className='relative w-full overflow-hidden'>
            <svg
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                preserveAspectRatio='xMidYMid meet'
                className='block h-auto w-full'
                aria-label='Transit orbit visual'
            >
                <defs>
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
                </defs>

                <rect width={VB_W} height={VB_H} fill='url(#orbit-sky)' />

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

                {/* Zodiac wheel: outer boundary, 12 pizza-slice spokes from
                    the center, and the sign name inside each slice. The spokes
                    pass behind the Sun and planets since they are drawn before
                    those layers. */}
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
                                fill={"#ffffffff"}
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

                {/* Earth at the geocentric center, with a soft atmosphere. */}
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
                    return (
                        <PlanetMark
                            key={name}
                            x={x}
                            y={y}
                            vis={vis}
                            label={planetName}
                            degreeText={`${(Number.isFinite(point.degree) ? point.degree : 0).toFixed(1)}\u00B0`}
                            retrograde={Boolean(point.retrograde)}
                            mirrorKetu={false}
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
    mirrorKetu,
    labelBelow,
}: {
    x: number
    y: number
    vis: PlanetVisual
    label: string
    degreeText: string
    retrograde: boolean
    mirrorKetu: boolean
    labelBelow: boolean
}) {
    const half = vis.size / 2
    // Stack the label group either below or above the planet image.
    const baseY = labelBelow ? y + half + 22 : y - half - 16 - 50
    const nameY = baseY
    const degreeY = baseY + 28

    return (
        <g>
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
                transform={mirrorKetu ? `rotate(90 ${x} ${y})` : undefined}
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
