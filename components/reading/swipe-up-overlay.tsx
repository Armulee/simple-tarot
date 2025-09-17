"use client"

import React, { useState, useEffect } from "react"
import { useTranslations } from "next-intl"

interface SwipeUpOverlayProps {
    isVisible: boolean
    onClose: () => void
    cardPosition?: {
        x: number
        y: number
        width: number
        height: number
    }
}

export function SwipeUpOverlay({ isVisible, onClose, cardPosition }: SwipeUpOverlayProps) {
    const t = useTranslations("ReadingPage.chooseCards")
    const [isAnimating, setIsAnimating] = useState(false)

    useEffect(() => {
        if (isVisible) {
            setIsAnimating(true)
            const timer = setTimeout(() => {
                setIsAnimating(false)
            }, 2000) // Animation duration
            return () => clearTimeout(timer)
        }
    }, [isVisible])

    if (!isVisible || !cardPosition) return null

    return (
        <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
        >
            {/* Highlight the selected card area */}
            <div
                className="absolute border-2 border-white/80 rounded-lg shadow-lg shadow-white/20"
                style={{
                    left: cardPosition.x - 4,
                    top: cardPosition.y - 4,
                    width: cardPosition.width + 8,
                    height: cardPosition.height + 8,
                }}
            >
                {/* Glow effect around the card */}
                <div className="absolute inset-0 rounded-lg bg-white/10 animate-pulse" />
            </div>

            {/* Swipe gesture positioned under the card */}
            <div
                className="absolute flex flex-col items-center space-y-2"
                style={{
                    left: cardPosition.x + cardPosition.width / 2,
                    top: cardPosition.y + cardPosition.height + 20,
                    transform: 'translateX(-50%)',
                }}
            >
                {/* Swipe up icon with animation */}
                <div className="relative">
                    <div
                        className={`w-12 h-12 border-2 border-white rounded-full flex items-center justify-center transition-all duration-1000 ${
                            isAnimating ? "animate-bounce" : ""
                        }`}
                    >
                        <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 11l5-5m0 0l5 5m-5-5v12"
                            />
                        </svg>
                    </div>
                    
                    {/* Swipe motion indicator */}
                    <div
                        className={`absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-6 bg-white/60 rounded-full transition-all duration-1000 ${
                            isAnimating ? "animate-pulse" : ""
                        }`}
                    />
                </div>

                {/* Instruction text */}
                <div className="text-center">
                    <p className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                        {t("swipeUpToSelect")}
                    </p>
                </div>
            </div>

            {/* Decorative elements around the card */}
            <div className="absolute pointer-events-none">
                <div 
                    className="w-2 h-2 bg-white/30 rounded-full animate-ping"
                    style={{
                        left: cardPosition.x - 20,
                        top: cardPosition.y + cardPosition.height / 2,
                    }}
                />
                <div 
                    className="w-1 h-1 bg-white/40 rounded-full animate-ping delay-300"
                    style={{
                        left: cardPosition.x + cardPosition.width + 10,
                        top: cardPosition.y + cardPosition.height / 2,
                    }}
                />
                <div 
                    className="w-1.5 h-1.5 bg-white/20 rounded-full animate-ping delay-700"
                    style={{
                        left: cardPosition.x + cardPosition.width / 2,
                        top: cardPosition.y - 20,
                    }}
                />
            </div>
        </div>
    )
}