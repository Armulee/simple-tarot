"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SANSKRIT_SIGNS, AstroPoint } from "@/lib/birth-chart-utils"
import { Home } from "lucide-react"

interface BirthChartHousesProps {
    houses?: Record<string, unknown> | null
}

const HOUSE_MEANINGS: Record<string, string> = {
    "1": "Self & Identity",
    "2": "Money & Possessions",
    "3": "Communication & Siblings",
    "4": "Home & Family",
    "5": "Creativity & Romance",
    "6": "Health & Routine",
    "7": "Partnerships & Marriage",
    "8": "Transformation & Mystery",
    "9": "Philosophy & Travel",
    "10": "Career & Reputation",
    "11": "Friends & Gains",
    "12": "Subconscious & Solitude"
}

const HOUSE_DESCRIPTIONS: Record<string, string> = {
    "1": "This house represents your outer personality, physical appearance, and how you approach life.",
    "2": "This house governs your personal finances, material possessions, and sense of self-worth.",
    "3": "This house rules communication, intellect, early education, siblings, and short trips.",
    "4": "This house signifies your home, roots, family, mother, and emotional foundation.",
    "5": "This house covers self-expression, creativity, romance, children, and fun.",
    "6": "This house relates to daily work, health, service, and self-improvement.",
    "7": "This house focuses on serious partnerships, marriage, business contracts, and open enemies.",
    "8": "This house deals with transformation, death, rebirth, shared resources, and the occult.",
    "9": "This house governs higher learning, philosophy, religion, long-distance travel, and law.",
    "10": "This house represents your career, public image, reputation, father, and authority figures.",
    "11": "This house rules friendships, social groups, hopes, wishes, and humanitarian interests.",
    "12": "This house covers the subconscious, secrets, hidden enemies, institutions, and karma."
}

export default function BirthChartHouses({ houses }: BirthChartHousesProps) {
    if (!houses) return null

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                        <Home className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-white">
                        Your Houses
                    </h2>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Object.entries(houses).map(([houseNum, signData]) => {
                    // Normalize sign name
                    let signName = ""
                    if (typeof signData === "string") {
                        signName = signData
                    } else if (typeof signData === "object" && signData && "sign" in signData) {
                        signName = (signData as AstroPoint).sign
                    }

                    // Translate sanskrit if needed
                    const englishSign = SANSKRIT_SIGNS[signName] || 
                        (Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === signName.toLowerCase()) 
                            ? SANSKRIT_SIGNS[Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === signName.toLowerCase()) as string] 
                            : signName)
                    
                    const displaySign = englishSign || signName

                    const suffix = getOrdinalSuffix(Number(houseNum))
                    const houseIndex = Number(houseNum) - 1
                    const isEven = houseIndex % 2 === 0

                    return (
                        <Card
                            key={houseNum}
                            className={`p-5 bg-gradient-to-br ${isEven ? 'from-white/10 via-white/5 to-transparent' : 'from-primary/10 via-primary/5 to-transparent'} border-white/20 backdrop-blur-xl hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden`}
                        >
                            {/* Animated background gradient on hover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-2 block">
                                            {houseNum}{suffix} House
                                        </span>
                                        <h3 className="font-bold text-white text-base leading-tight group-hover:text-primary transition-colors">
                                            {HOUSE_MEANINGS[houseNum]}
                                        </h3>
                                    </div>
                                    <Badge variant="outline" className="bg-primary/20 border-primary/40 text-primary hover:bg-primary/30 ml-3 shrink-0">
                                        {displaySign}
                                    </Badge>
                                </div>
                                
                                <p className="text-xs text-muted-foreground leading-relaxed mt-3 mb-2">
                                    {HOUSE_DESCRIPTIONS[houseNum]} 
                                </p>
                                <p className="text-xs text-white/70 italic leading-relaxed border-l-2 border-primary/30 pl-3 mt-3">
                                    &ldquo;{displaySign} is in the {houseNum}{suffix} House.&rdquo;
                                </p>
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
