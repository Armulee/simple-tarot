"use client"

import { Card } from "@/components/ui/card"
import { SANSKRIT_SIGNS, AstroPoint } from "@/lib/birth-chart-utils"
import { Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"

interface BirthChartPlanetsProps {
    planets?: Record<string, unknown> | null
}

export default function BirthChartPlanets({ planets }: BirthChartPlanetsProps) {
    const t = useTranslations("BirthChart")
    
    if (!planets) return null

    // Helper function to get planet in sign meaning
    const getPlanetInSignMeaning = (planet: string, sign: string): string => {
        try {
            return t(`planetInSign.${planet}.${sign}`)
        } catch {
            return ""
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/20 border border-accent/30">
                        <Sparkles className="w-6 h-6 text-accent" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-white">
                        {t("planetaryPositions")}
                    </h2>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {Object.entries(planets as Record<string, unknown>).map(
                    ([planet, position]: [string, unknown]) => {
                        let signName = ""
                        if (typeof position === "string") {
                            signName = position
                        } else if (typeof position === "object" && position !== null && "sign" in position) {
                            signName = (position as AstroPoint).sign
                        }

                        // Translate sanskrit if needed
                        const englishSign = SANSKRIT_SIGNS[signName] || 
                            (Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === signName.toLowerCase()) 
                                ? SANSKRIT_SIGNS[Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === signName.toLowerCase()) as string] 
                                : signName)
                        
                        const displaySign = englishSign || signName
                        const translatedSign = t(`zodiacSigns.${displaySign}`, { defaultValue: displaySign })
                        const planetInSignMeaning = getPlanetInSignMeaning(planet, displaySign)

                        return (
                            <Card
                                key={planet}
                                className="p-6 bg-gradient-to-br from-white/10 via-white/5 to-transparent border-white/20 backdrop-blur-xl hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/20 transition-all duration-500 group relative overflow-hidden"
                            >
                                {/* Animated background gradient on hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                
                                <div className="relative z-10 space-y-4">
                                    {/* Planet Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="px-3 py-1.5 rounded-md bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-sm">
                                                <span className="font-semibold">{t(`planets.${planet}`)}</span>
                                            </div>
                                            <span className="text-white/60 text-sm">{t("in")}</span>
                                            <span className="text-white font-semibold text-lg group-hover:text-accent transition-colors">
                                                {translatedSign}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Planet in Sign Meaning - Always Visible */}
                                    {planetInSignMeaning && (
                                        <div className="mt-4 p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/40">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-400/90 mb-2">
                                                {t(`planets.${planet}`)} {t("in")} {translatedSign}
                                            </p>
                                            <p className="text-sm text-white/90 leading-relaxed">
                                                {planetInSignMeaning}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )
                    }
                )}
            </div>
        </div>
    )
}
