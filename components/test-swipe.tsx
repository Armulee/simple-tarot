"use client"

import React, { useState } from "react"

export function TestSwipe() {
    const [currentSlide, setCurrentSlide] = useState(0)
    
    return (
        <div className="h-screen bg-red-500 flex items-center justify-center">
            <div className="text-white text-4xl">
                Slide {currentSlide + 1}
            </div>
        </div>
    )
}