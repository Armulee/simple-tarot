"use client"

import {
    Sparkles,
    Calendar,
    Star,
    ArrowUpAZ,
    Hash,
    Palette,
    Hand,
    ChevronDown,
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
    onLearnMore?: () => void
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
    onLearnMore,
}: FeaturePaginationProps) {
    return (
        <div className='absolute bottom-[140px] md:bottom-[100px] left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-4 pointer-events-auto'>
            {/* Feature Icons */}
            <div className='flex items-center gap-3'>
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

            {/* Learn More Section */}
            <button
                type='button'
                className='flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors'
                onClick={onLearnMore}
            >
                <div className='flex items-center gap-4'>
                    <div className='h-px w-12 bg-white/30' />
                    <span className='text-xs uppercase tracking-wide'>
                        Learn more
                    </span>
                    <div className='h-px w-12 bg-white/30' />
                </div>
                <ChevronDown className='w-5 h-5 animate-bounce' />
            </button>
        </div>
    )
}
