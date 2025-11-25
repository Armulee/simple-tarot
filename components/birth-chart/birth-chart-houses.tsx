"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

// Sign in House Interpretations
const SIGN_IN_HOUSE_MEANINGS: Record<string, Record<string, string>> = {
    "1": {
        "Aries": "You project confidence, initiative, and a pioneering spirit. You're seen as bold, independent, and a natural leader who takes charge.",
        "Taurus": "You present as stable, reliable, and grounded. Others see you as patient, sensual, and someone who values comfort and beauty.",
        "Gemini": "You appear curious, communicative, and versatile. People see you as quick-witted, adaptable, and always ready for conversation.",
        "Cancer": "You come across as nurturing, sensitive, and protective. Others perceive you as emotional, intuitive, and family-oriented.",
        "Leo": "You project charisma, creativity, and warmth. People see you as confident, dramatic, and someone who loves being in the spotlight.",
        "Virgo": "You appear analytical, practical, and detail-oriented. Others see you as organized, helpful, and focused on improvement.",
        "Libra": "You present as diplomatic, charming, and balanced. People see you as cooperative, aesthetic, and seeking harmony in relationships.",
        "Scorpio": "You project intensity, mystery, and depth. Others perceive you as powerful, transformative, and someone with hidden strength.",
        "Sagittarius": "You appear optimistic, adventurous, and philosophical. People see you as free-spirited, honest, and always seeking truth.",
        "Capricorn": "You project seriousness, ambition, and discipline. Others see you as responsible, traditional, and goal-oriented.",
        "Aquarius": "You appear unique, independent, and forward-thinking. People see you as innovative, humanitarian, and marching to your own beat.",
        "Pisces": "You present as dreamy, compassionate, and intuitive. Others perceive you as artistic, empathetic, and spiritually inclined."
    },
    "2": {
        "Aries": "You earn money quickly through initiative and action. You may spend impulsively but also have the drive to rebuild resources.",
        "Taurus": "You have a natural talent for accumulating wealth and material security. You value quality possessions and steady income.",
        "Gemini": "You earn through communication, writing, or multiple income streams. Your finances may fluctuate but you adapt quickly.",
        "Cancer": "You value security and may save for family needs. Money is tied to emotional security and home comforts.",
        "Leo": "You spend on luxury, entertainment, and things that enhance your image. You're generous and may earn through creative pursuits.",
        "Virgo": "You manage money carefully and practically. You earn through service, analysis, or detailed work, valuing quality over quantity.",
        "Libra": "You value beautiful possessions and may earn through partnerships or aesthetics. Money brings harmony and balance to your life.",
        "Scorpio": "You have intense financial focus and may earn through transformation, investments, or shared resources. You're resourceful.",
        "Sagittarius": "You may spend on travel, education, or adventures. Money comes and goes, but you're optimistic about future abundance.",
        "Capricorn": "You build wealth steadily and conservatively. You value long-term security and may earn through traditional careers.",
        "Aquarius": "You may have unconventional income sources or earn through technology. You value financial independence and freedom.",
        "Pisces": "You may earn through creative or spiritual pursuits. Money can be fluid, and you may be generous or need to guard against loss."
    },
    "3": {
        "Aries": "You communicate directly and assertively. You're quick to speak your mind and may have competitive relationships with siblings.",
        "Taurus": "You communicate slowly and deliberately. Your words are practical and grounded, and you value stability in communication.",
        "Gemini": "You're naturally gifted in communication, writing, and learning. You may have multiple siblings or varied educational experiences.",
        "Cancer": "You communicate emotionally and intuitively. Your early education and sibling relationships are deeply meaningful to you.",
        "Leo": "You express yourself dramatically and creatively. You may teach or inspire others through your communication style.",
        "Virgo": "You communicate precisely and analytically. You excel at detailed explanations and may have a critical or helpful communication style.",
        "Libra": "You communicate diplomatically and harmoniously. You seek balance in conversations and may mediate between siblings.",
        "Scorpio": "You communicate with intensity and depth. Your words have power, and you may keep some thoughts private or secretive.",
        "Sagittarius": "You communicate with enthusiasm and honesty. You love sharing knowledge and may have diverse educational or travel experiences.",
        "Capricorn": "You communicate seriously and purposefully. Your early education may have been structured, and you value traditional learning.",
        "Aquarius": "You communicate in unique and innovative ways. You may use technology or unconventional methods to express ideas.",
        "Pisces": "You communicate intuitively and creatively. Your words may be poetic or dreamy, and you pick up on unspoken messages."
    },
    "4": {
        "Aries": "Your home is active and independent. You may move frequently or have a dynamic family environment with strong personalities.",
        "Taurus": "Your home is stable, comfortable, and beautiful. You value security and may have a strong connection to your roots and family traditions.",
        "Gemini": "Your home is busy with communication and activity. You may have multiple homes or a family that values learning and conversation.",
        "Cancer": "Your home is deeply emotional and nurturing. Family bonds are strong, and you may have a close relationship with your mother.",
        "Leo": "Your home is warm, creative, and dramatic. Family life may be theatrical, and you value pride and recognition at home.",
        "Virgo": "Your home is organized and practical. You may focus on health, service, or improvement within the family environment.",
        "Libra": "Your home is harmonious and aesthetic. You seek balance in family relationships and may have a beautiful, well-decorated home.",
        "Scorpio": "Your home life is intense and transformative. Family secrets or deep emotional bonds may characterize your upbringing.",
        "Sagittarius": "Your home may be far from your birthplace or culturally diverse. You value freedom and may have traveled or moved frequently.",
        "Capricorn": "Your home is traditional and structured. You may have had a strict or disciplined upbringing with emphasis on responsibility.",
        "Aquarius": "Your home is unique and unconventional. Family may be diverse or you may have had an unusual or progressive upbringing.",
        "Pisces": "Your home is dreamy and emotional. Family bonds are deep, and you may have a spiritual or artistic family background."
    },
    "5": {
        "Aries": "You express creativity through action and competition. You're passionate in romance and may have energetic, independent children.",
        "Taurus": "You express creativity through art, music, or sensual pleasures. Romance is steady and loyal, and you value comfort in love.",
        "Gemini": "You express creativity through communication, writing, or teaching. Romance is playful and intellectual, with lots of conversation.",
        "Cancer": "You express creativity emotionally and protectively. Romance is nurturing, and you may have a strong emotional bond with children.",
        "Leo": "You express creativity dramatically and confidently. Romance is passionate and showy, and you love being adored and admired.",
        "Virgo": "You express creativity through service and improvement. Romance is practical and helpful, and you may be critical or perfectionist in love.",
        "Libra": "You express creativity through beauty and harmony. Romance is balanced and aesthetic, and you seek partnership and cooperation.",
        "Scorpio": "You express creativity with intensity and depth. Romance is transformative and passionate, with deep emotional connections.",
        "Sagittarius": "You express creativity through adventure and philosophy. Romance is optimistic and free-spirited, and you value honesty and growth.",
        "Capricorn": "You express creativity through structure and discipline. Romance is serious and traditional, and you may delay having children.",
        "Aquarius": "You express creativity in unique and innovative ways. Romance is independent and unconventional, valuing friendship in love.",
        "Pisces": "You express creativity through art, music, or spirituality. Romance is dreamy and idealistic, with deep emotional and spiritual connections."
    },
    "6": {
        "Aries": "You work with energy and initiative. Health requires active management, and you may be prone to headaches or inflammation.",
        "Taurus": "You work steadily and reliably. Health is generally stable, but you may need to watch your diet and avoid overindulgence.",
        "Gemini": "You work in communication, writing, or varied tasks. Health may involve nervous system issues, and you need mental stimulation.",
        "Cancer": "You work in nurturing or caregiving roles. Health is tied to emotions, and you may need to manage stress and digestive issues.",
        "Leo": "You work creatively or in leadership roles. Health is generally good, but you may need to watch your heart and avoid overexertion.",
        "Virgo": "You work in service, health, or detail-oriented fields. You're health-conscious and may be prone to worry or digestive issues.",
        "Libra": "You work in partnerships or aesthetic fields. Health requires balance, and you may need to avoid indecision or kidney issues.",
        "Scorpio": "You work in transformation, research, or healing. Health may involve regeneration, and you're drawn to deep, meaningful work.",
        "Sagittarius": "You work in education, travel, or philosophy. Health is generally good, but you may need to watch your liver and avoid excess.",
        "Capricorn": "You work with discipline and structure. Health requires careful management, and you may be prone to bone or joint issues.",
        "Aquarius": "You work in technology or humanitarian fields. Health may be unusual, and you need freedom and variety in your routine.",
        "Pisces": "You work in service, healing, or creative fields. Health is sensitive, and you may need to avoid escapism or substance issues."
    },
    "7": {
        "Aries": "You attract partners who are independent, assertive, and direct. Relationships are dynamic but may involve competition or conflict.",
        "Taurus": "You attract stable, reliable partners who value security. Relationships are steady and long-lasting, with emphasis on loyalty.",
        "Gemini": "You attract communicative, intellectual partners. Relationships are lively and may involve multiple connections or mental stimulation.",
        "Cancer": "You attract nurturing, emotional partners. Relationships are deeply emotional, and you seek security and family in partnership.",
        "Leo": "You attract confident, creative partners. Relationships are passionate and dramatic, with emphasis on mutual admiration.",
        "Virgo": "You attract practical, helpful partners. Relationships focus on service and improvement, and you may be critical or perfectionist.",
        "Libra": "You attract balanced, aesthetic partners. Relationships are harmonious and beautiful, with emphasis on partnership and cooperation.",
        "Scorpio": "You attract intense, transformative partners. Relationships are deep and passionate, with potential for power struggles.",
        "Sagittarius": "You attract adventurous, philosophical partners. Relationships are optimistic and free-spirited, valuing honesty and growth.",
        "Capricorn": "You attract serious, ambitious partners. Relationships are traditional and structured, with emphasis on long-term commitment.",
        "Aquarius": "You attract unique, independent partners. Relationships are unconventional and value friendship, freedom, and innovation.",
        "Pisces": "You attract dreamy, compassionate partners. Relationships are idealistic and spiritual, with deep emotional and intuitive connections."
    },
    "8": {
        "Aries": "You transform through action and courage. Shared resources may involve conflict, and you're direct about transformation.",
        "Taurus": "You transform slowly and steadily. Shared resources are stable, and you value security in joint finances and inheritances.",
        "Gemini": "You transform through communication and learning. Shared resources may involve multiple sources, and you adapt to change easily.",
        "Cancer": "You transform emotionally and protectively. Shared resources are tied to family, and you may inherit or share with family members.",
        "Leo": "You transform dramatically and creatively. Shared resources may be generous, and you transform through self-expression and pride.",
        "Virgo": "You transform through analysis and service. Shared resources require careful management, and you improve through transformation.",
        "Libra": "You transform through partnership and balance. Shared resources involve others, and you seek harmony in joint finances.",
        "Scorpio": "You transform intensely and deeply. This is your natural house, so transformation is powerful, and you're drawn to mysteries.",
        "Sagittarius": "You transform through philosophy and expansion. Shared resources may come from distant sources, and you're optimistic about change.",
        "Capricorn": "You transform through discipline and structure. Shared resources are managed carefully, and you build security through transformation.",
        "Aquarius": "You transform through innovation and independence. Shared resources may be unconventional, and you value freedom in transformation.",
        "Pisces": "You transform through spirituality and intuition. Shared resources may be fluid, and you're drawn to mystical or hidden matters."
    },
    "9": {
        "Aries": "You seek truth through action and adventure. Philosophy is direct and practical, and you may travel for adventure or competition.",
        "Taurus": "You seek truth through stability and tradition. Philosophy is grounded, and you may travel for comfort or to appreciate beauty.",
        "Gemini": "You seek truth through learning and communication. Philosophy involves multiple perspectives, and you may travel for education or variety.",
        "Cancer": "You seek truth through emotion and tradition. Philosophy is tied to family values, and you may travel to connect with roots.",
        "Leo": "You seek truth through creativity and self-expression. Philosophy is dramatic, and you may travel for adventure or to be admired.",
        "Virgo": "You seek truth through analysis and service. Philosophy is practical, and you may travel for work or to improve yourself.",
        "Libra": "You seek truth through balance and aesthetics. Philosophy involves harmony, and you may travel for beauty or partnership.",
        "Scorpio": "You seek truth through depth and transformation. Philosophy is intense, and you're drawn to mysteries, psychology, or the occult.",
        "Sagittarius": "You seek truth through expansion and adventure. This is your natural house, so philosophy and travel are central to your life.",
        "Capricorn": "You seek truth through structure and tradition. Philosophy is serious, and you may travel for career or to honor traditions.",
        "Aquarius": "You seek truth through innovation and independence. Philosophy is unconventional, and you may travel for humanitarian causes.",
        "Pisces": "You seek truth through spirituality and intuition. Philosophy is mystical, and you may travel for spiritual growth or artistic inspiration."
    },
    "10": {
        "Aries": "You're a natural leader and pioneer in your career. You're seen as independent, ambitious, and someone who takes initiative.",
        "Taurus": "You build a stable, reliable career. You're seen as patient and persistent, and may work in finance, art, or stable industries.",
        "Gemini": "You excel in communication, writing, or varied careers. You're seen as versatile and may have multiple career paths or interests.",
        "Cancer": "You're drawn to nurturing or family-oriented careers. You're seen as protective and may work in caregiving, real estate, or food industries.",
        "Leo": "You shine in creative or leadership roles. You're seen as confident and dramatic, and may work in entertainment, management, or the arts.",
        "Virgo": "You excel in service, health, or detail-oriented careers. You're seen as practical and helpful, and may work in healthcare or analysis.",
        "Libra": "You're drawn to partnership, aesthetics, or justice careers. You're seen as diplomatic and may work in law, design, or relationships.",
        "Scorpio": "You're drawn to transformation, research, or power careers. You're seen as intense and may work in psychology, investigation, or healing.",
        "Sagittarius": "You're drawn to education, travel, or philosophy careers. You're seen as optimistic and may work in teaching, publishing, or travel.",
        "Capricorn": "You build a traditional, structured career. This is your natural house, so you're ambitious, disciplined, and may achieve high status.",
        "Aquarius": "You're drawn to technology, innovation, or humanitarian careers. You're seen as unique and may work in science, technology, or social causes.",
        "Pisces": "You're drawn to creative, spiritual, or healing careers. You're seen as intuitive and may work in arts, healing, or service to others."
    },
    "11": {
        "Aries": "You have independent, active friends. Your hopes involve leadership and initiative, and you're drawn to groups that take action.",
        "Taurus": "You have stable, loyal friends. Your hopes involve security and comfort, and you value long-term friendships and steady groups.",
        "Gemini": "You have communicative, diverse friends. Your hopes involve learning and variety, and you're part of multiple groups or networks.",
        "Cancer": "You have emotional, protective friends. Your hopes involve family and security, and you're drawn to nurturing or family-oriented groups.",
        "Leo": "You have creative, confident friends. Your hopes involve recognition and self-expression, and you're drawn to groups that celebrate creativity.",
        "Virgo": "You have practical, helpful friends. Your hopes involve improvement and service, and you're drawn to groups focused on health or improvement.",
        "Libra": "You have balanced, aesthetic friends. Your hopes involve harmony and partnership, and you're drawn to groups focused on beauty or justice.",
        "Scorpio": "You have intense, transformative friends. Your hopes involve depth and power, and you're drawn to groups focused on transformation or mystery.",
        "Sagittarius": "You have adventurous, philosophical friends. Your hopes involve expansion and truth, and you're drawn to groups focused on travel or learning.",
        "Capricorn": "You have serious, ambitious friends. Your hopes involve achievement and structure, and you're drawn to professional or traditional groups.",
        "Aquarius": "You have unique, independent friends. This is your natural house, so friendships and hopes are central, and you value innovation and freedom.",
        "Pisces": "You have dreamy, compassionate friends. Your hopes involve spirituality and creativity, and you're drawn to groups focused on healing or art."
    },
    "12": {
        "Aries": "Your subconscious is active and independent. Hidden matters involve action and courage, and you may need solitude to recharge energy.",
        "Taurus": "Your subconscious is stable and grounded. Hidden matters involve security and comfort, and you may retreat to peaceful, beautiful places.",
        "Gemini": "Your subconscious is communicative and varied. Hidden matters involve learning and adaptation, and you may process through writing or talking.",
        "Cancer": "Your subconscious is emotional and protective. Hidden matters involve family and security, and you may retreat to familiar, safe spaces.",
        "Leo": "Your subconscious is creative and proud. Hidden matters involve self-expression and recognition, and you may need creative solitude.",
        "Virgo": "Your subconscious is analytical and practical. Hidden matters involve service and improvement, and you may process through work or analysis.",
        "Libra": "Your subconscious is balanced and aesthetic. Hidden matters involve partnership and harmony, and you may retreat to beautiful, peaceful places.",
        "Scorpio": "Your subconscious is intense and transformative. Hidden matters involve depth and power, and you're drawn to mysteries and the occult.",
        "Sagittarius": "Your subconscious is optimistic and philosophical. Hidden matters involve truth and expansion, and you may process through travel or learning.",
        "Capricorn": "Your subconscious is structured and disciplined. Hidden matters involve responsibility and tradition, and you may process through work or duty.",
        "Aquarius": "Your subconscious is innovative and independent. Hidden matters involve freedom and uniqueness, and you may process through technology or innovation.",
        "Pisces": "Your subconscious is dreamy and spiritual. This is your natural house, so the subconscious and hidden matters are central to your life."
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
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {Object.entries(houses).map(([houseNum, signData]) => {
                    // Normalize sign name
                    let signName = ""
                    if (typeof signData === "string") {
                        signName = signData
                    } else if (typeof signData === "object" && signData && "sign" in signData) {
                        signName = (signData as AstroPoint).sign
                    }

                    // Translate sanskrit if needed
                    const displaySign = normalizeSign(signName)
                    
                    // Find planets in this house's sign
                    const planetsInHouse = getPlanetsInSign(signName)

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
                                
                                <p className="text-xs text-muted-foreground leading-relaxed mt-3 mb-3">
                                    {HOUSE_DESCRIPTIONS[houseNum]} 
                                </p>

                                {/* Planets in House */}
                                {planetsInHouse.length > 0 && (
                                    <div className="mt-3 mb-3">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-2">
                                            Planets in this House
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {planetsInHouse.map((planet) => (
                                                <Badge 
                                                    key={planet}
                                                    variant="outline" 
                                                    className="bg-yellow-500/20 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30 text-xs"
                                                >
                                                    {planet}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Sign in House Meaning */}
                                {SIGN_IN_HOUSE_MEANINGS[houseNum]?.[displaySign] && (
                                    <div className="mt-4 p-3 rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80 mb-2">
                                            {displaySign} in {houseNum}{suffix} House
                                        </p>
                                        <p className="text-xs text-white/90 leading-relaxed">
                                            {SIGN_IN_HOUSE_MEANINGS[houseNum][displaySign]}
                                        </p>
                                    </div>
                                )}
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
