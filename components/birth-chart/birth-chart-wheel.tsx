"use client"

import { useMemo } from "react"
import { ZODIAC_SIGNS } from "@/lib/birth-chart-utils"

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
                ascSign = (h1 as any).sign
        } else if (planets && planets["Ascendant"]) {
            const asc = planets["Ascendant"]
            if (typeof asc === "string") ascSign = asc
            else if (typeof asc === "object" && asc && "sign" in asc)
                ascSign = (asc as any).sign
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
                    if ("sign" in val) sign = (val as any).sign
                    if ("degree" in val) degree = Number((val as any).degree)
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

    // Calculate rotation offset so Ascendant is at 180 degrees (Left/9 o'clock)
    // In SVG, 0 degrees is usually East (Right/3 o'clock).
    // We want House 1 (Ascendant) to start at 180 degrees and go counter-clockwise?
    // Actually, standard charts usually put Ascendant at 9 o'clock (180 deg SVG).
    // Houses go 1 (180->210), 2 (210->240), etc. (Counter-Clockwise)
    // Wait, strictly speaking, houses go counter-clockwise (1st house is below horizon usually? No, 1st house is just below Ascendant).
    // 1st House: 9 o'clock to 8 o'clock? Or 9 o'clock to 10 o'clock?
    // Standard: Ascendant is the Cusp of 1st House.
    // 1st House is traditionally below the horizon (counter-clockwise from Ascendant).
    // Wait, if Ascendant is East (rising), and charts are drawn South-Up or North-Up?
    // Western charts: Ascendant at Left (9 o'clock).
    // Houses go Counter-Clockwise 1 -> 12.
    // So House 1 is 9 o'clock to 8 o'clock? No, that's Clockwise.
    // Counter-clockwise: 9 o'clock (180 deg) -> 6 o'clock (270 deg)? No, that's 90 degrees delta.
    // 0 deg in SVG is Right. 90 is Down. 180 is Left. 270 is Up.
    // Counter-clockwise in SVG coordinates (Y down) is actually Clockwise visually?
    // SVG standard:
    // x = r * cos(a), y = r * sin(a).
    // a=0 (Right), a=90 (Down/Bottom), a=180 (Left), a=270 (Up/Top).
    // If we want Counter-Clockwise visually (Standard math):
    // 180 (Left) -> 210 -> 240... (This is "Down" in SVG if we treat Y as down)
    // Usually House 1 is 180 deg -> 210 deg (if using standard CCW math angle where Y is Up).
    // But SVG Y is Down.
    // Let's stick to visual clock positions.
    // Ascendant (House 1 Cusp) = 9 o'clock.
    // House 1 = 9 o'clock to 8 o'clock (CCW? No 9->8 is CW).
    // Houses go CCW. 9 -> 8 -> 7 is CW. 9 -> 10 -> 11 is CCW.
    // So House 1 is 9 o'clock to 8 o'clock is WRONG.
    // House 1 is 9 o'clock to ... wait.
    // The Zodiac wheel rotates CCW.
    // House 1 is "below" the horizon?
    // Let's assume Equal House system for visualization.
    // House 1: [Ascendant, Ascendant + 30].
    // If Ascendant is at 180 deg (Left).
    // House 1 is 180 deg to ... (CCW).
    // In standard Unit Circle (0 = Right, CCW): 180 -> 150 (House 12) or 180 -> 210 (House 1)?
    // The path of the sun is usually depicted such that planets rise at Ascendant and set at Descendant.
    // The houses are numbered 1 to 12 CCW.
    // House 1 starts at Ascendant.
    // So visually: Left (180) -> Down-Left?
    // In most charts, House 1 is the sector immediately "below" the Ascendant line.
    // So 9 o'clock to 8 o'clock (if strictly looking at a clock face). But that is Clockwise.
    // Ah, usually charts are drawn Counter-Clockwise.
    // 1st House = 180 deg to 150 deg (if 0 is Right). No.
    // Let's look at a reference.
    // Ascendant (East) is Left. Midheaven (South) is Top.
    // House 1 is East to North-East? No.
    // House 1 is typically just below the Ascendant.
    // House 10 is at Midheaven (Top).
    // So 1 -> 2 -> 3 (Bottom) -> 4 -> 5 -> 6 (Descendant) -> 7 -> 8 -> 9 -> 10 (MC) -> 11 -> 12.
    // This implies Counter-Clockwise numbering starting from specific points.
    // 1st House Cusp = Ascendant (Left).
    // 2nd House Cusp ...
    // So 1st House is the sector [Ascendant, 2nd Cusp].
    // Visually, it usually goes "Down" from Ascendant. (Counter-clockwise? No, that's Clockwise if 9->6).
    // Wait. 1 (Left) -> 4 (Bottom) -> 7 (Right) -> 10 (Top).
    // This is Counter-Clockwise: Left (180) -> Bottom (270) -> Right (0) -> Top (90).
    // Yes! In SVG (y down):
    // Left (180). Bottom (90). Right (0). Top (270).
    // Wait, SVG 90 is Bottom. 270 is Top.
    // So 180 -> 90 is Counter-Clockwise in SVG angles?
    // cos(180)=-1, sin(180)=0.
    // cos(90)=0, sin(90)=1 (Bottom).
    // So decreasing angle goes CW in SVG? Increasing angle goes CCW?
    // No, increasing angle goes CW in SVG because Y is inverted.
    // 0 -> 90 (Down) -> 180 (Left) -> 270 (Up). This is Clockwise visually.
    // To get Counter-Clockwise visual:
    // 180 (Left) -> 90 (Bottom, House 4) -> 0 (Right, House 7) -> 270 (Top, House 10).
    // This means decreasing angle in SVG space?
    // Or just map 180 -> 270 -> 0 -> 90 (which is CCW in standard math).
    // I'll use standard math coordinates (Y up) for calculation and flip Y for SVG rendering.

    // Ascendant Sign is at Cusp 1 (Left).
    // We need to rotate the Zodiac wheel so the Ascendant Sign's degree is at 180 deg (Left).
    // If Ascendant is Aries 0 deg. Aries starts at 180 deg.
    // If Ascendant is Taurus 0 deg. Taurus starts at 180 deg.
    // So the rotation of the Zodiac wheel depends on Ascendant.

    const ascendantSignIndex = ZODIAC_SIGNS.indexOf(
        ZODIAC_SIGNS.find(
            (s) => s.toLowerCase() === ascendantSign.toLowerCase()
        ) || "Aries"
    )

    // Each sign is 30 degrees.
    // We want the Ascendant Sign to START at 180 deg (Left) and go "Down" (Counter-Clockwise visual).
    // So Aries (Index 0) should be at 180 deg if Asc is Aries.
    // If Asc is Taurus (Index 1), Taurus starts at 180 deg.
    // So the start angle of Sign 0 (Aries) is:
    // 180 - (AscendantIndex * 30).
    // E.g. Asc=Aries(0) -> Aries starts at 180.
    // Asc=Taurus(1) -> Aries starts at 150. (So Taurus starts at 180).
    // Correct.

    // SVG Angle conversion:
    // 0 deg = Right.
    // We want to render sectors.
    // Helper to get coordinates.
    const getCoords = (deg: number, r: number) => {
        const rad = ((deg * Math.PI) / 180)
        // SVG: 0 is Right, 90 is Down.
        // We want Standard CCW: 0 Right, 90 Top.
        // So y = -sin(rad).
        return {
            x: 200 + r * Math.cos(rad),
            y: 200 + r * Math.sin(rad), // SVG Y is positive down, so sin(rad) makes it rotate Clockwise.
            // To make it rotate Counter-Clockwise (Standard): y = -sin(rad).
            // But we want visual CCW.
            // 0 (Right) -> 270 (Top) -> 180 (Left) -> 90 (Bottom).
            // This is -90 deg steps.
        }
    }
    
    // Let's simply use a rotation transform on the group to align Ascendant to Left.
    // Base Wheel: Aries at 0 (Right) -> Taurus at 30 (Down? CW).
    // Standard Astrology: Aries 0 -> Taurus 30 -> ... is CCW.
    // So we draw Signs CCW.
    // Aries: [0, 30]. (0 is Right, 30 is Top-Right? No 30 is Up/Left CCW).
    // In SVG, to draw CCW:
    // 0 -> -30 -> -60 ...
    
    // Let's define the angle for each sign index i:
    // Start: -i * 30
    // End: -(i+1) * 30
    // (Negative for CCW).
    
    // Then we rotate the whole thing so Ascendant is at 180 (Left).
    // If Ascendant is Aries (i=0). Aries is [0, -30].
    // We want Aries to be at [180, 150]? No, [180, 210]?
    // House 1 is usually [180, 150] (CCW towards bottom).
    // Wait. Left is 180. Bottom is 270 (-90).
    // So CCW goes 180 -> 270 -> 0 -> 90. No that's CW in degrees but CCW visually?
    // Left (180) -> Bottom (270) -> Right (0) -> Top (90).
    // That is +90 degrees each step.
    // So CCW visually corresponds to INCREASING degrees in SVG (since Y is down).
    // 0 (Right) -> 90 (Bottom) -> 180 (Left) -> 270 (Top).
    // Wait. 0->90 is Clockwise (Right to Bottom).
    // 0->-90 is Counter-Clockwise (Right to Top).
    
    // Let's stick to standard math: 0=Right, CCW. Y is Up.
    // Convert to SVG at the end (y' = -y).
    
    // Model:
    // Signs 0..11.
    // 0 (Aries): 0 to 30 deg.
    // 1 (Taurus): 30 to 60 deg.
    // ...
    // This is the Zodiac band.
    
    // Planet P at Sign S, Degree D.
    // Angle = S*30 + D.
    
    // Now we want to display this.
    // Ascendant A is at Angle_A.
    // We want Angle_A to be at Visual 180 deg (Left).
    // So we rotate the view by (180 - Angle_A).
    
    // Example: Asc = Aries 0 deg (Angle_A = 0).
    // We rotate by 180. Aries 0 maps to 180.
    // Aries 15 maps to 195 (Down-Left).
    // This goes "Down". Is House 1 Down-Left?
    // Yes, usually House 1 is 1st quadrant below Horizon-East.
    // So it works.
    
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
                        // Math: CCW from Right (0).
                        // In SVG Y-down, we need to invert Y.
                        // We'll calculate path commands manually.
                        // Segment from i*30 to (i+1)*30.
                        // We want Standard Math angle (CCW).
                        // But SVG angles are CW if we just use cos/sin normally?
                        // Actually, let's use transform rotate for each segment.
                        // Angle i*30.
                        // We want CCW arrangement.
                        // Sign i: Start i*30, End (i+1)*30.
                        // Since SVG Y is Down, positive angle is CW.
                        // We want CCW. So use negative angles.
                        // -i*30 to -(i+1)*30.
                        
                        // BUT, we computed `rotation = 180 - ascAngle` assuming positive is CCW?
                        // Let's stick to SVG coordinate system: Positive angle = Clockwise.
                        // We want House 1 (Asc) to be at 180 (Left).
                        // Houses go CCW (1, 2, 3...). This means visually UP?
                        // Wait. Left (180). Top (270/-90).
                        // House 1 is usually [180, 150]? No [180, 210]?
                        // House 1 is below horizon. So 180 -> 210?
                        // No, in standard chart drawing (South up), House 1 is Top-Left.
                        // In North up (standard map), House 1 is ...
                        // Let's stick to the visual:
                        // Ascendant is Left (9 o'clock).
                        // Signs increase Counter-Clockwise.
                        // Aries -> Taurus -> Gemini (CCW).
                        // So if Aries is at 180. Taurus is at 150 (Up-Left)?
                        // Or Taurus is at 210 (Down-Left)?
                        // The Sun moves CW through houses (diurnal).
                        // But Signs order is CCW.
                        // So yes, Signs go CCW.
                        // Aries (180) -> Taurus (150) -> Gemini (120) ...
                        // This means Decreasing Angle in SVG (since SVG 0 is Right, 90 Down, 180 Left, 270 Top).
                        // 180 (Left) -> 90 (Bottom) -> 0 (Right) -> 270 (Top).
                        // This is Clockwise in SVG.
                        // Wait. Aries -> Taurus is CCW visually.
                        // Clock: 9 -> 8 -> 7.
                        // SVG Angle: 180 -> 270 (Top)? No 270 is Top.
                        // 9 o'clock is 180.
                        // 8 o'clock is approx 210? No.
                        // 12 o'clock is 270.
                        // 3 o'clock is 0.
                        // 6 o'clock is 90.
                        // CCW Visual: 9 (180) -> 6 (90) -> 3 (0) -> 12 (270).
                        // 180 -> 90 -> 0 -> 270.
                        // This corresponds to SUBTRACTING 90 each quadrant?
                        // Yes. Decreasing angle.
                        // So we want:
                        // Sign Angle = - (SignIndex * 30).
                        // If Asc = Aries (0).
                        // Aries at 180.
                        // Taurus (1) at 150.
                        // Gemini (2) at 120.
                        // So visual Angle = 180 - (SignIndex * 30).
                        // But we want to rotate the whole wheel based on Asc.
                        // Wheel Base: Aries at 0. Taurus at -30.
                        // If Asc = Aries. We want Aries at 180. So rotate +180.
                        // Angle = 0 + 180 = 180.
                        // If Asc = Taurus. We want Taurus at 180.
                        // Taurus Base = -30.
                        // So rotate +210?
                        // rotation = 180 - baseAngle?
                        // rotation = 180 - (-SignIndex * 30) = 180 + SignIndex * 30.
                        
                        const startAngle = -i * 30
                        const endAngle = -(i + 1) * 30
                        const midAngle = -(i + 0.5) * 30
                        
                        // Convert to radians
                        const r1 = 180
                        const r2 = 140
                        
                        // For SVG path A rx ry x-axis-rotation large-arc-flag sweep-flag x y
                        // We need coordinates.
                        // We can just use transform rotate on a group for each wedge.
                        
                        return (
                            <g key={sign} transform={`rotate(${startAngle} 200 200)`}>
                                {/* Wedge */}
                                <path 
                                    d={`M 200 200 L ${200 + r1} 200 A ${r1} ${r1} 0 0 0 ${200 + r1 * Math.cos(-30 * Math.PI/180)} ${200 + r1 * Math.sin(-30 * Math.PI/180)} L 200 200`} 
                                    fill="transparent" 
                                    stroke="none"
                                />
                                {/* Actually easier to calculate path properly or use stroke-dasharray on a circle */}
                                {/* Let's use simple line segments and text */}
                            </g>
                        )
                    })}
                    
                    {/* Let's render the wheel statically first, then rotate the group `g` */}
                    {/* Base Wheel: 0 is Aries, -30 is Taurus, etc. (CCW) */}
                    
                    <g className="opacity-90">
                        {ZODIAC_SIGNS.map((sign, i) => {
                             const angle = -i * 30
                             const rad = (angle * Math.PI) / 180
                             const nextRad = ((angle - 30) * Math.PI) / 180
                             
                             // Outer Ring Segment
                             // We want to draw arc from angle to angle-30
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
                                    {/* We need to rotate text so it's upright-ish or radial? Radial is easier to read on wheel usually. */}
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
                         // Planet Angle
                         // If sign is Aries (0), angle is -0 to -30.
                         // Degree 0 (start of sign) is angle. Degree 30 is angle - 30.
                         // So PlanetAngle = - (SignIndex * 30) - Degree.
                         const signIdx = ZODIAC_SIGNS.indexOf(p.sign)
                         const pAngle = -(signIdx * 30 + p.degree)
                         const pRad = (pAngle * Math.PI) / 180
                         
                         // Vary radius slightly if multiple planets close together?
                         // For now fixed radius
                         const rPlanet = 120
                         
                         // Stack planets in same sign? 
                         // Simple collision avoidance: group by sign, then offset radius or angle.
                         // Let's just place them.
                         
                         const px = 200 + rPlanet * Math.cos(pRad)
                         const py = 200 + rPlanet * Math.sin(pRad)
                         
                         // Line to center
                         // <line x1="200" y1="200" x2={px} y2={py} stroke="rgba(255,255,255,0.1)" />
                         
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
                {/* 
                    If we assume Equal Houses from Ascendant:
                    House 1 starts at 180 deg (Left).
                    House lines are at 180, 150, 120... (Visual CCW)
                    Wait, if the WHEEL rotates, and Houses are FIXED relative to Ascendant (which is fixed at Left).
                    Then Houses are static lines at 180, 210, 240... (Standard)
                    In SVG (CW positive):
                    Asc at 180 (Left).
                    House 1 boundary (Asc) = 180.
                    House 2 boundary = 150? No, 210?
                    CCW means Decreasing Angle in SVG.
                    House 1 is [180, 150]? Or [180, 210]?
                    Usually House 1 is below horizon.
                    180 is Left.
                    Horizon is usually 180-0 line.
                    So below is 180 -> 90.
                    So House 1 is 180 -> 150.
                    House 2 is 150 -> 120.
                    ...
                    House 4 (IC) is 90 (Bottom).
                    House 7 (Desc) is 0 (Right).
                    House 10 (MC) is 270 (Top).
                    This matches standard layout (East Left, South Top/Bottom depending on hemisphere/convention).
                    Wait, MC is usually South (Top in NH chart).
                    If MC is Top (270), then 10th house is [270, 240]?
                    10 -> 11 -> 12 -> 1.
                    So Houses are [270, 240], [240, 210], [210, 180]?
                    Then House 1 is [180, 150].
                    Yes. This is consistent.
                */}
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
                        // House i+1.
                        // Center angle.
                        // House 1: 180 to 150. Center 165.
                        // House 2: 150 to 120. Center 135.
                        // Formula: 165 - i*30.
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
