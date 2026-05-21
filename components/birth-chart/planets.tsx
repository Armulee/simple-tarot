"use client"

import { useMemo } from "react"
import Image from "next/image"
import { Orbit, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"

import { SANSKRIT_SIGNS, AstroPoint } from "@/lib/birth-chart-utils"
import { cn } from "@/lib/utils"

interface BirthChartPlanetsProps {
    planets?: Record<string, unknown> | null
}

const PLANET_ORDER = [
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
    "Rahu",
    "Ketu",
] as const

const PLANET_IMAGE: Record<string, { src: string; mirror?: boolean }> = {
    Sun: { src: "/assets/planetary/sun.png" },
    Moon: { src: "/assets/planetary/moon.png" },
    Mars: { src: "/assets/planetary/mars.png" },
    Mercury: { src: "/assets/planetary/mercury.png" },
    Jupiter: { src: "/assets/planetary/jupiter.png" },
    Venus: { src: "/assets/planetary/venus.png" },
    Saturn: { src: "/assets/planetary/saturn.png" },
    Rahu: { src: "/assets/planetary/rahu.png" },
    Ketu: { src: "/assets/planetary/rahu.png", mirror: true },
    Uranus: { src: "/assets/planetary/uranus.png" },
    Neptune: { src: "/assets/planetary/neptune.png" },
    Pluto: { src: "/assets/planetary/pluto.png" },
}

const PLANET_GLOW: Record<string, string> = {
    Sun: "drop-shadow(0 6px 16px rgba(252,211,77,0.55))",
    Moon: "drop-shadow(0 6px 14px rgba(226,232,240,0.45))",
    Mars: "drop-shadow(0 6px 14px rgba(248,113,113,0.55))",
    Mercury: "drop-shadow(0 6px 14px rgba(110,231,183,0.45))",
    Jupiter: "drop-shadow(0 6px 14px rgba(253,224,71,0.45))",
    Venus: "drop-shadow(0 6px 14px rgba(244,114,182,0.45))",
    Saturn: "drop-shadow(0 6px 14px rgba(165,180,252,0.45))",
    Rahu: "drop-shadow(0 6px 14px rgba(196,181,253,0.45))",
    Ketu: "drop-shadow(0 6px 14px rgba(214,211,209,0.45))",
    Uranus: "drop-shadow(0 6px 14px rgba(56,189,248,0.45))",
    Neptune: "drop-shadow(0 6px 14px rgba(99,102,241,0.45))",
    Pluto: "drop-shadow(0 6px 14px rgba(148,163,184,0.5))",
}

export default function BirthChartPlanets({
    planets,
    selectedPlanet,
}: BirthChartPlanetsProps & { selectedPlanet?: string | null }) {
    const t = useTranslations("BirthChart")

    const rows = useMemo(() => {
        if (!planets) return []

        const entries = Object.entries(planets as Record<string, unknown>).map(
            ([planet, position]) => {
                let signName = ""
                let point: AstroPoint | null = null
                if (typeof position === "string") {
                    signName = position
                } else if (
                    typeof position === "object" &&
                    position !== null &&
                    "sign" in position
                ) {
                    point = position as AstroPoint
                    signName = point.sign
                }

                const displaySign = normalizeSign(signName)
                const translatedSign = t(`zodiacSigns.${displaySign}`, {
                    defaultValue: displaySign,
                })
                const meaningRaw = t(
                    `planetInSign.${planet}.${displaySign}`,
                    { defaultValue: "" },
                )
                const meaning =
                    typeof meaningRaw === "string" ? meaningRaw.trim() : ""

                return {
                    planet,
                    signName,
                    displaySign,
                    translatedSign,
                    point,
                    meaning,
                }
            },
        )

        const orderIndex = (name: string) => {
            const i = PLANET_ORDER.indexOf(
                name as (typeof PLANET_ORDER)[number],
            )
            return i === -1 ? 999 : i
        }

        return entries.sort(
            (a, b) => orderIndex(a.planet) - orderIndex(b.planet),
        )
    }, [planets, t])

    if (!planets || rows.length === 0) return null

    return (
        <section className='relative overflow-hidden'>
            <div className='relative space-y-6'>
                <div className='flex items-center gap-3'>
                    <span className='h-px w-8 bg-gradient-to-r from-amber-300/80 to-transparent' />
                    <span className='inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-300/10 ring-1 ring-amber-300/30'>
                        <Orbit className='h-3.5 w-3.5 text-amber-200' />
                    </span>
                    <p className='text-[11px] font-medium uppercase tracking-[0.32em] text-amber-200/80'>
                        {t("planetaryPositions")}
                    </p>
                    <Sparkles className='h-3.5 w-3.5 text-amber-200/70' />
                    <span className='h-px flex-1 bg-gradient-to-r from-amber-300/30 to-transparent' />
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4'>
                    {rows.map(
                        ({
                            planet,
                            translatedSign,
                            point,
                            meaning,
                        }) => (
                            <PlanetCard
                                key={planet}
                                planet={planet}
                                translatedSign={translatedSign}
                                planetLabel={t(`planets.${planet}`, {
                                    defaultValue: planet,
                                })}
                                inLabel={t("in")}
                                meaning={meaning}
                                point={point}
                                isHighlighted={selectedPlanet === planet}
                            />
                        ),
                    )}
                </div>
            </div>
        </section>
    )
}

function PlanetCard({
    planet,
    translatedSign,
    planetLabel,
    inLabel,
    meaning,
    point,
    isHighlighted,
}: {
    planet: string
    translatedSign: string
    planetLabel: string
    inLabel: string
    meaning: string
    point: AstroPoint | null
    isHighlighted?: boolean
}) {
    const hasMeaning = Boolean(meaning?.trim())
    const retro = Boolean(point?.retrograde)
    const degree = point?.degree
    const degNum =
        degree !== undefined && degree !== null && degree !== ""
            ? Number(degree)
            : NaN
    const degreeLine = Number.isFinite(degNum)
        ? `${degNum.toFixed(1)}°`
        : null

    const visual = PLANET_IMAGE[planet]
    const glow = PLANET_GLOW[planet] ?? PLANET_GLOW.Pluto

    return (
        <article
            id={`bc-planet-${planet}`}
            className={cn(
                "group relative overflow-hidden rounded-2xl border bg-gradient-to-b from-white/[0.05] to-white/[0.01] backdrop-blur-xl p-5 transition-colors duration-300 scroll-mt-24",
                hasMeaning
                    ? "border-amber-300/25 hover:border-amber-300/45"
                    : "border-white/10 hover:border-white/20",
                isHighlighted &&
                    "ring-2 ring-amber-300/70 ring-offset-2 ring-offset-[#04060f] shadow-[0_0_30px_-6px_rgba(252,211,77,0.55)]",
            )}
        >
            {hasMeaning && (
                <div
                    aria-hidden
                    className='pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-amber-300/8 blur-3xl'
                />
            )}

            <div className='relative flex items-start gap-4'>
                <div
                    className={cn(
                        "relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-1",
                        hasMeaning
                            ? "ring-amber-300/35 bg-amber-300/[0.07]"
                            : "ring-white/15 bg-white/[0.04]",
                    )}
                >
                    <span
                        aria-hidden
                        className={cn(
                            "pointer-events-none absolute inset-0 rounded-full blur-md opacity-80",
                            hasMeaning ? "bg-amber-300/10" : "bg-white/[0.04]",
                        )}
                    />
                    {visual ? (
                        <Image
                            src={visual.src}
                            alt=''
                            aria-hidden
                            width={44}
                            height={44}
                            className='relative h-10 w-10 rounded-full object-cover'
                            style={{
                                filter: glow,
                                transform: visual.mirror
                                    ? "rotate(180deg)"
                                    : undefined,
                            }}
                        />
                    ) : (
                        <span className='relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-serif text-sm font-medium text-white/80'>
                            {planet.slice(0, 1)}
                        </span>
                    )}
                </div>

                <div className='min-w-0 flex-1 space-y-3'>
                    <div className='flex flex-wrap items-start justify-between gap-2'>
                        <div className='min-w-0 space-y-1'>
                            <div className='flex flex-wrap items-center gap-x-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-white/45'>
                                <span
                                    className={
                                        hasMeaning
                                            ? "text-amber-200/85"
                                            : "text-white/50"
                                    }
                                >
                                    {planetLabel}
                                </span>
                                <span
                                    aria-hidden
                                    className='h-1 w-1 rounded-full bg-white/35'
                                />
                                <span className='text-white/55'>
                                    {translatedSign}
                                </span>
                            </div>
                            <h3 className='font-serif italic text-lg leading-tight text-white'>
                                {planetLabel}{" "}
                                <span className='text-white/45 not-italic text-base font-normal'>
                                    {inLabel}
                                </span>{" "}
                                <span className='text-amber-100/95'>
                                    {translatedSign}
                                </span>
                            </h3>
                        </div>

                        <div className='flex shrink-0 flex-col items-end gap-1.5'>
                            {retro ? (
                                <span className='rounded-full border border-rose-300/35 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-rose-200'>
                                    ℞
                                </span>
                            ) : null}
                            {degreeLine ? (
                                <span className='rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] tabular-nums text-sky-200/90'>
                                    {degreeLine}
                                </span>
                            ) : null}
                        </div>
                    </div>

                    {hasMeaning ? (
                        <div className='rounded-xl border border-white/10 bg-white/[0.025] p-3.5'>
                            <p className='mb-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-amber-200/85'>
                                {planetLabel}{" "}
                                <span className='text-white/45'>{inLabel}</span>{" "}
                                {translatedSign}
                            </p>
                            <p className='text-[12.5px] leading-relaxed text-white/75'>
                                {meaning}
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
        </article>
    )
}

function normalizeSign(sign: string): string {
    if (!sign) return ""
    const englishSign =
        SANSKRIT_SIGNS[sign] ||
        (Object.keys(SANSKRIT_SIGNS).find(
            (k) => k.toLowerCase() === sign.toLowerCase(),
        )
            ? SANSKRIT_SIGNS[
                  Object.keys(SANSKRIT_SIGNS).find(
                      (k) => k.toLowerCase() === sign.toLowerCase(),
                  ) as string
              ]
            : sign)
    return englishSign || sign
}
