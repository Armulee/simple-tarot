"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { SANSKRIT_SIGNS, AstroPoint } from "@/lib/birth-chart-utils"
import { 
    Sun, Moon, Zap, Heart, Flame, ArrowUpRight, Shield, Target, History, User,
    Home, Coins, MessageSquare, Star, Activity, Users, Infinity, Compass, Briefcase, Trophy, CloudMoon,
    Sparkles, MapPin, Clock, Calendar as CalendarIcon
} from "lucide-react"
import { useTranslations } from "next-intl"

const PLANET_ICONS: Record<string, any> = {
    "Ascendant": User,
    "Sun": Sun,
    "Moon": Moon,
    "Mercury": Zap,
    "Venus": Heart,
    "Mars": Flame,
    "Jupiter": ArrowUpRight,
    "Saturn": Shield,
    "Rahu": Target,
    "Ketu": History,
}

const HOUSE_ICONS: Record<string, any> = {
    "1": User,
    "2": Coins,
    "3": MessageSquare,
    "4": Home,
    "5": Star,
    "6": Activity,
    "7": Users,
    "8": Infinity,
    "9": Compass,
    "10": Briefcase,
    "11": Trophy,
    "12": CloudMoon,
}

function formatDate(d: {
    day: number
    month: number
    year: number
    hour: number
    minute: number
}) {
    const date = new Date(d.year, d.month - 1, d.day)
    const dateStr = date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    })
    const h = d.hour
    const ampm = h >= 12 ? "PM" : "AM"
    const displayHour = h % 12 || 12
    const timeStr = `${displayHour}:${String(d.minute).padStart(2, "0")} ${ampm}`
    return { dateStr, timeStr }
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

