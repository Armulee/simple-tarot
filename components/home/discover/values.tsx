"use client"

import { Shield, Heart, Globe, Zap } from "lucide-react"

export default function ValuesSection() {
    const values = [
        {
            icon: Shield,
            title: "Privacy First",
            description:
                "Your personal data and readings are completely private and secure",
        },
        {
            icon: Heart,
            title: "Authentic Guidance",
            description:
                "Combining ancient wisdom with modern AI for genuine spiritual insights",
        },
        {
            icon: Globe,
            title: "Accessible to All",
            description:
                "Making mystical guidance available to everyone, everywhere",
        },
        {
            icon: Zap,
            title: "Instant Access",
            description: "Get your readings and insights immediately, 24/7",
        },
    ]

    return (
        <div className='space-y-8'>
            <h2 className='text-3xl font-bold text-white text-center'>
                Our Values
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {values.map((value, index) => {
                    const IconComponent = value.icon
                    return (
                        <div
                            key={index}
                            className='bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 text-center'
                        >
                            <IconComponent className='w-12 h-12 text-primary mx-auto mb-4' />
                            <h3 className='text-xl font-semibold text-white mb-2'>
                                {value.title}
                            </h3>
                            <p className='text-gray-400'>{value.description}</p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
