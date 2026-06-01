"use client"

import Image from "next/image"
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

const SIGN_RULER: Record<string, string> = {
    Aries: "Mars",
    Taurus: "Venus",
    Gemini: "Mercury",
    Cancer: "Moon",
    Leo: "Sun",
    Virgo: "Mercury",
    Libra: "Venus",
    Scorpio: "Mars",
    Sagittarius: "Jupiter",
    Capricorn: "Saturn",
    Aquarius: "Saturn",
    Pisces: "Jupiter",
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
        const out: string[] = []
        Object.entries(planets).forEach(([planetName, planetData]) => {
            let planetSign = ""
            if (typeof planetData === "string") planetSign = planetData
            else if (
                typeof planetData === "object" &&
                planetData &&
                "sign" in planetData
            )
                planetSign = (planetData as AstroPoint).sign
            const normalizedPlanetSign = normalizeSign(planetSign)
            if (
                normalizedPlanetSign.toLowerCase() ===
                normalizedSign.toLowerCase()
            )
                out.push(planetName)
        })
        return out
    }

    return (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {Object.entries(houses).map(([houseNum, signData]) => {
                let signName = ""
                if (typeof signData === "string") signName = signData
                else if (
                    typeof signData === "object" &&
                    signData &&
                    "sign" in signData
                )
                    signName = (signData as AstroPoint).sign

                const planetsInHouse = getPlanetsInSign(signName)
                const suffix = getOrdinalSuffix(Number(houseNum))
                const normalizedSign = signName ? normalizeSign(signName) : ""
                const signLabel = normalizedSign
                    ? t(`zodiacSigns.${normalizedSign}`, {
                          defaultValue: normalizedSign,
                      })
                    : ""
                const ruler = normalizedSign
                    ? SIGN_RULER[normalizedSign] ?? null
                    : null

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
                        meaningFor={(p) => getPlanetInHouseMeaning(p, houseNum)}
                        ruler={ruler}
                        rulerLabel={t("houseRuler")}
                    />
                )
            })}
        </div>
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
    ruler,
    rulerLabel,
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
    ruler: string | null
    rulerLabel: string
}) {
    const hasPlanets = planetsInHouse.length > 0
    return (
        <article className='rounded-2xl bg-white/[0.04] backdrop-blur-2xl ring-1 ring-white/[0.06] shadow-[0_12px_40px_-20px_rgba(0,0,0,0.5)] p-5 sm:p-6 transition-shadow duration-300 hover:shadow-[0_18px_50px_-22px_rgba(0,0,0,0.6)]'>
            <div className='flex items-start gap-4'>
                <div className='shrink-0 inline-grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.06] ring-1 ring-white/[0.08]'>
                    <span className='text-base font-semibold tabular-nums text-white'>
                        {houseNum}
                    </span>
                </div>
                <div className='min-w-0 flex-1 space-y-1'>
                    <div className='flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-white/55'>
                        <span>
                            {houseNum}
                            {suffix} {houseLabel}
                        </span>
                        {signLabel ? (
                            <>
                                <span
                                    aria-hidden
                                    className='h-1 w-1 rounded-full bg-white/30'
                                />
                                <span className='text-white/70'>{signLabel}</span>
                            </>
                        ) : null}
                    </div>
                    <h3 className='text-[17px] font-semibold leading-tight text-white'>
                        {title}
                    </h3>
                </div>
            </div>

            <p className='mt-4 text-[14px] leading-relaxed text-white/65'>
                {description}
            </p>

            {ruler ? (
                <div className='mt-4 flex flex-wrap items-center gap-2'>
                    <span className='text-[11px] text-white/50'>
                        {rulerLabel}
                    </span>
                    <PlanetChip planet={ruler} label={planetNameOf(ruler)} />
                </div>
            ) : null}

            {hasPlanets ? (
                <div className='mt-5 border-t border-white/[0.07] pt-4 space-y-3'>
                    <div className='flex flex-wrap gap-1.5'>
                        {planetsInHouse.map((planet) => (
                            <PlanetChip
                                key={planet}
                                planet={planet}
                                label={planetNameOf(planet)}
                                accent
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
                                    className='rounded-xl bg-white/[0.035] ring-1 ring-white/[0.05] p-4'
                                >
                                    <div className='mb-1.5 inline-flex items-center gap-2 text-[11px] font-medium text-white/70'>
                                        <PlanetIcon planet={planet} size={16} />
                                        <span>
                                            {planetNameOf(planet)}{" "}
                                            <span className='text-white/45'>
                                                {inLabel}
                                            </span>{" "}
                                            {houseNum}
                                            {suffix} {houseLabel}
                                        </span>
                                    </div>
                                    <p className='text-[13.5px] leading-relaxed text-white/80'>
                                        {meaning}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : null}
        </article>
    )
}

function PlanetChip({
    planet,
    label,
    accent,
}: {
    planet: string
    label: string
    accent?: boolean
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-[12px] font-medium ring-1",
                accent
                    ? "bg-amber-300/[0.10] text-amber-100 ring-amber-300/25"
                    : "bg-white/[0.06] text-white/90 ring-white/[0.08]",
            )}
        >
            <PlanetIcon planet={planet} size={18} />
            {label}
        </span>
    )
}

function PlanetIcon({
    planet,
    size = 16,
}: {
    planet: string
    size?: number
}) {
    const visual = PLANET_IMAGE[planet]
    if (!visual) {
        return (
            <span
                aria-hidden
                className='inline-block rounded-full bg-white/40'
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
            className='rounded-full object-cover'
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
    if (j === 1 && k !== 11) return "st"
    if (j === 2 && k !== 12) return "nd"
    if (j === 3 && k !== 13) return "rd"
    return "th"
}
