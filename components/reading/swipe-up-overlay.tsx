"use client"

import React, { useState, useEffect } from "react"
import { useTranslations } from "next-intl"

interface SwipeUpOverlayProps {
    isVisible: boolean
    onClose: () => void
}

export function SwipeUpOverlay({ isVisible, onClose }: SwipeUpOverlayProps) {
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

    if (!isVisible) return null

    return (
        <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center"
            onClick={onClose}
        >
            <div className="relative flex flex-col items-center space-y-6 p-8">
                {/* Swipe up icon with animation */}
                <div className="relative">
                    <div
                        className={`w-16 h-16 border-2 border-white rounded-full flex items-center justify-center transition-all duration-1000 ${
                            isAnimating ? "animate-bounce" : ""
                        }`}
                    >
                        <svg
                            className="w-8 h-8 text-white"
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
                        className={`absolute -top-2 left-1/2 transform -translate-x-1/2 w-1 h-8 bg-white/60 rounded-full transition-all duration-1000 ${
                            isAnimating ? "animate-pulse" : ""
                        }`}
                    />
                </div>

                {/* Instruction text */}
                <div className="text-center space-y-2">
                    <p className="text-white text-lg font-medium">
                        {t("swipeUpToSelect")}
                    </p>
                    <p className="text-white/70 text-sm">
                        Click anywhere to close
                    </p>
                </div>

                {/* Decorative elements */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/30 rounded-full animate-ping" />
                    <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-white/40 rounded-full animate-ping delay-300" />
                    <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-white/20 rounded-full animate-ping delay-700" />
                    <div className="absolute bottom-1/4 right-1/3 w-1 h-1 bg-white/50 rounded-full animate-ping delay-1000" />
                </div>
            </div>
        </div>
    )
}