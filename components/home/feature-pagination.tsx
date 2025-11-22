"use client"

import {
    Sparkles,
    Calendar,
    Star,
    ArrowUpAZ,
    Hash,
    Palette,
    Hand,
    type LucideIcon,
} from "lucide-react"

interface Feature {
    id: string
    component: React.ComponentType
    available: boolean
}

interface FeaturePaginationProps {
    features: Feature[]
    activeIndex: number
    onDotClick: (index: number) => void
}

// Map feature IDs to their icons
const featureIcons: Record<string, LucideIcon> = {
    tarot: Sparkles,
    birthChart: Calendar,
    horoscope: Star,
    namelogy: ArrowUpAZ,
    numelogy: Hash,
    luckyColors: Palette,
    palmistry: Hand,
}

export default function FeaturePagination({
    features,
    activeIndex,
    onDotClick,
}: FeaturePaginationProps) {
    return (
        <div className='absolute bottom-24 md:bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3'>
            {features.map((feature, index) => {
                const Icon = featureIcons[feature.id] || Sparkles
                const isActive = index === activeIndex

                return (
                    <button
                        key={feature.id}
                        type='button'
                        onClick={() => onDotClick(index)}
                        className={`transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent rounded-full p-2 ${
                            isActive
                                ? "bg-white/20 scale-110"
                                : "hover:bg-white/10 hover:scale-105 opacity-60"
                        }`}
                        aria-label={`Go to ${feature.id}`}
                    >
                        <Icon
                            className={`w-4 h-4 ${
                                isActive ? "text-white" : "text-white/70"
                            }`}
                        />
                    </button>
                )
            })}
        </div>
    )
}
