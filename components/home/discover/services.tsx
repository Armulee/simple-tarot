"use client"

import {
    BookOpen,
    Calendar,
    Star,
    ArrowUpAZ,
    Hash,
    Palette,
    Hand,
} from "lucide-react"

export default function ServicesSection() {
    const services = [
        {
            id: "tarot",
            name: "AI Tarot Reading",
            description:
                "Get personalized tarot card readings powered by advanced AI technology",
            icon: BookOpen,
            status: "Available",
            color: "from-primary to-secondary",
        },
        {
            id: "birthChart",
            name: "Birth Chart Analysis",
            description:
                "Discover your cosmic blueprint through detailed astrological birth chart analysis",
            icon: Calendar,
            status: "Coming Soon",
            color: "from-purple-400 to-indigo-500",
        },
        {
            id: "horoscope",
            name: "Daily Horoscope",
            description:
                "Receive personalized daily insights based on your zodiac sign and planetary movements",
            icon: Star,
            status: "Coming Soon",
            color: "from-yellow-400 to-orange-500",
        },
        {
            id: "namelogy",
            name: "Namelogy",
            description:
                "Uncover the hidden meanings and vibrations behind names through ancient letter analysis",
            icon: ArrowUpAZ,
            status: "Coming Soon",
            color: "from-emerald-400 to-teal-500",
        },
        {
            id: "numerology",
            name: "Numerology",
            description:
                "Decode the mystical significance of numbers in your life through numerological wisdom",
            icon: Hash,
            status: "Coming Soon",
            color: "from-rose-400 to-pink-500",
        },
        {
            id: "luckyColors",
            name: "Lucky Colors",
            description:
                "Discover your personal color palette for luck, success, and positive energy",
            icon: Palette,
            status: "Coming Soon",
            color: "from-violet-400 to-purple-500",
        },
        {
            id: "palmistry",
            name: "Palmistry",
            description:
                "Read the lines of destiny written in your palms through ancient palm reading wisdom",
            icon: Hand,
            status: "Coming Soon",
            color: "from-amber-400 to-yellow-500",
        },
    ]

    return (
        <div className='space-y-8'>
            <h2 className='text-3xl font-bold text-white text-center'>
                Our Services
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {services.map((service) => {
                    const IconComponent = service.icon
                    return (
                        <div
                            key={service.id}
                            className='bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-primary/30 transition-all duration-300'
                        >
                            <div className='flex items-center space-x-4 mb-4'>
                                <div
                                    className={`w-12 h-12 rounded-lg bg-gradient-to-r ${service.color} flex items-center justify-center`}
                                >
                                    <IconComponent className='w-6 h-6 text-white' />
                                </div>
                                <div>
                                    <h3 className='text-lg font-semibold text-white'>
                                        {service.name}
                                    </h3>
                                    <span
                                        className={`text-sm px-2 py-1 rounded-full ${
                                            service.status === "Available"
                                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                        }`}
                                    >
                                        {service.status}
                                    </span>
                                </div>
                            </div>
                            <p className='text-gray-400 text-sm'>
                                {service.description}
                            </p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
