"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"

export function MinimalHomepage() {
    const [currentSlide, setCurrentSlide] = useState(0)
    
    const handleLearnMore = () => {
        setCurrentSlide(1)
    }
    
    const handleSwipeDown = () => {
        if (currentSlide < 2) {
            setCurrentSlide(currentSlide + 1)
        }
    }
    
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault()
        if (e.deltaY > 50 && currentSlide < 2) {
            setCurrentSlide(currentSlide + 1)
        }
    }
    
    if (currentSlide === 0) {
        return (
            <section 
                className='relative z-10 flex flex-col items-center justify-center h-screen px-6 text-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
                onWheel={handleWheel}
            >
                <div className='max-w-4xl w-full mx-auto space-y-8'>
                    {/* Main Heading */}
                    <div className='space-y-4 pt-20'>
                        <h1 className="font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance h-20 sm:h-24 md:h-28 lg:h-32">
                            <span className="text-white">Ask me anything</span>
                            <br />
                            <span className="text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
                                about your destiny
                            </span>
                        </h1>
                    </div>

                    {/* Question Input */}
                    <div className='flex flex-col gap-6 justify-center items-center pt-8 max-w-md mx-auto px-4'>
                        <div className='w-full'>
                            <div className="h-20 bg-white/10 rounded-lg flex items-center justify-center">
                                <span className="text-white">Question Input Placeholder</span>
                            </div>
                        </div>

                        <Button
                            onClick={handleLearnMore}
                            variant='ghost'
                            size='lg'
                            className='border-border/30 hover:bg-card/20 backdrop-blur-sm px-8 py-6 text-lg bg-transparent text-white hover:text-white/80'
                        >
                            Learn More
                        </Button>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                    <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
                        <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
                    </div>
                </div>
            </section>
        )
    }
    
    if (currentSlide === 1) {
        return (
            <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <h2 className="text-4xl font-bold mb-4">Features Section</h2>
                    <p className="text-xl mb-8">This would be the features grid</p>
                    <Button
                        onClick={handleSwipeDown}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        Continue
                    </Button>
                </div>
            </div>
        )
    }
    
    return (
        <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
            <div className="text-center text-white">
                <h2 className="text-4xl font-bold mb-4">Interactive Demo</h2>
                <p className="text-xl mb-8">This would be the interactive demo</p>
            </div>
        </div>
    )
}