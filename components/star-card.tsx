import { Card } from "./ui/card"
import { Sparkle } from "lucide-react"
import { generateCardSparklePositions } from "@/lib/sparkle-positions"
import { useMemo } from "react"

const StarCard = ({ children }: { children: React.ReactNode }) => {
    // Generate random sparkle positions on each render
    const sparklePositions = useMemo(() => generateCardSparklePositions(10), [])

    return (
        <Card className='group relative overflow-hidden border border-yellow-400/30 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(234,179,8,0.4)] hover:shadow-[0_25px_80px_-25px_rgba(234,179,8,0.5)] transition-all duration-500 px-8 py-8'>
            {/* Beautiful ping orbs with random positions */}
            {sparklePositions.map((position, index) => (
                <Sparkle
                    key={index}
                    className='absolute rounded-full fill-yellow-400 opacity-50 animate-ping'
                    style={{
                        top: position.top,
                        left: position.left,
                        width: position.width,
                        height: position.height,
                        animationDelay: position.animationDelay,
                    }}
                />
            ))}

            {/* Enhanced Deep-space stars background */}
            <div className='pointer-events-none absolute inset-0 opacity-60'>
                <div className='cosmic-stars-layer-3' />
                <div className='cosmic-stars-layer-4' />
                <div className='cosmic-stars-layer-5' />
                <div className='cosmic-stars-layer-6' />
            </div>

            {/* Enhanced Golden aura effects */}
            <div className='pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-yellow-300/30 via-yellow-500/20 to-transparent blur-3xl animate-pulse' />
            <div className='pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-gradient-to-tl from-yellow-400/25 via-yellow-600/15 to-transparent blur-[120px] animate-pulse delay-1000' />
            <div className='pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-gradient-to-r from-amber-400/15 via-yellow-500/10 to-orange-500/15 blur-2xl animate-pulse delay-2000' />

            {children}
        </Card>
    )
}

export default StarCard
