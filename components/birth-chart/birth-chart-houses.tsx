"use client"

import { Card } from "@/components/ui/card"
import { SANSKRIT_SIGNS, AstroPoint } from "@/lib/birth-chart-utils"
import { Home } from "lucide-react"

interface BirthChartHousesProps {
    houses?: Record<string, unknown> | null
    planets?: Record<string, unknown> | null
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

// Planet in House Interpretations
const PLANET_IN_HOUSE_MEANINGS: Record<string, Record<string, string>> = {
    "Sun": {
        "1": "Your identity and self-expression are central to your personality. You shine through your individuality and have strong leadership qualities. Your ego and vitality are expressed directly through your outer persona.",
        "2": "Your identity is tied to your resources and values. You find confidence through material security and may express yourself through possessions. Your self-worth is connected to what you own and accumulate.",
        "3": "Your identity is expressed through communication and learning. You shine through your words, ideas, and intellectual pursuits. Your ego is tied to your ability to express yourself and share knowledge.",
        "4": "Your identity is rooted in home and family. You find confidence through emotional security and your roots. Your ego is connected to your private life and the foundation you've built.",
        "5": "Your identity is expressed through creativity and self-expression. You shine through your talents, romance, and ability to have fun. Your ego is tied to your creative output and personal expression.",
        "6": "Your identity is expressed through service and daily work. You find confidence through helping others and maintaining health. Your ego is connected to your ability to be useful and improve things.",
        "7": "Your identity is expressed through partnerships and relationships. You shine through your ability to relate to others. Your ego is tied to how you appear in partnerships and your ability to balance.",
        "8": "Your identity involves transformation and shared resources. You find confidence through deep change and regeneration. Your ego is connected to your ability to transform and handle intensity.",
        "9": "Your identity is expressed through philosophy and higher learning. You shine through your beliefs, wisdom, and search for truth. Your ego is tied to your worldview and spiritual understanding.",
        "10": "Your identity is expressed through career and public image. You find confidence through achievement and recognition. Your ego is connected to your reputation and professional success.",
        "11": "Your identity is expressed through friendships and hopes. You shine through your social connections and humanitarian ideals. Your ego is tied to your ability to connect with groups and realize dreams.",
        "12": "Your identity involves the subconscious and hidden matters. You find confidence through spiritual connection and letting go of ego. Your ego is connected to your inner world and spiritual growth."
    },
    "Moon": {
        "1": "Your emotions are visible and part of your outer personality. You're emotionally expressive and others see your feelings. Your emotional needs are tied to how you present yourself.",
        "2": "Your emotions are tied to security and resources. You feel secure through material stability and may have emotional attachments to possessions. Your feelings are connected to your values.",
        "3": "Your emotions are expressed through communication and learning. You process feelings through talking and intellectual activity. Your emotional needs involve mental stimulation and variety.",
        "4": "Your emotions are deeply connected to home and family. This is your natural house. You feel most secure at home and have strong emotional ties to family and roots.",
        "5": "Your emotions are expressed through creativity and romance. You feel secure through self-expression and fun. Your emotional needs involve being creative and enjoying life.",
        "6": "Your emotions are tied to daily work and service. You feel secure through routine and helping others. Your emotional needs involve being useful and maintaining health.",
        "7": "Your emotions are expressed through partnerships. You feel secure through relationships and may be emotionally dependent on partners. Your feelings are tied to how others see you.",
        "8": "Your emotions involve transformation and intensity. You feel secure through deep emotional bonds and may have intense emotional experiences. Your feelings are connected to shared resources.",
        "9": "Your emotions are expressed through philosophy and expansion. You feel secure through learning and exploring beliefs. Your emotional needs involve seeking truth and meaning.",
        "10": "Your emotions are tied to career and public image. You feel secure through achievement and may be emotionally invested in your reputation. Your feelings are connected to your professional life.",
        "11": "Your emotions are expressed through friendships and hopes. You feel secure through social connections and may have emotional attachments to groups. Your feelings are tied to your dreams.",
        "12": "Your emotions involve the subconscious and hidden matters. You feel secure through spiritual connection and may have deep, hidden emotional patterns. Your feelings are connected to your inner world."
    },
    "Mercury": {
        "1": "Your thinking and communication are central to your identity. You express yourself through words and ideas. Your mind is quick and you're known for your communication style.",
        "2": "Your thinking is focused on resources and values. You communicate about money and possessions. Your mind is practical and you think about material security.",
        "3": "Your thinking is naturally versatile and communicative. This is your natural house. You excel at learning, writing, and sharing ideas. Your mind is curious and adaptable.",
        "4": "Your thinking is tied to home and family. You communicate about emotional matters and may think about your roots. Your mind is connected to your private life.",
        "5": "Your thinking is creative and expressive. You communicate through art, play, and self-expression. Your mind is imaginative and you think about fun and romance.",
        "6": "Your thinking is practical and service-oriented. You communicate about work and health. Your mind is analytical and you think about improvement and details.",
        "7": "Your thinking is focused on partnerships. You communicate through relationships and may think about balance. Your mind is diplomatic and you consider others' perspectives.",
        "8": "Your thinking involves transformation and depth. You communicate about intense topics and may think about mysteries. Your mind is penetrating and you seek hidden truths.",
        "9": "Your thinking is philosophical and expansive. You communicate about beliefs and higher learning. Your mind seeks truth and you think about meaning and purpose.",
        "10": "Your thinking is focused on career and reputation. You communicate about your profession and public image. Your mind is goal-oriented and you think about achievement.",
        "11": "Your thinking involves friendships and hopes. You communicate about groups and ideals. Your mind is innovative and you think about the future and humanitarian causes.",
        "12": "Your thinking involves the subconscious and hidden matters. You communicate intuitively and may think about spiritual matters. Your mind is creative and you process information unconsciously."
    },
    "Venus": {
        "1": "Your values and love nature are part of your outer personality. You're attractive and charming. Your approach to love and beauty is visible to others.",
        "2": "Your values are tied to resources and possessions. This is your natural house. You find beauty in material things and may earn through aesthetics. Your love nature is sensual and stable.",
        "3": "Your values are expressed through communication and learning. You find beauty in ideas and may love through words. Your love nature is playful and intellectual.",
        "4": "Your values are tied to home and family. You find beauty in your roots and may love through nurturing. Your love nature is emotional and protective.",
        "5": "Your values are expressed through creativity and romance. You find beauty in self-expression and love through fun. Your love nature is passionate and dramatic.",
        "6": "Your values are tied to service and daily work. You find beauty in helping others and may love through service. Your love nature is practical and helpful.",
        "7": "Your values are expressed through partnerships. This is also your natural house. You find beauty in relationships and love through partnership. Your love nature is balanced and harmonious.",
        "8": "Your values involve transformation and intensity. You find beauty in depth and may love intensely. Your love nature is passionate and transformative.",
        "9": "Your values are expressed through philosophy and expansion. You find beauty in beliefs and may love through learning. Your love nature is optimistic and adventurous.",
        "10": "Your values are tied to career and reputation. You find beauty in achievement and may love through your profession. Your love nature is ambitious and traditional.",
        "11": "Your values involve friendships and hopes. You find beauty in groups and may love through friendship. Your love nature is independent and humanitarian.",
        "12": "Your values involve the subconscious and spiritual matters. You find beauty in dreams and may love through compassion. Your love nature is idealistic and selfless."
    },
    "Mars": {
        "1": "Your energy and drive are central to your identity. You're assertive and action-oriented. Your approach to conflict and desire is direct and visible.",
        "2": "Your energy is focused on resources and values. You take action to build security and may be driven by material goals. Your assertiveness is tied to possessions.",
        "3": "Your energy is expressed through communication and learning. You take action through words and ideas. Your drive involves mental pursuits and variety.",
        "4": "Your energy is tied to home and family. You take action to protect your roots and may be driven by emotional security. Your assertiveness is connected to your private life.",
        "5": "Your energy is expressed through creativity and romance. You take action through self-expression and fun. Your drive involves passion and play.",
        "6": "Your energy is focused on service and daily work. You take action through helping others and maintaining health. Your drive involves improvement and routine.",
        "7": "Your energy is expressed through partnerships. You take action through relationships and may be driven by partnership goals. Your assertiveness is tied to how you relate.",
        "8": "Your energy involves transformation and intensity. This is also your natural house. You take action through deep change and may be driven by power. Your drive is intense and transformative.",
        "9": "Your energy is expressed through philosophy and expansion. You take action through beliefs and may be driven by truth-seeking. Your drive involves adventure and learning.",
        "10": "Your energy is focused on career and reputation. You take action through your profession and may be driven by achievement. Your assertiveness is tied to your public image.",
        "11": "Your energy involves friendships and hopes. You take action through groups and may be driven by ideals. Your drive involves innovation and humanitarian causes.",
        "12": "Your energy involves the subconscious and hidden matters. You take action through spiritual practice and may suppress direct action. Your drive is internal and may involve service."
    },
    "Jupiter": {
        "1": "Your growth and expansion are central to your identity. You're optimistic and philosophical. Your approach to life is expansive and you seek meaning through your personality.",
        "2": "Your growth is tied to resources and values. You expand through building security and may find luck through possessions. Your optimism is connected to material abundance.",
        "3": "Your growth is expressed through communication and learning. You expand through knowledge and may find luck through ideas. Your optimism involves mental pursuits.",
        "4": "Your growth is tied to home and family. You expand through emotional security and may find luck through your roots. Your optimism is connected to your foundation.",
        "5": "Your growth is expressed through creativity and romance. You expand through self-expression and may find luck through fun. Your optimism involves play and creativity.",
        "6": "Your growth is focused on service and daily work. You expand through helping others and may find luck through health. Your optimism involves improvement and routine.",
        "7": "Your growth is expressed through partnerships. You expand through relationships and may find luck through others. Your optimism is connected to balance and harmony.",
        "8": "Your growth involves transformation and shared resources. You expand through deep change and may find luck through transformation. Your optimism is connected to regeneration.",
        "9": "Your growth is expressed through philosophy and higher learning. This is your natural house. You expand through beliefs and find luck through seeking truth. Your optimism involves meaning and purpose.",
        "10": "Your growth is focused on career and reputation. You expand through achievement and may find luck through your profession. Your optimism is connected to your public image.",
        "11": "Your growth involves friendships and hopes. You expand through groups and may find luck through ideals. Your optimism involves humanitarian causes and innovation.",
        "12": "Your growth involves the subconscious and spiritual matters. This is also your natural house. You expand through spiritual connection and may find luck through compassion. Your optimism involves transcendence."
    },
    "Saturn": {
        "1": "Your challenges and discipline are central to your identity. You're serious and responsible. Your approach to life involves structure and you may feel restricted in self-expression.",
        "2": "Your challenges are tied to resources and values. You build security through discipline and may face restrictions with money. Your responsibility involves material stability.",
        "3": "Your challenges are expressed through communication and learning. You build knowledge through discipline and may face restrictions in expression. Your responsibility involves education.",
        "4": "Your challenges are tied to home and family. You build security through discipline and may face restrictions with roots. Your responsibility involves emotional foundations.",
        "5": "Your challenges are expressed through creativity and romance. You build self-expression through discipline and may face restrictions in play. Your responsibility involves creative work.",
        "6": "Your challenges are focused on service and daily work. You build health through discipline and may face restrictions in routine. Your responsibility involves service and improvement.",
        "7": "Your challenges are expressed through partnerships. You build relationships through discipline and may face restrictions in relating. Your responsibility involves commitment and balance.",
        "8": "Your challenges involve transformation and shared resources. You build change through discipline and may face restrictions with intensity. Your responsibility involves regeneration.",
        "9": "Your challenges are expressed through philosophy and higher learning. You build beliefs through discipline and may face restrictions in expansion. Your responsibility involves seeking truth.",
        "10": "Your challenges are focused on career and reputation. This is your natural house. You build achievement through discipline and may face restrictions professionally. Your responsibility involves your public image.",
        "11": "Your challenges involve friendships and hopes. You build groups through discipline and may face restrictions with ideals. Your responsibility involves innovation and humanitarian causes.",
        "12": "Your challenges involve the subconscious and hidden matters. You build spirituality through discipline and may face restrictions with illusions. Your responsibility involves inner work and letting go."
    },
    "Rahu": {
        "1": "Your desires involve being independent and taking initiative. You're drawn to leadership and may obsess over being first. Your ambitions are tied to your identity.",
        "2": "Your desires involve accumulating resources and material security. You're drawn to possessions and may obsess over money. Your ambitions are tied to values.",
        "3": "Your desires involve communication and learning. You're drawn to knowledge and may obsess over ideas. Your ambitions are tied to mental pursuits.",
        "4": "Your desires involve home and family security. You're drawn to roots and may obsess over emotional stability. Your ambitions are tied to your foundation.",
        "5": "Your desires involve creativity and recognition. You're drawn to self-expression and may obsess over being admired. Your ambitions are tied to play and romance.",
        "6": "Your desires involve service and perfection. You're drawn to helping others and may obsess over health. Your ambitions are tied to improvement.",
        "7": "Your desires involve partnerships and balance. You're drawn to relationships and may obsess over finding the perfect partner. Your ambitions are tied to harmony.",
        "8": "Your desires involve transformation and power. You're drawn to intensity and may obsess over control. Your ambitions are tied to deep change.",
        "9": "Your desires involve philosophy and expansion. You're drawn to truth-seeking and may obsess over beliefs. Your ambitions are tied to higher learning.",
        "10": "Your desires involve career and achievement. You're drawn to recognition and may obsess over status. Your ambitions are tied to your public image.",
        "11": "Your desires involve friendships and innovation. You're drawn to groups and may obsess over ideals. Your ambitions are tied to humanitarian causes.",
        "12": "Your desires involve spirituality and escape. You're drawn to transcendence and may obsess over illusions. Your ambitions are tied to letting go."
    },
    "Ketu": {
        "1": "You're releasing attachment to ego and identity. Your spiritual path involves learning humility and letting go of the need to be first. You seek detachment from self.",
        "2": "You're releasing attachment to possessions and material security. Your spiritual path involves learning to value non-material things. You seek detachment from resources.",
        "3": "You're releasing attachment to communication and mental activity. Your spiritual path involves learning silence and going beyond words. You seek detachment from ideas.",
        "4": "You're releasing attachment to home and family patterns. Your spiritual path involves learning independence and letting go of the past. You seek detachment from roots.",
        "5": "You're releasing attachment to creativity and recognition. Your spiritual path involves learning humility and letting go of the need for attention. You seek detachment from self-expression.",
        "6": "You're releasing attachment to service and perfection. Your spiritual path involves learning to accept imperfection. You seek detachment from improvement.",
        "7": "You're releasing attachment to partnerships and balance. Your spiritual path involves learning independence and letting go of the need for others. You seek detachment from relationships.",
        "8": "You're releasing attachment to power and control. Your spiritual path involves learning to let go and finding peace in surrender. You seek detachment from transformation.",
        "9": "You're releasing attachment to beliefs and expansion. Your spiritual path involves learning to be present and letting go of the need to seek more. You seek detachment from philosophy.",
        "10": "You're releasing attachment to career and achievement. Your spiritual path involves learning flexibility and letting go of the need for status. You seek detachment from reputation.",
        "11": "You're releasing attachment to friendships and innovation. Your spiritual path involves learning connection and letting go of the need to be different. You seek detachment from groups.",
        "12": "You're releasing attachment to illusions and escape. Your spiritual path involves learning to face reality and letting go of the need to transcend. You seek detachment from the subconscious."
    },
    "Ascendant": {
        "1": "Your outer personality is your identity. This is your natural house. How others see you is central to who you are. Your approach to life defines your essence.",
        "2": "Your outer personality is tied to resources and values. Others see you as stable and value-oriented. Your approach to life involves building security.",
        "3": "Your outer personality is communicative and versatile. Others see you as curious and adaptable. Your approach to life involves learning and sharing ideas.",
        "4": "Your outer personality is nurturing and protective. Others see you as emotional and family-oriented. Your approach to life involves creating security.",
        "5": "Your outer personality is creative and expressive. Others see you as playful and dramatic. Your approach to life involves self-expression and fun.",
        "6": "Your outer personality is practical and service-oriented. Others see you as helpful and detail-focused. Your approach to life involves improvement and service.",
        "7": "Your outer personality is diplomatic and relationship-focused. Others see you as balanced and cooperative. Your approach to life involves partnership and harmony.",
        "8": "Your outer personality is intense and mysterious. Others see you as transformative and deep. Your approach to life involves intensity and regeneration.",
        "9": "Your outer personality is optimistic and philosophical. Others see you as adventurous and truth-seeking. Your approach to life involves expansion and learning.",
        "10": "Your outer personality is serious and ambitious. Others see you as responsible and goal-oriented. Your approach to life involves achievement and structure.",
        "11": "Your outer personality is unique and independent. Others see you as innovative and humanitarian. Your approach to life involves freedom and ideals.",
        "12": "Your outer personality is dreamy and intuitive. Others see you as artistic and compassionate. Your approach to life involves spirituality and inner work."
    }
}

export default function BirthChartHouses({ houses, planets }: BirthChartHousesProps) {
    if (!houses) return null

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
                        Your Houses
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
                                            {houseNum}{suffix} House
                                        </span>
                                        <h3 className="font-bold text-white text-base leading-tight group-hover:text-accent transition-colors">
                                            {HOUSE_MEANINGS[houseNum]}
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
                                                    {planet}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <p className="text-xs text-muted-foreground leading-relaxed mt-3 mb-3">
                                    {HOUSE_DESCRIPTIONS[houseNum]} 
                                </p>

                                {/* Planet in House Meanings - Always Visible */}
                                {planetsInHouse.length > 0 && planetsInHouse.map((planet) => {
                                    const planetMeaning = PLANET_IN_HOUSE_MEANINGS[planet]?.[houseNum]
                                    if (!planetMeaning) return null
                                    return (
                                        <div key={planet} className="mt-3 mb-3 p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/40">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-400/90 mb-2">
                                                {planet} in {houseNum}{suffix} House
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
