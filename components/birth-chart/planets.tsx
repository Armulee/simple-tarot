"use client"

import { useMemo } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"

import { SANSKRIT_SIGNS, AstroPoint } from "@/lib/birth-chart-utils"

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

export default function BirthChartPlanets({
    planets,
}: BirthChartPlanetsProps) {
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
        <div className='overflow-hidden rounded-2xl bg-white/[0.04] backdrop-blur-2xl ring-1 ring-white/[0.06] shadow-[0_12px_40px_-20px_rgba(0,0,0,0.5)]'>
            <ul className='divide-y divide-white/[0.05]'>
                {rows.map(({ planet, translatedSign, point, meaning }) => (
                    <PlanetRow
                        key={planet}
                        planet={planet}
                        translatedSign={translatedSign}
                        planetLabel={t(`planets.${planet}`, {
                            defaultValue: planet,
                        })}
                        inLabel={t("in")}
                        meaning={meaning}
                        point={point}
                    />
                ))}
            </ul>
        </div>
    )
}

function PlanetRow({
    planet,
    translatedSign,
    planetLabel,
    inLabel,
    meaning,
    point,
}: {
    planet: string
    translatedSign: string
    planetLabel: string
    inLabel: string
    meaning: string
    point: AstroPoint | null
}) {
    const hasMeaning = Boolean(meaning?.trim())
    const retro = Boolean(point?.retrograde)
    const degree = point?.degree
    const degNum =
        degree !== undefined && degree !== null && degree !== ""
            ? Number(degree)
            : NaN
    const degreeLine = Number.isFinite(degNum) ? `${degNum.toFixed(1)}°` : null

    const visual = PLANET_IMAGE[planet]

    return (
        <li className='group px-5 py-4 transition-colors hover:bg-white/[0.02]'>
            <div className='flex items-start gap-4'>
                <div className='inline-grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[0.05] ring-1 ring-white/[0.08] overflow-hidden'>
                    {visual ? (
                        <Image
                            src={visual.src}
                            alt=''
                            aria-hidden
                            width={36}
                            height={36}
                            className='h-9 w-9 rounded-full object-cover'
                            style={{
                                transform: visual.mirror
                                    ? "rotate(180deg)"
                                    : undefined,
                            }}
                        />
                    ) : (
                        <span className='text-sm text-white/80'>
                            {planet.slice(0, 1)}
                        </span>
                    )}
                </div>

                <div className='min-w-0 flex-1 space-y-1'>
                    <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
                        <h3 className='text-[15.5px] font-semibold leading-tight text-white'>
                            {planetLabel}
                        </h3>
                        <span className='text-sm text-white/55'>
                            {inLabel}
                        </span>
                        <span className='text-sm font-medium text-amber-100/90'>
                            {translatedSign}
                        </span>
                    </div>

                    {hasMeaning ? (
                        <p className='text-[13.5px] leading-relaxed text-white/65 pr-2'>
                            {meaning}
                        </p>
                    ) : null}
                </div>

                <div className='flex shrink-0 items-center gap-1.5 pt-0.5'>
                    {degreeLine ? (
                        <span className='rounded-full bg-white/[0.05] ring-1 ring-white/[0.08] px-2.5 py-0.5 font-mono text-[11.5px] tabular-nums text-white/85'>
                            {degreeLine}
                        </span>
                    ) : null}
                    {retro ? (
                        <span
                            title='Retrograde'
                            className='inline-flex items-center justify-center rounded-full bg-rose-400/[0.10] ring-1 ring-rose-300/25 px-2 py-0.5 font-mono text-[11.5px] text-rose-200'
                        >
                            ℞
                        </span>
                    ) : null}
                </div>
            </div>
        </li>
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
