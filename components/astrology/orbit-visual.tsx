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
// Zodiac labels sit just OUTSIDE the outer ring; cardinal diamond marks sit
// right on it. These offsets keep both away from the orbit lines.
const ZODIAC_LABEL_RX = 510
const ZODIAC_LABEL_RY = 432

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

export type OrbitAspectLine = {
    transitPlanet: string
    natalPlanet: string
    aspectType: "conjunction" | "opposition" | "sextile" | "square"
}

const ASPECT_STYLE: Record<
    OrbitAspectLine["aspectType"],
    {
        stroke: string
        dash?: string
        label: string
        textColor: string
    }
> = {
    conjunction: {
        stroke: "rgba(252, 211, 77, 0.7)",
        label: "Conj",
        textColor: "#fde68a",
    },
    sextile: {
        stroke: "rgba(134, 239, 172, 0.7)",
        dash: "6 5",
        label: "Sextile",
        textColor: "#bbf7d0",
    },
    square: {
        stroke: "rgba(252, 165, 165, 0.7)",
        label: "Square",
        textColor: "#fecaca",
    },
    opposition: {
        stroke: "rgba(165, 180, 252, 0.7)",
        dash: "10 5",
        label: "Opp",
        textColor: "#c7d2fe",
    },
}

export default function OrbitVisual({
    planets,
    dateLabel,
    highlightPlanets,
    starSeed,
    ariaLabel = "Orbit visual",
    shadowPlanets,
    aspects,
    labelMode = "name-degree",
}: {
    planets?: Record<string, unknown> | null
    /** Optional date label rendered centered at the top of the visual. */
    dateLabel?: string | null
    /** Canonical English planet keys to spotlight with a purple aura. */
    highlightPlanets?: ReadonlyArray<string>
    /** Deterministic seed for the starfield; defaults to dateLabel or a static seed. */
    starSeed?: string
    ariaLabel?: string
    /**
     * Secondary set of planet positions rendered as low-opacity shadows
     * behind the primary `planets`. Used by the transit view to overlay the
     * asker's natal positions onto the live transit wheel.
     */
    shadowPlanets?: Record<string, unknown> | null
    /**
     * Aspect lines connecting a planet in `planets` (transitPlanet) to a
     * planet in `shadowPlanets` (natalPlanet). Each line is colored and
     * labeled by its aspect type. Only the four cardinal majors render.
     */
    aspects?: ReadonlyArray<OrbitAspectLine>
    /**
     * `"name-degree"` (default) prints PlanetName above the degree (the
     * birth-chart style). `"sign-degree"` prints `{sign} {degree}°` on one
     * line and drops the planet name — used by the transit overview where
     * the planet image already identifies the body.
     */
    labelMode?: "name-degree" | "sign-degree"
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

    const shadows = useMemo(() => {
        if (!shadowPlanets) {
            return [] as Array<{
                name: string
                vis: PlanetVisual
                x: number
                y: number
            }>
        }
        const out: Array<{
            name: string
            vis: PlanetVisual
            x: number
            y: number
        }> = []
        for (const name of RENDER_ORDER) {
            const raw = shadowPlanets[name]
            const vis = PLANET_VISUAL[name]
            if (!raw || typeof raw !== "object" || !vis?.orbit) continue
            const lng = resolveLongitude(raw as OrbitPoint)
            const { x, y } = pointOnOrbit(lng, vis.orbit.rx, vis.orbit.ry)
            out.push({ name, vis, x, y })
        }
        return out
    }, [shadowPlanets])

    const aspectLines = useMemo(() => {
        if (!aspects || aspects.length === 0 || !planets || !shadowPlanets) {
            return [] as Array<{
                key: string
                x1: number
                y1: number
                x2: number
                y2: number
                aspectType: OrbitAspectLine["aspectType"]
            }>
        }
        const placedByName = new Map(placed.map((p) => [p.name, p]))
        const shadowByName = new Map(shadows.map((s) => [s.name, s]))
        const lines: Array<{
            key: string
            x1: number
            y1: number
            x2: number
            y2: number
            aspectType: OrbitAspectLine["aspectType"]
        }> = []
        for (const aspect of aspects) {
            const t = placedByName.get(aspect.transitPlanet)
            const n = shadowByName.get(aspect.natalPlanet)
            if (!t || !n) continue
            lines.push({
                key: `${aspect.transitPlanet}-${aspect.natalPlanet}-${aspect.aspectType}`,
                x1: t.x,
                y1: t.y,
                x2: n.x,
                y2: n.y,
                aspectType: aspect.aspectType,
            })
        }
        return lines
    }, [aspects, placed, shadows, planets, shadowPlanets])

    const hasPlanets = placed.length > 0

    return (
        <div className='relative w-full overflow-hidden'>
            <svg
                viewBox={`-70 -30 ${VB_W + 140} ${VB_H + 60}`}
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
                            stroke='rgba(252, 211, 77, 0.22)'
                            strokeWidth={0.9}
                        />
                    )
                })}

                <g>
                    {/* Soft outer ring — a touch brighter than the orbits so
                        the zodiac boundary reads. */}
                    <ellipse
                        cx={CX}
                        cy={CY}
                        rx={WHEEL_RX_OUTER}
                        ry={WHEEL_RY_OUTER}
                        fill='none'
                        stroke='rgba(252, 211, 77, 0.38)'
                        strokeWidth={1}
                    />
                    {/* Two cardinal axis lines — horizontal + vertical — pass
                        through Earth to mirror the reference layout (no 12
                        wheel spokes). */}
                    {[0, 90].map((lng) => {
                        const a = pointOnOrbit(
                            lng,
                            WHEEL_RX_OUTER,
                            WHEEL_RY_OUTER,
                        )
                        const b = pointOnOrbit(
                            lng + 180,
                            WHEEL_RX_OUTER,
                            WHEEL_RY_OUTER,
                        )
                        return (
                            <line
                                key={`cardinal-${lng}`}
                                x1={a.x}
                                y1={a.y}
                                x2={b.x}
                                y2={b.y}
                                stroke='rgba(252, 211, 77, 0.18)'
                                strokeWidth={0.9}
                            />
                        )
                    })}
                    {/* Small gold diamonds where the cardinal cross meets the
                        outer ring. */}
                    {[0, 90, 180, 270].map((lng) => {
                        const p = pointOnOrbit(
                            lng,
                            WHEEL_RX_OUTER,
                            WHEEL_RY_OUTER,
                        )
                        const s = 6
                        return (
                            <polygon
                                key={`cardinal-mark-${lng}`}
                                points={`${p.x},${p.y - s} ${p.x + s},${p.y} ${p.x},${p.y + s} ${p.x - s},${p.y}`}
                                fill='rgba(253, 224, 71, 0.85)'
                                stroke='rgba(252, 211, 77, 0.6)'
                                strokeWidth={0.6}
                            />
                        )
                    })}
                    {/* Zodiac labels at every 30° interval, OUTSIDE the outer
                        ring — names sit beyond the wheel rather than between
                        rings, matching the reference visual. */}
                    {ZODIAC_CANONICAL.map((sign, i) => {
                        const lng = i * 30 + 15
                        const pos = pointOnOrbit(
                            lng,
                            ZODIAC_LABEL_RX,
                            ZODIAC_LABEL_RY,
                        )
                        const name = tAstro(`zodiacSigns.${sign}`, {
                            defaultValue: sign,
                        })
                        return (
                            <text
                                key={`wheel-sign-${sign}`}
                                x={pos.x}
                                y={pos.y + 5}
                                textAnchor='middle'
                                fill='#fde68a'
                                fontSize={18}
                                fontWeight={500}
                                letterSpacing={1}
                                opacity={0.9}
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

                {/* Aspect lines run UNDER the planet images so the planet
                    icons cap each end of the line cleanly. Drawn here, after
                    Earth but before any planets. */}
                {aspectLines.map((line) => {
                    const style = ASPECT_STYLE[line.aspectType]
                    const mx = (line.x1 + line.x2) / 2
                    const my = (line.y1 + line.y2) / 2
                    return (
                        <g key={line.key}>
                            <line
                                x1={line.x1}
                                y1={line.y1}
                                x2={line.x2}
                                y2={line.y2}
                                stroke={style.stroke}
                                strokeWidth={1.6}
                                strokeDasharray={style.dash}
                                strokeLinecap='round'
                            />
                            <text
                                x={mx}
                                y={my}
                                textAnchor='middle'
                                dominantBaseline='middle'
                                fill={style.textColor}
                                fontSize={14}
                                fontWeight={600}
                                letterSpacing={1}
                                style={{
                                    fontFamily:
                                        'ui-sans-serif, system-ui, -apple-system, "Segoe UI"',
                                    paintOrder: "stroke",
                                    stroke: "rgba(4, 6, 15, 0.85)",
                                    strokeWidth: 4,
                                    strokeLinejoin: "round",
                                }}
                            >
                                {style.label}
                            </text>
                        </g>
                    )
                })}

                {/* Natal-position shadows: same planet image at low opacity,
                    no label. They sit BELOW the transit planets so the live
                    bodies read on top. */}
                {shadows.map(({ name, vis, x, y }) => {
                    const half = vis.size / 2
                    return (
                        <image
                            key={`shadow-${name}`}
                            href={vis.img}
                            x={x - half}
                            y={y - half}
                            width={vis.size}
                            height={vis.size}
                            preserveAspectRatio='xMidYMid slice'
                            transform={
                                vis.mirror ? `rotate(180 ${x} ${y})` : undefined
                            }
                            opacity={0.28}
                            style={{
                                filter: "grayscale(0.4) drop-shadow(0 2px 6px rgba(0,0,0,0.45))",
                            }}
                        />
                    )
                })}

                {placed.map(({ name, vis, point, x, y }) => {
                    const planetName = tAstro(`planets.${name}`, {
                        defaultValue: name,
                    })
                    const degreeRaw = Number(point.degree)
                    const degree = Number.isFinite(degreeRaw) ? degreeRaw : 0
                    const isHighlighted = highlightSet
                        ? highlightSet.has(name)
                        : false
                    // When a highlight set is active, dim every non-asked
                    // planet to half opacity so the asked one visually leads
                    // without making the others disappear.
                    const dimmed = !!highlightSet && !isHighlighted
                    const signRaw =
                        typeof point.sign === "string" ? point.sign : ""
                    const canonical = canonicalSign(signRaw)
                    const signLabel = signRaw
                        ? tAstro(`zodiacSigns.${canonical}`, {
                              defaultValue: signRaw,
                          })
                        : ""
                    const degreeText = `${degree.toFixed(1)}°`
                    const useSignDegree = labelMode === "sign-degree"
                    return (
                        <PlanetMark
                            key={name}
                            x={x}
                            y={y}
                            vis={vis}
                            label={
                                useSignDegree
                                    ? signLabel
                                        ? `${signLabel} ${degreeText}`
                                        : degreeText
                                    : planetName
                            }
                            degreeText={degreeText}
                            retrograde={Boolean(point.retrograde)}
                            labelBelow={y < CY + 50}
                            highlighted={isHighlighted}
                            dimmed={dimmed}
                            singleLineLabel={useSignDegree}
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
    dimmed = false,
    singleLineLabel = false,
}: {
    x: number
    y: number
    vis: PlanetVisual
    label: string
    degreeText: string
    retrograde: boolean
    labelBelow: boolean
    highlighted?: boolean
    /** When true, dim the planet (image + label + degree) to half opacity. */
    dimmed?: boolean
    /**
     * When true, `label` already contains both sign and degree (e.g.
     * "Aries 12.3°") and the secondary degree line is suppressed.
     */
    singleLineLabel?: boolean
}) {
    const half = vis.size / 2
    const baseY = labelBelow
        ? y + half + 22
        : singleLineLabel
          ? y - half - 16 - 22
          : y - half - 16 - 50
    const nameY = baseY
    const degreeY = baseY + 28
    const auraRadius = vis.size * 1.6

    return (
        <g opacity={dimmed ? 0.5 : 1}>
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
                fontSize={singleLineLabel ? 20 : 22}
                fontWeight={600}
                style={{
                    fontFamily:
                        'ui-sans-serif, system-ui, -apple-system, "Segoe UI"',
                }}
            >
                {label}
            </text>
            {!singleLineLabel && (
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
            )}
        </g>
    )
}
