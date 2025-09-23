"use client"

import { useState, useEffect } from "react"
import { TypewriterText } from "./typewriter-text"
import { Card, CardContent } from "./ui/card"
import { 
    MessageCircle, 
    SquareStack, 
    Sparkles,
    ArrowRight,
    Play
} from "lucide-react"

interface EnhancedTypewriterTextProps {
    text: string
    speed?: number
    className?: string
    delay?: number
    onComplete?: () => void
}

interface Step {
    icon: React.ReactNode
    title: string
    description: string
    color: string
}

const steps: Step[] = [
    {
        icon: <MessageCircle className="w-6 h-6" />,
        title: "Ask Your Question",
        description: "Enter your curious question about the future, past, or present",
        color: "from-blue-500 to-cyan-500"
    },
    {
        icon: <SquareStack className="w-6 h-6" />,
        title: "Choose Your Cards",
        description: "Select the spreading cards that resonate with your intuition",
        color: "from-purple-500 to-pink-500"
    },
    {
        icon: <Sparkles className="w-6 h-6" />,
        title: "Receive Guidance",
        description: "Get your personalized AI interpretation based on your question and cards",
        color: "from-amber-500 to-orange-500"
    }
]

export function EnhancedTypewriterText({
    text,
    speed = 60,
    className = "",
    delay = 0,
    onComplete
}: EnhancedTypewriterTextProps) {
    const [showSteps, setShowSteps] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)

    useEffect(() => {
        // Show steps after initial text is complete
        const timer = setTimeout(() => {
            setShowSteps(true)
            onComplete?.()
        }, (text.length * speed) + delay + 3000) // 3 seconds after completion

        return () => clearTimeout(timer)
    }, [text, speed, delay, onComplete])

    const handlePlaySteps = () => {
        setIsPlaying(true)
        setCurrentStep(0)
        
        // Animate through steps
        const stepInterval = setInterval(() => {
            setCurrentStep(prev => {
                if (prev >= steps.length - 1) {
                    clearInterval(stepInterval)
                    setIsPlaying(false)
                    return prev
                }
                return prev + 1
            })
        }, 2000)
    }

    return (
        <div className="space-y-8">
            {/* Initial Typewriter Text */}
            <div className={className}>
                <TypewriterText
                    text={text}
                    speed={speed}
                    delay={delay}
                />
            </div>

            {/* Steps Section */}
            {showSteps && (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-bold text-white">
                            How It Works
                        </h3>
                        <p className="text-white/70">
                            Follow these simple steps to unlock your destiny
                        </p>
                    </div>

                    {/* Play Button */}
                    <div className="flex justify-center">
                        <button
                            onClick={handlePlaySteps}
                            disabled={isPlaying}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300
                                ${isPlaying 
                                    ? 'bg-white/10 text-white/50 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-lg shadow-primary/25 hover:shadow-primary/35'
                                }
                            `}
                        >
                            {isPlaying ? (
                                <>
                                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    Playing...
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5" />
                                    Play Demo
                                </>
                            )}
                        </button>
                    </div>

                    {/* Steps Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        {steps.map((step, index) => {
                            const isActive = isPlaying ? currentStep >= index : true
                            const isCurrent = isPlaying && currentStep === index
                            
                            return (
                                <Card
                                    key={index}
                                    className={`
                                        bg-gradient-to-br from-card/20 to-card/10 backdrop-blur-sm 
                                        border border-white/20 overflow-hidden transition-all duration-500
                                        ${isActive 
                                            ? isCurrent 
                                                ? 'scale-105 shadow-2xl shadow-primary/20 border-primary/50' 
                                                : 'scale-100 shadow-lg shadow-white/10'
                                            : 'scale-95 opacity-50'
                                        }
                                    `}
                                >
                                    <CardContent className="p-6 text-center space-y-4">
                                        {/* Step Number */}
                                        <div className={`
                                            w-12 h-12 mx-auto rounded-full flex items-center justify-center
                                            bg-gradient-to-r ${step.color} text-white font-bold text-lg
                                            shadow-lg
                                            ${isCurrent ? 'animate-pulse' : ''}
                                        `}>
                                            {index + 1}
                                        </div>

                                        {/* Step Icon */}
                                        <div className={`
                                            w-16 h-16 mx-auto rounded-full flex items-center justify-center
                                            bg-white/10 border-2 border-white/20
                                            transition-all duration-300
                                            ${isCurrent ? 'scale-110 border-primary/50 bg-primary/10' : ''}
                                        `}>
                                            {step.icon}
                                        </div>

                                        {/* Step Content */}
                                        <div className="space-y-2">
                                            <h4 className={`
                                                font-bold text-lg
                                                ${isCurrent ? 'text-primary' : 'text-white'}
                                            `}>
                                                {step.title}
                                            </h4>
                                            <p className="text-white/80 text-sm leading-relaxed">
                                                {step.description}
                                            </p>
                                        </div>

                                        {/* Arrow (except last step) */}
                                        {index < steps.length - 1 && (
                                            <div className="hidden md:block">
                                                <ArrowRight className={`
                                                    w-6 h-6 mx-auto
                                                    ${isActive ? 'text-primary' : 'text-white/30'}
                                                `} />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    {/* CTA */}
                    <div className="text-center pt-4">
                        <p className="text-white/70 text-sm">
                            Ready to begin your mystical journey?
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}