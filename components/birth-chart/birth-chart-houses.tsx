"use client"

import { Card } from "@/components/ui/card"
import { SANSKRIT_SIGNS, AstroPoint } from "@/lib/birth-chart-utils"
import { Home } from "lucide-react"
import { useTranslations } from "next-intl"

interface BirthChartHousesProps {
    houses?: Record<string, unknown> | null
    planets?: Record<string, unknown> | null
}

export default function BirthChartHouses({ houses, planets }: BirthChartHousesProps) {
    const t = useTranslations("BirthChart")
    
    if (!houses) return null

    // Helper function to get house meaning
    const getHouseMeaning = (houseNum: string): string => {
        return t(`houseMeanings.${houseNum}`)
    }

    // Helper function to get house description
    const getHouseDescription = (houseNum: string): string => {
        return t(`houseDescriptions.${houseNum}`)
    }

    // Helper function to get planet in house meaning
    const getPlanetInHouseMeaning = (planet: string, houseNum: string): string => {
        try {
            return t(`planetInHouse.${planet}.${houseNum}`)
        } catch {
            return ""
        }
    }

    // Helper function to normalize sign name
    const normalizeSign = (sign: string): string => {
        const englishSign = SANSKRIT_SIGNS[sign] || 
            (Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === sign.toLowerCase()) 
                ? SANSKRIT_SIGNS[Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === sign.toLowerCase()) as string] 
                : sign)
        return englishSign || sign
    }

    // Find planets in a given sign
    const getPlanetsInSign = (sign: string): string[] => {
        if (!planets) return []
        const normalizedSign = normalizeSign(sign)
        const planetsInSign: string[] = []
        
        Object.entries(planets).forEach(([planetName, planetData]) => {
            let planetSign = ""
            if (typeof planetData === "string") {
                planetSign = planetData
            } else if (typeof planetData === "object" && planetData && "sign" in planetData) {
                planetSign = (planetData as AstroPoint).sign
            }
            
            const normalizedPlanetSign = normalizeSign(planetSign)
            if (normalizedPlanetSign.toLowerCase() === normalizedSign.toLowerCase()) {
                planetsInSign.push(planetName)
            }
        })
        
        return planetsInSign
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/20 border border-accent/30">
                        <Home className="w-6 h-6 text-accent" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-white">
                        {t("yourHouses")}
                    </h2>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                {Object.entries(houses).map(([houseNum, signData]) => {
                    // Normalize sign name
                    let signName = ""
                    if (typeof signData === "string") {
                        signName = signData
                    } else if (typeof signData === "object" && signData && "sign" in signData) {
                        signName = (signData as AstroPoint).sign
                    }

                    // Find planets in this house's sign
                    const planetsInHouse = getPlanetsInSign(signName)

                    const suffix = getOrdinalSuffix(Number(houseNum))
                    const houseIndex = Number(houseNum) - 1
                    const isEven = houseIndex % 2 === 0

                    return (
                        <Card
                            key={houseNum}
                            className={`p-5 bg-gradient-to-br ${isEven ? 'from-white/10 via-white/5 to-transparent' : 'from-accent/10 via-accent/5 to-transparent'} border-white/20 backdrop-blur-xl hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/20 hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden`}
                        >
                            {/* Animated background gradient on hover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-2 block">
                                            {houseNum}{suffix} {t("house")}
                                        </span>
                                        <h3 className="font-bold text-white text-base leading-tight group-hover:text-accent transition-colors">
                                            {getHouseMeaning(houseNum)}
                                        </h3>
                                    </div>
                                    {/* Planets in House Badges */}
                                    {planetsInHouse.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 ml-3 shrink-0 justify-end">
                                            {planetsInHouse.map((planet) => (
                                                <div 
                                                    key={planet}
                                                    className="px-2 py-1 rounded-md bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs"
                                                >
                                                    {t(`planets.${planet}`)}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <p className="text-xs text-muted-foreground leading-relaxed mt-3 mb-3">
                                    {getHouseDescription(houseNum)} 
                                </p>

                                {/* Planet in House Meanings - Always Visible */}
                                {planetsInHouse.length > 0 && planetsInHouse.map((planet) => {
                                    const planetMeaning = getPlanetInHouseMeaning(planet, houseNum)
                                    if (!planetMeaning) return null
                                    return (
                                        <div key={planet} className="mt-3 mb-3 p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/40">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-400/90 mb-2">
                                                {t(`planets.${planet}`)} {t("in")} {houseNum}{suffix} {t("house")}
                                            </p>
                                            <p className="text-xs text-white/90 leading-relaxed">
                                                {planetMeaning}
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}

function getOrdinalSuffix(i: number) {
    const j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return "st";
    }
    if (j == 2 && k != 12) {
        return "nd";
    }
    if (j == 3 && k != 13) {
        return "rd";
    }
    return "th";
}
