"use client"

import { BookOpen, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"

export default function ServicesSection() {
    const t = useTranslations("About.Services")
    const [hoveredCard, setHoveredCard] = useState<string | null>(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        setIsVisible(true)
    }, [])

    const services = [
        {
            id: "tarot",
            name: t("items.tarot.name"),
            description: t("items.tarot.description"),
            icon: BookOpen,
            status: t("status.available"),
            color: "from-primary to-secondary",
            glowColor: "shadow-primary/20",
        },
    ]

    return (
        <div className='space-y-12'>
            <div
                className={`text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
                <div className='inline-flex items-center gap-2 mb-4'>
                    <Sparkles className='w-6 h-6 text-accent animate-pulse' />
                    <span className='text-primary font-semibold text-sm uppercase tracking-wider'>
                        {t("subtitle") || "Mystical Services"}
                    </span>
                    <Sparkles className='w-6 h-6 text-accent animate-pulse' />
                </div>
                <h2 className='text-4xl md:text-5xl font-bold text-white mb-4'>
                    {t("title")}
                </h2>
                <p className='text-gray-400 max-w-2xl mx-auto text-lg'>
                    {t("description")}
                </p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
                {services.map((service, index) => {
                    const IconComponent = service.icon
                    const isAvailable = service.status === t("status.available")
                    const isComingSoon =
                        service.status === t("status.comingSoon")

                    return (
                        <div
                            key={service.id}
                            className={`group relative transition-all duration-700 delay-${index * 100} ${
                                isVisible
                                    ? "opacity-100 translate-y-0"
                                    : "opacity-0 translate-y-8"
                            }`}
                            onMouseEnter={() => setHoveredCard(service.id)}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div
                                className={`
                                relative bg-gradient-to-br from-gray-800/40 to-gray-900/60 
                                backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 
                                transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl
                                ${hoveredCard === service.id ? `shadow-2xl ${service.glowColor}` : "shadow-lg"}
                                ${isAvailable ? "ring-2 ring-primary/20" : ""}
                            `}
                            >
                                <div
                                    className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                                ></div>

                                <div className='absolute inset-0 overflow-hidden rounded-2xl'>
                                    <div
                                        className={`absolute top-2 right-2 w-1 h-1 bg-gradient-to-r ${service.color} rounded-full animate-ping delay-${index * 200}`}
                                    ></div>
                                    <div
                                        className={`absolute bottom-4 left-4 w-0.5 h-0.5 bg-gradient-to-r ${service.color} rounded-full animate-pulse delay-${index * 300}`}
                                    ></div>
                                </div>

                                <div className='flex items-start justify-between mb-6'>
                                    <div
                                        className={`
                                        relative w-16 h-16 rounded-2xl bg-gradient-to-r ${service.color} 
                                        flex items-center justify-center shadow-lg group-hover:scale-110 
                                        transition-all duration-300 group-hover:rotate-3
                                    `}
                                    >
                                        <IconComponent className='w-8 h-8 text-white' />
                                        <div
                                            className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${service.color} opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-300`}
                                        ></div>
                                    </div>

                                    {isComingSoon && (
                                        <div
                                            className={`
                                            px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300
                                            bg-amber-500/20 text-amber-400 border border-amber-500/30 group-hover:bg-amber-500/30
                                        `}
                                        >
                                            {service.status}
                                        </div>
                                    )}
                                </div>

                                <div className='space-y-4'>
                                    <h3 className='text-xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 group-hover:bg-clip-text transition-all duration-300'>
                                        {service.name}
                                    </h3>
                                    <p className='text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300'>
                                        {service.description}
                                    </p>
                                </div>

                                <div className='absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none'></div>

                                <div
                                    className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${service.color} rounded-b-2xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`}
                                ></div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
