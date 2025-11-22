"use client"

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

export default function FeaturePagination({
    features,
    activeIndex,
    onDotClick,
}: FeaturePaginationProps) {
    return (
        <div className='absolute bottom-24 md:bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5'>
            {features.map((feature, index) => (
                <button
                    key={feature.id}
                    type='button'
                    onClick={() => onDotClick(index)}
                    className='transition-all duration-200 hover:scale-125 focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent rounded-full p-1'
                    aria-label={`Go to ${feature.id}`}
                >
                    {index === activeIndex ? (
                        <div className='w-2 h-2 bg-white rounded-full' />
                    ) : (
                        <div className='w-2 h-2 border border-white/50 rounded-full bg-transparent' />
                    )}
                </button>
            ))}
        </div>
    )
}
