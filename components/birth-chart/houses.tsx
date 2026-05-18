"use client"

import Image from "next/image"
import { Home, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"

import { SANSKRIT_SIGNS, AstroPoint } from "@/lib/birth-chart-utils"
import { cn } from "@/lib/utils"

interface BirthChartHousesProps {
    houses?: Record<string, unknown> | null
    planets?: Record<string, unknown> | null
}

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

export default function BirthChartHouses({
    houses,
    planets,
}: BirthChartHousesProps) {
    const t = useTranslations("BirthChart")

    if (!houses) return null

    const getHouseMeaning = (houseNum: string): string =>
        t(`houseMeanings.${houseNum}`)

    const getHouseDescription = (houseNum: string): string =>
        t(`houseDescriptions.${houseNum}`)

    const getPlanetInHouseMeaning = (
        planet: string,
        houseNum: string,
    ): string => {
        try {
            return t(`planetInHouse.${planet}.${houseNum}`)
        } catch {
            return ""
        }
    }

    const normalizeSign = (sign: string): string => {
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

    const getPlanetsInSign = (sign: string): string[] => {
        if (!planets) return []
        const normalizedSign = normalizeSign(sign)
        const planetsInSign: string[] = []

        Object.entries(planets).forEach(([planetName, planetData]) => {
            let planetSign = ""
            if (typeof planetData === "string") {
                planetSign = planetData
            } else if (
                typeof planetData === "object" &&
                planetData &&
                "sign" in planetData
            ) {
                planetSign = (planetData as AstroPoint).sign
            }

            const normalizedPlanetSign = normalizeSign(planetSign)
            if (
                normalizedPlanetSign.toLowerCase() ===
                normalizedSign.toLowerCase()
            ) {
                planetsInSign.push(planetName)
            }
        })

        return planetsInSign
    }

    return (
        <section className='relative overflow-hidden'>
            <div className='relative space-y-6'>
                <div className='flex items-center gap-3'>
                    <span className='h-px w-8 bg-gradient-to-r from-amber-300/80 to-transparent' />
                    <span className='inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-300/10 ring-1 ring-amber-300/30'>
                        <Home className='h-3.5 w-3.5 text-amber-200' />
                    </span>
                    <p className='text-[11px] font-medium uppercase tracking-[0.32em] text-amber-200/80'>
                        {t("yourHouses")}
                    </p>
                    <Sparkles className='h-3.5 w-3.5 text-amber-200/70' />
                    <span className='h-px flex-1 bg-gradient-to-r from-amber-300/30 to-transparent' />
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4'>
                    {Object.entries(houses).map(([houseNum, signData]) => {
                        let signName = ""
                        if (typeof signData === "string") {
                            signName = signData
                        } else if (
                            typeof signData === "object" &&
                            signData &&
                            "sign" in signData
                        ) {
                            signName = (signData as AstroPoint).sign
                        }

                        const planetsInHouse = getPlanetsInSign(signName)
                        const suffix = getOrdinalSuffix(Number(houseNum))
                        const normalizedSign = signName
                            ? normalizeSign(signName)
                            : ""
                        const signLabel = normalizedSign
                            ? t(`zodiacSigns.${normalizedSign}`, {
                                  defaultValue: normalizedSign,
                              })
                            : ""

                        return (
                            <HouseCard
                                key={houseNum}
                                houseNum={houseNum}
                                suffix={suffix}
                                houseLabel={t("house")}
                                signLabel={signLabel}
                                title={getHouseMeaning(houseNum)}
                                description={getHouseDescription(houseNum)}
                                planetsInHouse={planetsInHouse}
                                planetNameOf={(p) => t(`planets.${p}`)}
                                inLabel={t("in")}
                                meaningFor={(p) =>
                                    getPlanetInHouseMeaning(p, houseNum)
                                }
                            />
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

function HouseCard({
    houseNum,
    suffix,
    houseLabel,
    signLabel,
    title,
    description,
    planetsInHouse,
    planetNameOf,
    inLabel,
    meaningFor,
}: {
    houseNum: string
    suffix: string
    houseLabel: string
    signLabel: string
    title: string
    description: string
    planetsInHouse: string[]
    planetNameOf: (planet: string) => string
    inLabel: string
    meaningFor: (planet: string) => string
}) {
    const hasPlanets = planetsInHouse.length > 0
    return (
        <article
            className={cn(
                "group relative overflow-hidden rounded-2xl border bg-gradient-to-b from-white/[0.05] to-white/[0.01] backdrop-blur-xl p-5 transition-colors duration-300",
                hasPlanets
                    ? "border-amber-300/25 hover:border-amber-300/45"
                    : "border-white/10 hover:border-white/20",
            )}
        >
            {hasPlanets && (
                <div
                    aria-hidden
                    className='pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-amber-300/8 blur-3xl'
                />
            )}

            <div className='relative space-y-4'>
                <div className='flex items-start gap-4'>
                    <div
                        className={cn(
                            "shrink-0 inline-flex h-14 w-14 items-center justify-center rounded-2xl border backdrop-blur-md",
                            hasPlanets
                                ? "border-amber-300/35 bg-amber-300/[0.07]"
                                : "border-white/10 bg-white/[0.03]",
                        )}
                    >
                        <span
                            className={cn(
                                "font-serif italic text-2xl leading-none tabular-nums",
                                hasPlanets ? "text-amber-100" : "text-white/85",
                            )}
                        >
                            {houseNum}
                        </span>
                    </div>

                    <div className='flex-1 min-w-0 space-y-1'>
                        <div className='flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.22em]'>
                            <span
                                className={cn(
                                    hasPlanets
                                        ? "text-amber-200/80"
                                        : "text-white/45",
                                )}
                            >
                                {houseNum}
                                {suffix} {houseLabel}
                            </span>
                            {signLabel ? (
                                <>
                                    <span
                                        aria-hidden
                                        className='h-1 w-1 rounded-full bg-white/30'
                                    />
                                    <span className='text-white/55'>
                                        {signLabel}
                                    </span>
                                </>
                            ) : null}
                        </div>
                        <h3 className='font-serif italic text-lg leading-tight text-white'>
                            {title}
                        </h3>
                    </div>
                </div>

                <p className='text-[13px] sm:text-sm leading-relaxed text-white/60'>
                    {description}
                </p>

                {hasPlanets ? (
                    <div className='pt-4 border-t border-white/10 space-y-3'>
                        <div className='flex flex-wrap gap-1.5'>
                            {planetsInHouse.map((planet) => (
                                <PlanetChip
                                    key={planet}
                                    planet={planet}
                                    label={planetNameOf(planet)}
                                />
                            ))}
                        </div>

                        <div className='space-y-2'>
                            {planetsInHouse.map((planet) => {
                                const meaning = meaningFor(planet)
                                if (!meaning) return null
                                return (
                                    <div
                                        key={planet}
                                        className='rounded-xl border border-white/10 bg-white/[0.025] p-3.5'
                                    >
                                        <div className='mb-1.5 inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-amber-200/85'>
                                            <PlanetIcon
                                                planet={planet}
                                                size={16}
                                            />
                                            <span>
                                                {planetNameOf(planet)}{" "}
                                                <span className='text-white/45'>
                                                    {inLabel}
                                                </span>{" "}
                                                {houseNum}
                                                {suffix} {houseLabel}
                                            </span>
                                        </div>
                                        <p className='text-[12.5px] leading-relaxed text-white/75'>
                                            {meaning}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : null}
            </div>
        </article>
    )
}

function PlanetChip({ planet, label }: { planet: string; label: string }) {
    return (
        <span className='inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/[0.06] py-1 pl-1 pr-2.5 text-[11px] font-medium text-amber-100'>
            <PlanetIcon planet={planet} size={18} ring />
            {label}
        </span>
    )
}

function PlanetIcon({
    planet,
    size = 18,
    ring,
}: {
    planet: string
    size?: number
    ring?: boolean
}) {
    const visual = PLANET_IMAGE[planet]
    if (!visual) {
        return (
            <span
                aria-hidden
                className={cn(
                    "inline-block rounded-full bg-amber-300/80",
                    ring && "ring-1 ring-amber-300/40",
                )}
                style={{ width: size, height: size }}
            />
        )
    }
    return (
        <Image
            src={visual.src}
            alt=''
            aria-hidden
            width={size}
            height={size}
            className={cn(
                "rounded-full object-cover",
                ring && "ring-1 ring-amber-300/40",
            )}
            style={{
                width: size,
                height: size,
                transform: visual.mirror ? "rotate(180deg)" : undefined,
            }}
        />
    )
}

function getOrdinalSuffix(i: number) {
    const j = i % 10,
        k = i % 100
    if (j == 1 && k != 11) {
        return "st"
    }
    if (j == 2 && k != 12) {
        return "nd"
    }
    if (j == 3 && k != 13) {
        return "rd"
    }
    return "th"
}
