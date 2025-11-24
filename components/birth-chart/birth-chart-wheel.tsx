"use client"

import { useMemo } from "react"
import { ZODIAC_SIGNS, AstroPoint } from "@/lib/birth-chart-utils"

interface BirthChartWheelProps {
    houses?: Record<string, unknown> | null
    planets?: Record<string, unknown> | null
}

const ZODIAC_SYMBOLS: Record<string, string> = {
    Aries: "♈",
    Taurus: "♉",
    Gemini: "♊",
    Cancer: "♋",
    Leo: "♌",
    Virgo: "♍",
    Libra: "♎",
    Scorpio: "♏",
    Sagittarius: "♐",
    Capricorn: "♑",
    Aquarius: "♒",
    Pisces: "♓",
}

const PLANET_SYMBOLS: Record<string, string> = {
    Sun: "☉",
    Moon: "☽",
    Mercury: "☿",
    Venus: "♀",
    Mars: "♂",
    Jupiter: "♃",
    Saturn: "♄",
    Uranus: "♅",
    Neptune: "♆",
    Pluto: "♇",
    Ascendant: "ASC",
    Node: "☊", // North Node
    Chiron: "⚷",
    Lilith: "⚸",
}

export default function BirthChartWheel({
    houses,
    planets,
}: BirthChartWheelProps) {
    const { ascendantSign, planetPositions } = useMemo(() => {
        let ascSign = "Aries" // Default

        // Try to find Ascendant from houses or planets
        if (houses && (houses["1"] || houses["House 1"])) {
            const h1 = houses["1"] || houses["House 1"]
            if (typeof h1 === "string") ascSign = h1
            else if (typeof h1 === "object" && h1 && "sign" in h1)
                ascSign = (h1 as AstroPoint).sign
        } else if (planets && planets["Ascendant"]) {
            const asc = planets["Ascendant"]
            if (typeof asc === "string") ascSign = asc
            else if (typeof asc === "object" && asc && "sign" in asc)
                ascSign = (asc as AstroPoint).sign
        }

        // Parse planets
        const positions: Array<{
            name: string
            sign: string
            symbol: string
            degree: number
        }> = []

        if (planets) {
            Object.entries(planets).forEach(([key, val]) => {
                let sign = ""
                let degree = 15 // Default to middle of sign

                if (typeof val === "string") {
                    sign = val
                } else if (typeof val === "object" && val) {
                    if ("sign" in val) sign = (val as AstroPoint).sign
                    if ("degree" in val) degree = Number((val as AstroPoint).degree)
                }

                // Normalize sign
                const normSign = ZODIAC_SIGNS.find(
                    (s) => s.toLowerCase() === sign.toLowerCase()
                )

                if (normSign) {
                    positions.push({
                        name: key,
                        sign: normSign,
                        symbol:
                            PLANET_SYMBOLS[
                                Object.keys(PLANET_SYMBOLS).find(
                                    (k) =>
                                        k.toLowerCase() === key.toLowerCase()
                                ) || ""
                            ] || key.substring(0, 2),
                        degree,
                    })
                }
            })
        }

        return { ascendantSign: ascSign, planetPositions: positions }
    }, [houses, planets])

    const ascendantSignObj = ZODIAC_SIGNS.find(s => s.toLowerCase() === ascendantSign.toLowerCase())
    const ascIndex = ZODIAC_SIGNS.indexOf(ascendantSignObj || "Aries")
    const ascAngle = ascIndex * 30 // Assuming 0 degree in sign for simplicity
    
    const rotation = 180 - ascAngle

    return (
        <div className="w-full aspect-square max-w-md mx-auto relative select-none">
            <svg viewBox="0 0 400 400" className="w-full h-full">
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                
                {/* Background */}
                <circle cx="200" cy="200" r="198" fill="#0A0F26" stroke="#ffffff10" strokeWidth="1" />
                
                {/* Rotatable Group */}
                <g transform={`rotate(${-rotation} 200 200)`} style={{ transition: 'transform 1s ease-out' }}>
                    
                    {/* Zodiac Ring */}
                    {ZODIAC_SIGNS.map((sign, i) => {
                        const startAngle = -i * 30
                        
                        // We use the angles for rotation
                        return (
                            <g key={sign} transform={`rotate(${startAngle} 200 200)`}>
                                {/* Wedge area is mainly visual via the ring below */}
                            </g>
                        )
                    })}
                    
                    {/* Base Wheel: 0 is Aries, -30 is Taurus, etc. (CCW) */}
                    <g className="opacity-90">
                        {ZODIAC_SIGNS.map((sign, i) => {
                             const angle = -i * 30
                             const rad = (angle * Math.PI) / 180
                             const nextRad = ((angle - 30) * Math.PI) / 180
                             
                             // Outer Ring Segment
                             const rOuter = 190
                             const rInner = 150
                             
                             const x1 = 200 + rOuter * Math.cos(rad)
                             const y1 = 200 + rOuter * Math.sin(rad)
                             const x2 = 200 + rOuter * Math.cos(nextRad)
                             const y2 = 200 + rOuter * Math.sin(nextRad)
                             
                             const x3 = 200 + rInner * Math.cos(nextRad)
                             const y3 = 200 + rInner * Math.sin(nextRad)
                             const x4 = 200 + rInner * Math.cos(rad)
                             const y4 = 200 + rInner * Math.sin(rad)
                             
                             const midRad = ((angle - 15) * Math.PI) / 180
                             const textR = (rOuter + rInner) / 2
                             const tx = 200 + textR * Math.cos(midRad)
                             const ty = 200 + textR * Math.sin(midRad)
                             
                             return (
                                 <g key={sign}>
                                    <path 
                                        d={`M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 0 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 0 1 ${x4} ${y4} Z`}
                                        fill={i % 2 === 0 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)"}
                                        stroke="rgba(255,255,255,0.2)"
                                        strokeWidth="1"
                                    />
                                    {/* Sign Symbol */}
                                    <text 
                                        x={tx} 
                                        y={ty} 
                                        fill="white" 
                                        fontSize="18" 
                                        fontWeight="bold"
                                        textAnchor="middle" 
                                        dominantBaseline="middle"
                                        transform={`rotate(${angle - 15} ${tx} ${ty})`}
                                    >
                                        {ZODIAC_SYMBOLS[sign]}
                                    </text>
                                 </g>
                             )
                        })}
                    </g>
                    
                    {/* Planets */}
                    {planetPositions.map((p, i) => {
                         const signIdx = ZODIAC_SIGNS.indexOf(p.sign)
                         const pAngle = -(signIdx * 30 + p.degree)
                         const pRad = (pAngle * Math.PI) / 180
                         
                         const rPlanet = 120
                         
                         const px = 200 + rPlanet * Math.cos(pRad)
                         const py = 200 + rPlanet * Math.sin(pRad)
                         
                         return (
                             <g key={`${p.name}-${i}`}>
                                 <line x1="200" y1="200" x2={px} y2={py} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                                 <circle cx={px} cy={py} r="10" fill="#0A0F26" stroke="white" strokeWidth="1" />
                                 <text 
                                     x={px} 
                                     y={py} 
                                     fill="#FFD700" 
                                     fontSize="12" 
                                     textAnchor="middle" 
                                     dominantBaseline="middle"
                                     className="font-serif"
                                 >
                                     {p.symbol}
                                 </text>
                             </g>
                         )
                    })}
                </g>
                
                {/* Fixed Elements (Houses Lines) */}
                <g className="pointer-events-none">
                    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => {
                         const rad = (angle * Math.PI) / 180
                         const x2 = 200 + 140 * Math.cos(rad)
                         const y2 = 200 + 140 * Math.sin(rad)
                         return (
                             <line 
                                key={i}
                                x1="200" 
                                y1="200" 
                                x2={x2} 
                                y2={y2} 
                                stroke="rgba(255,255,255,0.2)" 
                                strokeDasharray="4 4"
                             />
                         )
                    })}
                    {/* House Numbers */}
                    {[...Array(12)].map((_, i) => {
                        const angle = 165 - i * 30
                        const rad = (angle * Math.PI) / 180
                        const r = 50
                        const x = 200 + r * Math.cos(rad)
                        const y = 200 + r * Math.sin(rad)
                        return (
                            <text
                                key={i}
                                x={x}
                                y={y}
                                fill="rgba(255,255,255,0.3)"
                                fontSize="10"
                                textAnchor="middle"
                                dominantBaseline="middle"
                            >
                                {i + 1}
                            </text>
                        )
                    })}
                    
                    {/* Markers for ASC/MC */}
                    <text x="10" y="200" fill="white" fontSize="12" fontWeight="bold" dominantBaseline="middle">ASC</text>
                    <text x="390" y="200" fill="white" fontSize="12" fontWeight="bold" textAnchor="end" dominantBaseline="middle">DSC</text>
                    <text x="200" y="15" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle">MC</text>
                    <text x="200" y="390" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle">IC</text>
                </g>
                
            </svg>
        </div>
    )
}
