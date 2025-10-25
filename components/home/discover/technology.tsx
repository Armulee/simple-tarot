"use client"

import { Zap, Shield, Globe, Cpu, Database, Lock, Wifi } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"

export default function TechnologySection() {
    const t = useTranslations("HomeDiscover.Technology")
    const [isVisible, setIsVisible] = useState(false)
    const [hoveredCard, setHoveredCard] = useState<number | null>(null)

    useEffect(() => {
        setIsVisible(true)
    }, [])

    const technologies = [
        {
            icon: Zap,
            title: t("aiPowered.title"),
            description: t("aiPowered.desc"),
            color: "from-yellow-400 to-orange-500",
            glowColor: "shadow-yellow-500/20",
            features: t.raw("aiPowered.features") as string[],
            gradient: "from-yellow-500/10 to-orange-500/10",
        },
        {
            icon: Shield,
            title: t("securePrivate.title"),
            description: t("securePrivate.desc"),
            color: "from-green-400 to-emerald-500",
            glowColor: "shadow-green-500/20",
            features: t.raw("securePrivate.features") as string[],
            gradient: "from-green-500/10 to-emerald-500/10",
        },
        {
            icon: Globe,
            title: t("globalAccess.title"),
            description: t("globalAccess.desc"),
            color: "from-blue-400 to-cyan-500",
            glowColor: "shadow-blue-500/20",
            features: t.raw("globalAccess.features") as string[],
            gradient: "from-blue-500/10 to-cyan-500/10",
        },
    ]

    return (
        <div className='space-y-12'>
            {/* Enhanced section header */}
            <div
                className={`text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
                <div className='inline-flex items-center gap-2 mb-4'>
                    <Cpu className='w-6 h-6 text-accent animate-pulse' />
                    <span className='text-primary font-semibold text-sm uppercase tracking-wider'>
                        {t("label")}
                    </span>
                    <Cpu className='w-6 h-6 text-accent animate-pulse' />
                </div>
                <h2 className='text-4xl md:text-5xl font-bold text-white mb-4'>
                    {t("title")}
                </h2>
                <p className='text-gray-400 max-w-2xl mx-auto text-lg'>
                    {t("description")}
                </p>
            </div>

            {/* Technology cards */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
                {technologies.map((tech, index) => {
                    const IconComponent = tech.icon

                    return (
                        <div
                            key={index}
                            className={`group relative transition-all duration-700 delay-${index * 200} ${
                                isVisible
                                    ? "opacity-100 translate-y-0"
                                    : "opacity-0 translate-y-8"
                            }`}
                            onMouseEnter={() => setHoveredCard(index)}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            {/* Card background with enhanced effects */}
                            <div
                                className={`
                                relative bg-gradient-to-br from-gray-800/40 to-gray-900/60 
                                backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8
                                transition-all duration-500 hover:scale-105 hover:shadow-2xl
                                ${hoveredCard === index ? `shadow-2xl ${tech.glowColor}` : "shadow-lg"}
                            `}
                            >
                                {/* Animated background gradient */}
                                <div
                                    className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${tech.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                                ></div>

                                {/* Floating particles */}
                                <div className='absolute inset-0 overflow-hidden rounded-2xl'>
                                    <div
                                        className={`absolute top-4 right-4 w-2 h-2 bg-gradient-to-r ${tech.color} rounded-full animate-ping delay-${index * 300}`}
                                    ></div>
                                    <div
                                        className={`absolute bottom-6 left-6 w-1 h-1 bg-gradient-to-r ${tech.color} rounded-full animate-pulse delay-${index * 500}`}
                                    ></div>
                                </div>

                                {/* Icon with enhanced animation */}
                                <div className='text-center mb-6'>
                                    <div
                                        className={`
                                        relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-r ${tech.color} 
                                        flex items-center justify-center shadow-lg group-hover:scale-110 
                                        transition-all duration-300 group-hover:rotate-6
                                    `}
                                    >
                                        <IconComponent className='w-10 h-10 text-white' />
                                        {/* Glow effect */}
                                        <div
                                            className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${tech.color} opacity-0 group-hover:opacity-30 blur-lg transition-opacity duration-300`}
                                        ></div>

                                        {/* Rotating ring */}
                                        <div
                                            className={`absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r ${tech.color} opacity-0 group-hover:opacity-50 animate-spin-slow`}
                                        ></div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className='text-center space-y-4'>
                                    <h3 className='text-2xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 group-hover:bg-clip-text transition-all duration-300'>
                                        {tech.title}
                                    </h3>
                                    <p className='text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300'>
                                        {tech.description}
                                    </p>

                                    {/* Features list */}
                                    <div className='space-y-2 pt-4'>
                                        {tech.features.map(
                                            (feature, featureIndex) => (
                                                <div
                                                    key={featureIndex}
                                                    className='flex items-center justify-center space-x-2 text-sm text-gray-500 group-hover:text-gray-400 transition-colors duration-300'
                                                >
                                                    <div
                                                        className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${tech.color}`}
                                                    ></div>
                                                    <span>{feature}</span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Hover effect overlay */}
                                <div className='absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none'></div>

                                {/* Bottom accent line */}
                                <div
                                    className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${tech.color} rounded-b-2xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center`}
                                ></div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Additional tech stack showcase */}
            <div
                className={`mt-16 transition-all duration-1000 delay-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
                <div className='bg-gradient-to-r from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/30 rounded-2xl p-8'>
                    <div className='text-center mb-8'>
                        <h3 className='text-2xl font-bold text-white mb-2'>
                            {t("stack.title")}
                        </h3>
                        <p className='text-gray-400'>{t("stack.desc")}</p>
                    </div>

                    <div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
                        {[
                            {
                                icon: Database,
                                name: "Supabase",
                                color: "from-green-400 to-emerald-500",
                            },
                            {
                                icon: Lock,
                                name: "Security",
                                color: "from-blue-400 to-cyan-500",
                            },
                            {
                                icon: Wifi,
                                name: "Real-time",
                                color: "from-purple-400 to-pink-500",
                            },
                            {
                                icon: Cpu,
                                name: "AI/ML",
                                color: "from-orange-400 to-red-500",
                            },
                        ].map((item, index) => {
                            const IconComponent = item.icon
                            return (
                                <div key={index} className='text-center group'>
                                    <div
                                        className={`
                                        w-16 h-16 mx-auto mb-3 rounded-xl bg-gradient-to-r ${item.color} 
                                        flex items-center justify-center shadow-lg group-hover:scale-110 
                                        transition-all duration-300
                                    `}
                                    >
                                        <IconComponent className='w-8 h-8 text-white' />
                                    </div>
                                    <span className='text-sm text-gray-400 group-hover:text-white transition-colors duration-300'>
                                        {
                                            (t.raw("stack.items") as string[])[
                                                index
                                            ]
                                        }
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
