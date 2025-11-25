"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SANSKRIT_SIGNS, AstroPoint, ZODIAC_SIGNS } from "@/lib/birth-chart-utils"
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
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Home className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-serif font-semibold text-white">
                    Your Houses
                </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

                    return (
                        <Card
                            key={houseNum}
                            className="p-4 bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1 block">
                                        {houseNum}{suffix} House
                                    </span>
                                    <h3 className="font-bold text-white text-sm">
                                        {HOUSE_MEANINGS[houseNum]}
                                    </h3>
                                </div>
                                <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20">
                                    {displaySign}
                                </Badge>
                            </div>
                            
                            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                                {HOUSE_DESCRIPTIONS[houseNum]} 
                                <span className="block mt-1.5 text-white/80 italic">
                                    &ldquo;{displaySign} is in the {houseNum}{suffix} House.&rdquo;
                                </span>
                            </p>
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