export default function InfoTab({
    title,
    date,
    location,
    houses,
    planets,
}: {
    title: string
    date: { day: number; month: number; year: number; hour: number; minute: number }
    location: {
        country: string
        state: string
        lat: number
        lng: number
        timezone: number
    }
    houses?: Record<string, unknown> | null
    planets?: Record<string, unknown> | null
}) {
    const t = useTranslations("BirthChart")
    const { dateStr, timeStr } = formatDate(date)
    const locationLabel = [location.state, location.country]
        .filter(Boolean)
        .join(", ")

    const normalizeSign = (sign: string): string => {
        const englishSign =
            SANSKRIT_SIGNS[sign] ||
            (Object.keys(SANSKRIT_SIGNS).find(
                (k) => k.toLowerCase() === sign.toLowerCase()
            )
                ? SANSKRIT_SIGNS[
                      Object.keys(SANSKRIT_SIGNS).find(
                          (k) => k.toLowerCase() === sign.toLowerCase()
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
        <div className='space-y-12 pb-12'>
            {/* Context Summary Header */}
            <div className='relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10 p-8'>
                <div className='absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl' />
                
                <div className='relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8'>
                    <div className='space-y-2'>
                        <h2 className='text-3xl font-serif font-bold text-white tracking-tight'>
                            {title}
                        </h2>
                        <p className='text-white/50 text-sm font-medium uppercase tracking-[0.2em]'>
                            Cosmic Snapshot
                        </p>
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-3 gap-6'>
                        <div className='flex items-center gap-3'>
                            <div className='p-2 rounded-full bg-white/5 border border-white/10 text-accent'>
                                <CalendarIcon className='w-4 h-4' />
                            </div>
                            <div>
                                <p className='text-white/40 text-[10px] uppercase tracking-wider'>Date</p>
                                <p className='text-white text-sm font-semibold'>{dateStr}</p>
                            </div>
                        </div>
                        <div className='flex items-center gap-3'>
                            <div className='p-2 rounded-full bg-white/5 border border-white/10 text-accent'>
                                <Clock className='w-4 h-4' />
                            </div>
                            <div>
                                <p className='text-white/40 text-[10px] uppercase tracking-wider'>Time</p>
                                <p className='text-white text-sm font-semibold'>{timeStr}</p>
                            </div>
                        </div>
                        <div className='flex items-center gap-3'>
                            <div className='p-2 rounded-full bg-white/5 border border-white/10 text-accent'>
                                <MapPin className='w-4 h-4' />
                            </div>
                            <div>
                                <p className='text-white/40 text-[10px] uppercase tracking-wider'>Location</p>
                                <p className='text-white text-sm font-semibold truncate max-w-[150px]'>{locationLabel || "Unknown"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Planets Grid */}
            {planets && (
                <div className='space-y-8'>
                    <div className='flex items-center gap-4'>
                        <div className='p-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent shadow-lg shadow-accent/10'>
                            <Sparkles className='w-5 h-5' />
                        </div>
                        <div>
                            <h3 className='text-xl font-serif font-bold text-white'>Key Placements</h3>
                            <p className='text-white/40 text-xs uppercase tracking-widest mt-0.5'>Celestial Influence</p>
                        </div>
                        <div className='h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4' />
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
                        {Object.entries(planets)
                            .sort(([a], [b]) => {
                                const order = [
                                    "ascendant",
                                    "sun",
                                    "moon",
                                    "mercury",
                                    "venus",
                                    "mars",
                                    "jupiter",
                                    "saturn",
                                    "rahu",
                                    "ketu",
                                ]
                                return (
                                    order.indexOf(a.toLowerCase()) -
                                    order.indexOf(b.toLowerCase())
                                )
                            })
                            .map(([planet, position]) => {
                            let signName = ""
                            let deg = 0
                            if (typeof position === "string") {
                                signName = position
                            } else if (typeof position === "object" && position !== null) {
                                signName = (position as AstroPoint).sign || ""
                                deg = Number((position as AstroPoint).degree) || 0
                            }

                            const displaySign = normalizeSign(signName)
                            const planetIcon = PLANET_ICONS[planet] || Star
                            const translatedPlanet = t(`planets.${planet}`, { defaultValue: planet })
                            const translatedSign = t(`zodiacSigns.${displaySign}`, { defaultValue: displaySign })
                            
                            const isExalted = (position as AstroPoint).isExalted
                            const isDebilitated = (position as AstroPoint).isDebilitated
                            const isOwnSign = (position as AstroPoint).isOwnSign

                            // Interpretation from translations
                            let meaning = ""
                            try { meaning = t(`planetInSign.${planet}.${displaySign}`) } catch { meaning = "" }

                            return (
                                <Card key={planet} className='group overflow-hidden border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-accent/30 transition-all duration-500'>
                                    <div className='p-5 space-y-4'>
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center gap-3'>
                                                <div className='p-2 rounded-lg bg-accent/10 border border-accent/20 text-accent group-hover:scale-110 transition-transform duration-500'>
                                                    {React.createElement(planetIcon, { className: "w-5 h-5" })}
                                                </div>
                                                <div>
                                                    <div className='flex items-center gap-2'>
                                                        <h4 className='text-white font-bold text-sm tracking-tight'>
                                                            {translatedPlanet}
                                                        </h4>
                                                        {isExalted && (
                                                            <span className='px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 uppercase'>Exalted</span>
                                                        )}
                                                        {isDebilitated && (
                                                            <span className='px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 uppercase'>Debilitated</span>
                                                        )}
                                                        {isOwnSign && (
                                                            <span className='px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase'>Own Sign</span>
                                                        )}
                                                    </div>
                                                    <p className='text-accent text-[10px] font-bold uppercase tracking-widest opacity-80'>
                                                        {translatedSign} {deg > 0 ? `· ${deg.toFixed(1)}°` : ""}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {meaning && (
                                            <p className='text-xs text-white/70 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-500 italic border-l-2 border-accent/20 pl-3'>
                                                {meaning}
                                            </p>
                                        )}
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Houses Grid */}
            {houses && (
                <div className='space-y-8'>
                    <div className='flex items-center gap-4'>
                        <div className='p-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent shadow-lg shadow-accent/10'>
                            <Home className='w-5 h-5' />
                        </div>
                        <div>
                            <h3 className='text-xl font-serif font-bold text-white'>Life Areas</h3>
                            <p className='text-white/40 text-xs uppercase tracking-widest mt-0.5'>Houses of Destiny</p>
                        </div>
                        <div className='h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4' />
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
                        {Object.entries(houses)
                            .sort(([a], [b]) => {
                                const numA = parseInt(a.replace(/\D/g, ""))
                                const numB = parseInt(b.replace(/\D/g, ""))
                                return numA - numB
                            })
                            .map(([houseKey, signData]) => {
                                const houseNum = houseKey.replace(/\D/g, "")
                                let signName = ""
                                if (typeof signData === "string") {
                                    signName = signData
                                } else if (typeof signData === "object" && signData !== null) {
                                    signName = (signData as AstroPoint).sign || ""
                                }

                                const displaySign = normalizeSign(signName)
                                const planetsInHouse = getPlanetsInSign(signName)
                                const houseIcon = HOUSE_ICONS[houseNum] || Home
                                const suffix = getOrdinalSuffix(Number(houseNum))
                                
                                const houseMeaning = t(`houseMeanings.${houseNum}`, { defaultValue: "" })
                                const houseDesc = t(`houseDescriptions.${houseNum}`, { defaultValue: "" })

                                return (
                                    <Card key={houseKey} className='group overflow-hidden border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-accent/30 transition-all duration-500'>
                                        <div className='p-5 space-y-4'>
                                            <div className='flex items-start justify-between'>
                                                <div className='flex items-center gap-3'>
                                                    <div className='p-2 rounded-lg bg-accent/10 border border-accent/20 text-accent group-hover:bg-accent group-hover:text-white transition-colors duration-500'>
                                                        {React.createElement(houseIcon, { className: "w-5 h-5" })}
                                                    </div>
                                                    <div>
                                                        <h4 className='text-white font-bold text-sm tracking-tight'>
                                                            {houseNum}{suffix} House
                                                        </h4>
                                                        <p className='text-white/40 text-[10px] uppercase tracking-wider'>
                                                            {displaySign}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {planetsInHouse.length > 0 && (
                                                    <div className='flex -space-x-2'>
                                                        {planetsInHouse.map((planet) => {
                                                            const pIcon = PLANET_ICONS[planet] || Star
                                                            return (
                                                                <div key={planet} className='w-7 h-7 rounded-full bg-[#0A0F26] border border-white/10 flex items-center justify-center text-accent shadow-lg' title={t(`planets.${planet}`)}>
                                                                    {React.createElement(pIcon, { className: "w-3.5 h-3.5" })}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            <div className='space-y-2'>
                                                {houseMeaning && (
                                                    <p className='text-sm text-white font-semibold leading-tight group-hover:text-accent transition-colors'>
                                                        {houseMeaning}
                                                    </p>
                                                )}
                                                {houseDesc && (
                                                    <p className='text-[11px] text-white/50 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all'>
                                                        {houseDesc}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                )
                            })}
                    </div>
                </div>
            )}
        </div>
    )
}



