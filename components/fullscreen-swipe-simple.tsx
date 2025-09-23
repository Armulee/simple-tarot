"use client"

import React, { useState, useRef, ReactNode } from "react"

interface FullscreenSwipeProps {
    children: ReactNode[]
}

export function FullscreenSwipe({ children }: FullscreenSwipeProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const startY = useRef(0)
    const currentY = useRef(0)
    const isDragging = useRef(false)

    const totalSlides = children.length

    const goToSlide = (index: number) => {
        if (index < 0 || index >= totalSlides || isTransitioning) return
        
        setIsTransitioning(true)
        setCurrentIndex(index)
        
        setTimeout(() => {
            setIsTransitioning(false)
        }, 500)
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY
        isDragging.current = true
        setIsTransitioning(false)
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current) return
        currentY.current = e.touches[0].clientY
        const deltaY = currentY.current - startY.current
        
        // Prevent default scrolling when swiping
        if (Math.abs(deltaY) > 10) {
            e.preventDefault()
        }
    }

    const handleTouchEnd = () => {
        if (!isDragging.current) return
        isDragging.current = false
        
        const deltaY = currentY.current - startY.current
        const threshold = 50

        if (Math.abs(deltaY) > threshold) {
            if (deltaY > 0 && currentIndex > 0) {
                // Swipe down - go to previous slide
                goToSlide(currentIndex - 1)
            } else if (deltaY < 0 && currentIndex < totalSlides - 1) {
                // Swipe up - go to next slide
                goToSlide(currentIndex + 1)
            }
        }
    }

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault()
        
        if (isTransitioning) return
        
        const deltaY = e.deltaY
        const threshold = 50

        if (Math.abs(deltaY) > threshold) {
            if (deltaY > 0 && currentIndex < totalSlides - 1) {
                // Scroll down - go to next slide
                goToSlide(currentIndex + 1)
            } else if (deltaY < 0 && currentIndex > 0) {
                // Scroll up - go to previous slide
                goToSlide(currentIndex - 1)
            }
        }
    }

    const handleLearnMore = () => {
        goToSlide(1)
    }

    React.useEffect(() => {
        const container = containerRef.current
        if (!container) return

        container.addEventListener('wheel', handleWheel, { passive: false })

        return () => {
            container.removeEventListener('wheel', handleWheel)
        }
    }, [currentIndex, isTransitioning])

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-screen overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ 
                    transform: `translateY(-${currentIndex * 100}vh)`,
                    height: `${totalSlides * 100}vh`
                }}
            >
                {children.map((child, index) => (
                    <div 
                        key={index}
                        className="w-full h-screen flex-shrink-0"
                        style={{ height: '100vh' }}
                    >
                        {/* Pass the handleLearnMore function to the first child (homepage) */}
                        {index === 0 && React.isValidElement(child) 
                            ? React.cloneElement(child as React.ReactElement<{onLearnMore?: () => void}>, { 
                                onLearnMore: handleLearnMore 
                              })
                            : child
                        }
                    </div>
                ))}
            </div>

            {/* Slide indicators */}
            <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-50 space-y-2">
                {Array.from({ length: totalSlides }).map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            index === currentIndex 
                                ? 'bg-white scale-125' 
                                : 'bg-white/30 hover:bg-white/50'
                        }`}
                    />
                ))}
            </div>
        </div>
    )
}