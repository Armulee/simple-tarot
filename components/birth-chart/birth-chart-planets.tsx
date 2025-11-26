"use client"

import { Card } from "@/components/ui/card"
import { SANSKRIT_SIGNS, AstroPoint } from "@/lib/birth-chart-utils"
import { Sparkles } from "lucide-react"

interface BirthChartPlanetsProps {
    planets?: Record<string, unknown> | null
}

// Planet in Sign Meanings
const PLANET_IN_SIGN_MEANINGS: Record<string, Record<string, string>> = {
    "Sun": {
        "Aries": "Your identity is bold, independent, and pioneering. You're a natural leader who takes initiative and isn't afraid to be first. Your confidence comes from action and courage.",
        "Taurus": "Your identity is stable, reliable, and grounded. You value security, beauty, and comfort. Your confidence comes from building something lasting and tangible.",
        "Gemini": "Your identity is curious, communicative, and versatile. You're adaptable and love learning. Your confidence comes from knowledge and the ability to express ideas.",
        "Cancer": "Your identity is nurturing, protective, and emotional. You value family and security. Your confidence comes from emotional connection and caring for others.",
        "Leo": "Your identity is confident, creative, and dramatic. You love being in the spotlight and expressing yourself. Your confidence comes from self-expression and recognition.",
        "Virgo": "Your identity is practical, analytical, and service-oriented. You find confidence through improvement and being helpful. You value precision and efficiency.",
        "Libra": "Your identity is diplomatic, aesthetic, and relationship-focused. Your confidence comes from harmony, beauty, and partnership. You seek balance in all things.",
        "Scorpio": "Your identity is intense, transformative, and powerful. Your confidence comes from depth and the ability to regenerate. You're drawn to mysteries and hidden truths.",
        "Sagittarius": "Your identity is optimistic, adventurous, and philosophical. Your confidence comes from seeking truth and expanding horizons. You value freedom and honesty.",
        "Capricorn": "Your identity is ambitious, disciplined, and traditional. Your confidence comes from achievement and building structures. You value responsibility and respect.",
        "Aquarius": "Your identity is unique, independent, and forward-thinking. Your confidence comes from innovation and humanitarian values. You march to your own beat.",
        "Pisces": "Your identity is dreamy, compassionate, and intuitive. Your confidence comes from creativity and spiritual connection. You're artistic and empathetic."
    },
    "Moon": {
        "Aries": "Your emotions are quick, fiery, and impulsive. You feel things intensely and react immediately. You need independence and action to feel secure.",
        "Taurus": "Your emotions are stable, steady, and sensual. You feel secure through comfort, beauty, and stability. You value routine and material security.",
        "Gemini": "Your emotions are changeable, curious, and mental. You process feelings through communication and variety. You need mental stimulation to feel secure.",
        "Cancer": "Your emotions are deep, nurturing, and protective. This is your natural sign, so feelings are central. You need emotional security and family connection.",
        "Leo": "Your emotions are warm, dramatic, and proud. You feel secure through recognition and self-expression. You need to feel special and admired.",
        "Virgo": "Your emotions are practical, analytical, and service-oriented. You process feelings through helping others and improving things. You need order to feel secure.",
        "Libra": "Your emotions are balanced, harmonious, and relationship-focused. You feel secure through partnership and beauty. You need harmony to feel emotionally stable.",
        "Scorpio": "Your emotions are intense, deep, and transformative. You feel things powerfully and may keep feelings hidden. You need depth and intensity to feel secure.",
        "Sagittarius": "Your emotions are optimistic, adventurous, and philosophical. You feel secure through freedom and expansion. You need adventure and meaning to feel fulfilled.",
        "Capricorn": "Your emotions are controlled, disciplined, and reserved. You may suppress feelings and need structure to feel secure. You value emotional responsibility.",
        "Aquarius": "Your emotions are detached, independent, and humanitarian. You feel secure through freedom and innovation. You may intellectualize feelings.",
        "Pisces": "Your emotions are dreamy, compassionate, and intuitive. You feel things deeply and may absorb others' emotions. You need spiritual connection to feel secure."
    },
    "Mercury": {
        "Aries": "Your thinking is quick, direct, and assertive. You communicate boldly and make decisions rapidly. You're straightforward and may be impatient with slow thinkers.",
        "Taurus": "Your thinking is practical, steady, and grounded. You communicate slowly and deliberately. You think about material security and practical matters.",
        "Gemini": "Your thinking is versatile, curious, and quick. This is your natural sign, so communication is central. You love learning and sharing ideas.",
        "Virgo": "Your thinking is analytical, precise, and detail-oriented. This is also your natural sign. You excel at analysis and practical problem-solving.",
        "Cancer": "Your thinking is emotional, intuitive, and memory-focused. You communicate with feeling and remember emotional details. You think about security and family.",
        "Leo": "Your thinking is creative, dramatic, and confident. You communicate with flair and love sharing your ideas. You think about self-expression and recognition.",
        "Libra": "Your thinking is balanced, diplomatic, and aesthetic. You communicate harmoniously and consider all perspectives. You think about relationships and beauty.",
        "Scorpio": "Your thinking is intense, penetrating, and secretive. You communicate with depth and may keep some thoughts private. You think about transformation and mysteries.",
        "Sagittarius": "Your thinking is philosophical, optimistic, and expansive. You communicate with enthusiasm and love sharing knowledge. You think about truth and meaning.",
        "Capricorn": "Your thinking is serious, structured, and goal-oriented. You communicate purposefully and think about long-term plans and responsibilities.",
        "Aquarius": "Your thinking is innovative, independent, and original. You communicate uniquely and think about the future and humanitarian ideals.",
        "Pisces": "Your thinking is intuitive, creative, and dreamy. You communicate with imagination and may think in images or symbols. You're highly intuitive."
    },
    "Venus": {
        "Aries": "You're attracted to bold, independent people and passionate relationships. Love is exciting and direct. You value independence and action in relationships.",
        "Taurus": "You're attracted to stable, sensual people and loyal relationships. This is your natural sign. You value security, beauty, and physical comfort in love.",
        "Gemini": "You're attracted to communicative, intellectual people and playful relationships. You value mental connection and variety in love. You may have multiple interests.",
        "Cancer": "You're attracted to nurturing, emotional people and protective relationships. You value security and emotional connection. You're caring and devoted.",
        "Leo": "You're attracted to confident, creative people and dramatic relationships. You value admiration and self-expression. You love being adored and giving affection.",
        "Virgo": "You're attracted to practical, helpful people and service-oriented relationships. You show love through acts of service and value improvement in relationships.",
        "Libra": "You're attracted to balanced, aesthetic people and harmonious relationships. This is your natural sign. You value partnership, beauty, and harmony in love.",
        "Scorpio": "You're attracted to intense, transformative people and passionate relationships. You value depth and intensity. Love is transformative and all-consuming.",
        "Sagittarius": "You're attracted to adventurous, philosophical people and free-spirited relationships. You value honesty and growth. You need freedom in relationships.",
        "Capricorn": "You're attracted to serious, ambitious people and traditional relationships. You value commitment and long-term security. Love is practical and responsible.",
        "Aquarius": "You're attracted to unique, independent people and unconventional relationships. You value friendship and freedom. Love is innovative and non-traditional.",
        "Pisces": "You're attracted to dreamy, compassionate people and idealistic relationships. You value spiritual connection and empathy. Love is romantic and selfless."
    },
    "Mars": {
        "Aries": "Your energy is direct, impulsive, and competitive. This is your natural sign. You take action immediately and aren't afraid of conflict. You're a natural warrior.",
        "Taurus": "Your energy is steady, persistent, and sensual. You take action slowly but persistently. You channel energy into building security and material comfort.",
        "Gemini": "Your energy is quick, versatile, and communicative. You take action through words and ideas. You may have multiple projects and need mental stimulation.",
        "Cancer": "Your energy is emotional, protective, and defensive. You take action to protect loved ones. You may suppress anger and need emotional security to act.",
        "Leo": "Your energy is dramatic, confident, and creative. You take action with flair and love being recognized. You channel energy into self-expression and leadership.",
        "Virgo": "Your energy is practical, precise, and service-oriented. You take action through detailed work and improvement. You channel energy into helping and perfecting.",
        "Libra": "Your energy is balanced, diplomatic, and relationship-focused. You may avoid direct conflict and take action through partnership. You channel energy into harmony.",
        "Scorpio": "Your energy is intense, focused, and transformative. This is also your natural sign. You take action with determination and channel energy into deep transformation.",
        "Sagittarius": "Your energy is adventurous, optimistic, and expansive. You take action through adventure and exploration. You channel energy into seeking truth and meaning.",
        "Capricorn": "Your energy is disciplined, ambitious, and goal-oriented. You take action systematically and channel energy into building structures and achieving goals.",
        "Aquarius": "Your energy is innovative, independent, and rebellious. You take action through innovation and channel energy into breaking free from tradition.",
        "Pisces": "Your energy is intuitive, compassionate, and sometimes passive. You may avoid direct action and channel energy into creativity, service, or spiritual pursuits."
    },
    "Jupiter": {
        "Aries": "Your growth comes through leadership, initiative, and pioneering. You're optimistic about new beginnings and find luck through taking action and being first.",
        "Taurus": "Your growth comes through building security, accumulating resources, and appreciating beauty. You find luck through steady effort and material stability.",
        "Gemini": "Your growth comes through learning, communication, and variety. You find luck through knowledge, teaching, and connecting with others intellectually.",
        "Cancer": "Your growth comes through emotional security, family, and nurturing. This is your natural sign. You find luck through caring for others and building emotional foundations.",
        "Leo": "Your growth comes through creativity, self-expression, and recognition. You find luck through sharing your talents and being admired. You're generous and optimistic.",
        "Virgo": "Your growth comes through service, improvement, and practical wisdom. You find luck through helping others and perfecting your skills. You value health and efficiency.",
        "Libra": "Your growth comes through partnership, harmony, and aesthetics. You find luck through relationships and creating beauty. You value justice and balance.",
        "Scorpio": "Your growth comes through transformation, depth, and shared resources. You find luck through regeneration and uncovering hidden truths. You're drawn to mysteries.",
        "Sagittarius": "Your growth comes through expansion, philosophy, and adventure. This is your natural sign. You find luck through seeking truth, travel, and higher learning.",
        "Capricorn": "Your growth comes through discipline, structure, and achievement. You find luck through building lasting foundations and taking responsibility. You value tradition.",
        "Aquarius": "Your growth comes through innovation, independence, and humanitarian ideals. You find luck through breaking free from tradition and embracing uniqueness.",
        "Pisces": "Your growth comes through spirituality, compassion, and creativity. This is also your natural sign. You find luck through intuition, art, and spiritual connection."
    },
    "Saturn": {
        "Aries": "Your challenges involve learning patience, controlling impulsiveness, and taking responsibility for your actions. You build discipline through leadership and initiative.",
        "Taurus": "Your challenges involve financial security, material stability, and learning to value what you have. You build discipline through steady effort and persistence.",
        "Gemini": "Your challenges involve focus, communication, and learning to commit to ideas. You build discipline through education and clear thinking.",
        "Cancer": "Your challenges involve emotional security, family responsibilities, and learning to protect yourself. You build discipline through nurturing and emotional maturity.",
        "Leo": "Your challenges involve ego, creativity, and learning humility. You build discipline through self-expression and taking responsibility for your talents.",
        "Virgo": "Your challenges involve perfectionism, service, and learning to accept imperfection. You build discipline through practical work and helping others.",
        "Libra": "Your challenges involve relationships, balance, and learning to make decisions. You build discipline through partnership and creating harmony.",
        "Scorpio": "Your challenges involve transformation, power, and learning to let go. You build discipline through deep change and facing your shadows.",
        "Sagittarius": "Your challenges involve beliefs, expansion, and learning to be realistic. You build discipline through seeking truth and taking responsibility for your philosophy.",
        "Capricorn": "Your challenges involve structure, authority, and learning to balance work and life. This is your natural sign. You build discipline through achievement and tradition.",
        "Aquarius": "Your challenges involve independence, innovation, and learning to balance freedom with responsibility. You build discipline through breaking free while staying grounded.",
        "Pisces": "Your challenges involve boundaries, illusions, and learning to face reality. You build discipline through spiritual practice and learning to distinguish truth from illusion."
    },
    "Uranus": {
        "Aries": "Your uniqueness comes through independence, innovation, and pioneering new ways. You break free through action and may be a revolutionary leader.",
        "Taurus": "Your uniqueness comes through unconventional values, innovative approaches to security, and breaking free from material attachments. You revolutionize how resources are used.",
        "Gemini": "Your uniqueness comes through innovative communication, original ideas, and breaking free from traditional thinking. You revolutionize how information is shared.",
        "Cancer": "Your uniqueness comes through unconventional home life, innovative family structures, and breaking free from emotional patterns. You revolutionize nurturing.",
        "Leo": "Your uniqueness comes through innovative self-expression, original creativity, and breaking free from ego attachments. You revolutionize how creativity is expressed.",
        "Virgo": "Your uniqueness comes through innovative service, original approaches to health, and breaking free from perfectionism. You revolutionize practical work.",
        "Libra": "Your uniqueness comes through unconventional relationships, innovative partnerships, and breaking free from traditional relationship models. You revolutionize harmony.",
        "Scorpio": "Your uniqueness comes through innovative transformation, original approaches to power, and breaking free from control. You revolutionize how change happens.",
        "Sagittarius": "Your uniqueness comes through innovative philosophy, original beliefs, and breaking free from dogmatic thinking. You revolutionize how truth is sought.",
        "Capricorn": "Your uniqueness comes through innovative structures, original approaches to authority, and breaking free from tradition. You revolutionize how systems work.",
        "Aquarius": "Your uniqueness comes through complete independence, innovation, and breaking free from all constraints. This is your natural sign. You're a true revolutionary.",
        "Pisces": "Your uniqueness comes through innovative spirituality, original intuition, and breaking free from illusions. You revolutionize how spirituality is experienced."
    },
    "Neptune": {
        "Aries": "Your dreams involve pioneering spiritual paths, idealistic action, and dissolving ego boundaries. You seek transcendence through courage and initiative.",
        "Taurus": "Your dreams involve idealistic values, spiritual materialism, and dissolving attachments to possessions. You seek transcendence through beauty and stability.",
        "Gemini": "Your dreams involve idealistic communication, spiritual knowledge, and dissolving mental boundaries. You seek transcendence through ideas and learning.",
        "Cancer": "Your dreams involve idealistic home life, spiritual nurturing, and dissolving emotional boundaries. You seek transcendence through family and emotional connection.",
        "Leo": "Your dreams involve idealistic creativity, spiritual self-expression, and dissolving ego boundaries. You seek transcendence through art and recognition.",
        "Virgo": "Your dreams involve idealistic service, spiritual perfection, and dissolving practical boundaries. You seek transcendence through helping and improving.",
        "Libra": "Your dreams involve idealistic relationships, spiritual harmony, and dissolving partnership boundaries. You seek transcendence through beauty and balance.",
        "Scorpio": "Your dreams involve idealistic transformation, spiritual depth, and dissolving power boundaries. You seek transcendence through mystery and regeneration.",
        "Sagittarius": "Your dreams involve idealistic philosophy, spiritual expansion, and dissolving belief boundaries. You seek transcendence through truth and adventure.",
        "Capricorn": "Your dreams involve idealistic structures, spiritual authority, and dissolving material boundaries. You seek transcendence through discipline and achievement.",
        "Aquarius": "Your dreams involve idealistic innovation, spiritual independence, and dissolving social boundaries. You seek transcendence through freedom and humanitarian ideals.",
        "Pisces": "Your dreams involve complete spiritual connection, idealistic compassion, and dissolving all boundaries. This is your natural sign. You're highly intuitive and artistic."
    },
    "Pluto": {
        "Aries": "Your transformation comes through courage, independence, and deep personal change. You experience power through taking action and breaking free from the past.",
        "Taurus": "Your transformation comes through values, resources, and deep material change. You experience power through building security and transforming what you value.",
        "Gemini": "Your transformation comes through communication, learning, and deep mental change. You experience power through ideas and transforming how you think.",
        "Cancer": "Your transformation comes through emotions, family, and deep emotional change. You experience power through nurturing and transforming your roots.",
        "Leo": "Your transformation comes through creativity, ego, and deep personal expression. You experience power through self-expression and transforming how you shine.",
        "Virgo": "Your transformation comes through service, health, and deep practical change. You experience power through improvement and transforming daily life.",
        "Libra": "Your transformation comes through relationships, balance, and deep partnership change. You experience power through harmony and transforming how you relate.",
        "Scorpio": "Your transformation comes through intensity, power, and complete regeneration. This is your natural sign. You experience profound transformation and uncover hidden truths.",
        "Sagittarius": "Your transformation comes through beliefs, expansion, and deep philosophical change. You experience power through truth and transforming your worldview.",
        "Capricorn": "Your transformation comes through structures, authority, and deep systemic change. You experience power through building and transforming institutions.",
        "Aquarius": "Your transformation comes through innovation, independence, and deep social change. You experience power through revolution and transforming society.",
        "Pisces": "Your transformation comes through spirituality, compassion, and deep spiritual change. You experience power through transcendence and transforming illusions."
    },
    "Rahu": {
        "Aries": "You're drawn to leadership, independence, and pioneering. Your desires involve being first, taking action, and breaking new ground. You may obsess over competition.",
        "Taurus": "You're drawn to security, beauty, and material comfort. Your desires involve accumulating resources and enjoying sensual pleasures. You may obsess over possessions.",
        "Gemini": "You're drawn to communication, learning, and variety. Your desires involve knowledge and connecting with others. You may obsess over information and ideas.",
        "Cancer": "You're drawn to security, family, and emotional connection. Your desires involve nurturing and protecting. You may obsess over home and family matters.",
        "Leo": "You're drawn to recognition, creativity, and self-expression. Your desires involve being admired and expressing yourself. You may obsess over fame and attention.",
        "Virgo": "You're drawn to perfection, service, and improvement. Your desires involve helping others and perfecting things. You may obsess over details and health.",
        "Libra": "You're drawn to partnership, beauty, and harmony. Your desires involve relationships and aesthetics. You may obsess over finding the perfect partner.",
        "Scorpio": "You're drawn to power, transformation, and intensity. Your desires involve deep change and uncovering secrets. You may obsess over control and mysteries.",
        "Sagittarius": "You're drawn to expansion, philosophy, and adventure. Your desires involve seeking truth and exploring. You may obsess over beliefs and travel.",
        "Capricorn": "You're drawn to achievement, structure, and authority. Your desires involve building and achieving status. You may obsess over career and recognition.",
        "Aquarius": "You're drawn to innovation, independence, and humanitarian causes. Your desires involve breaking free and helping humanity. You may obsess over freedom and uniqueness.",
        "Pisces": "You're drawn to spirituality, creativity, and transcendence. Your desires involve escaping reality and connecting with the divine. You may obsess over dreams and illusions."
    },
    "Ketu": {
        "Aries": "You're releasing attachment to ego, competition, and aggression. Your spiritual path involves learning patience and letting go of the need to be first.",
        "Taurus": "You're releasing attachment to material possessions and security. Your spiritual path involves learning to value non-material things and letting go of attachments.",
        "Gemini": "You're releasing attachment to mental chatter and superficial communication. Your spiritual path involves learning silence and going beyond words.",
        "Cancer": "You're releasing attachment to emotional security and family patterns. Your spiritual path involves learning independence and letting go of the past.",
        "Leo": "You're releasing attachment to ego, recognition, and self-expression. Your spiritual path involves learning humility and letting go of the need for attention.",
        "Virgo": "You're releasing attachment to perfectionism and service. Your spiritual path involves learning to accept imperfection and letting go of the need to fix everything.",
        "Libra": "You're releasing attachment to relationships and balance. Your spiritual path involves learning independence and letting go of the need for partnership.",
        "Scorpio": "You're releasing attachment to power, control, and intensity. Your spiritual path involves learning to let go and finding peace in surrender.",
        "Sagittarius": "You're releasing attachment to beliefs, expansion, and adventure. Your spiritual path involves learning to be present and letting go of the need to always seek more.",
        "Capricorn": "You're releasing attachment to structure, achievement, and authority. Your spiritual path involves learning flexibility and letting go of the need for control.",
        "Aquarius": "You're releasing attachment to independence and innovation. Your spiritual path involves learning connection and letting go of the need to be different.",
        "Pisces": "You're releasing attachment to illusions, dreams, and escape. Your spiritual path involves learning to face reality and letting go of the need to transcend."
    },
    "Ascendant": {
        "Aries": "You appear bold, independent, and action-oriented. Others see you as a natural leader who takes initiative. You approach life with courage and directness.",
        "Taurus": "You appear stable, reliable, and grounded. Others see you as patient and sensual. You approach life with persistence and value security and comfort.",
        "Gemini": "You appear curious, communicative, and versatile. Others see you as quick-witted and adaptable. You approach life with curiosity and love learning.",
        "Cancer": "You appear nurturing, sensitive, and protective. Others see you as emotional and intuitive. You approach life with care and value security and family.",
        "Leo": "You appear confident, creative, and dramatic. Others see you as charismatic and warm. You approach life with enthusiasm and love being recognized.",
        "Virgo": "You appear analytical, practical, and detail-oriented. Others see you as organized and helpful. You approach life with precision and value improvement.",
        "Libra": "You appear diplomatic, charming, and balanced. Others see you as cooperative and aesthetic. You approach life seeking harmony and beauty.",
        "Scorpio": "You appear intense, mysterious, and powerful. Others see you as transformative and deep. You approach life with intensity and are drawn to mysteries.",
        "Sagittarius": "You appear optimistic, adventurous, and philosophical. Others see you as free-spirited and honest. You approach life seeking truth and expansion.",
        "Capricorn": "You appear serious, ambitious, and disciplined. Others see you as responsible and traditional. You approach life with structure and value achievement.",
        "Aquarius": "You appear unique, independent, and forward-thinking. Others see you as innovative and humanitarian. You approach life with originality and value freedom.",
        "Pisces": "You appear dreamy, compassionate, and intuitive. Others see you as artistic and empathetic. You approach life with imagination and spiritual sensitivity."
    }
}

export default function BirthChartPlanets({ planets }: BirthChartPlanetsProps) {
    if (!planets) return null

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/20 border border-accent/30">
                        <Sparkles className="w-6 h-6 text-accent" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-white">
                        Planetary Positions
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
                        const planetInSignMeaning = PLANET_IN_SIGN_MEANINGS[planet]?.[displaySign] || ""

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
                                                <span className="font-semibold">{planet}</span>
                                            </div>
                                            <span className="text-white/60 text-sm">in</span>
                                            <span className="text-white font-semibold text-lg group-hover:text-accent transition-colors">
                                                {displaySign}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Planet in Sign Meaning - Always Visible */}
                                    {planetInSignMeaning && (
                                        <div className="mt-4 p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/40">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-400/90 mb-2">
                                                {planet} in {displaySign}
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
