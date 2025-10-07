"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface WitchHatProps {
    className?: string
    size?: "sm" | "md" | "lg"
}

export function WitchHat({ className, size = "md" }: WitchHatProps) {
    const [isAnimating, setIsAnimating] = useState(false)

    useEffect(() => {
        const interval = setInterval(() => {
            setIsAnimating(true)
            // Reset animation after it completes
            setTimeout(() => setIsAnimating(false), 4000)
        }, 15000) // Repeat every 15 seconds

        return () => clearInterval(interval)
    }, [])

    const sizeClasses = {
        sm: "w-6 h-6",
        md: "w-8 h-8", 
        lg: "w-12 h-12"
    }

    return (
        <div className={cn("relative", className)}>
            {/* Magical aura effect */}
            {isAnimating && (
                <div className="absolute inset-0 -m-2 rounded-full bg-primary/20 animate-ping" />
            )}
            
            <Image
                src="/assets/logo.png"
                alt="Witch Hat Logo"
                width={32}
                height={32}
                className={cn(
                    "transition-all duration-300 relative z-10 object-contain",
                    sizeClasses[size],
                    isAnimating && "drop-shadow-lg"
                )}
                style={{
                    animation: isAnimating 
                        ? "witchHatDance 4s ease-in-out" 
                        : "none",
                    filter: isAnimating ? "drop-shadow(0 0 8px currentColor)" : "none"
                }}
            />
            
            {/* Custom keyframes for the witch hat dance */}
            <style jsx>{`
                @keyframes witchHatDance {
                    0% { 
                        transform: translateY(0) rotate(0deg) scale(1);
                        filter: drop-shadow(0 0 0px currentColor);
                    }
                    5% { 
                        transform: translateY(-2px) rotate(-2deg) scale(1.05);
                        filter: drop-shadow(0 0 4px currentColor);
                    }
                    10% { 
                        transform: translateY(-4px) rotate(-5deg) scale(1.1);
                        filter: drop-shadow(0 0 6px currentColor);
                    }
                    15% { 
                        transform: translateY(-2px) rotate(3deg) scale(1.05);
                        filter: drop-shadow(0 0 4px currentColor);
                    }
                    20% { 
                        transform: translateY(0) rotate(5deg) scale(1);
                        filter: drop-shadow(0 0 2px currentColor);
                    }
                    25% { 
                        transform: translateY(-3px) rotate(-3deg) scale(1.08);
                        filter: drop-shadow(0 0 5px currentColor);
                    }
                    30% { 
                        transform: translateY(0) rotate(3deg) scale(1);
                        filter: drop-shadow(0 0 2px currentColor);
                    }
                    35% { 
                        transform: translateY(-5px) rotate(-4deg) scale(1.12);
                        filter: drop-shadow(0 0 7px currentColor);
                    }
                    40% { 
                        transform: translateY(-2px) rotate(4deg) scale(1.05);
                        filter: drop-shadow(0 0 4px currentColor);
                    }
                    45% { 
                        transform: translateY(0) rotate(-2deg) scale(1);
                        filter: drop-shadow(0 0 2px currentColor);
                    }
                    50% { 
                        transform: translateY(-6px) rotate(-8deg) scale(1.15);
                        filter: drop-shadow(0 0 8px currentColor);
                    }
                    55% { 
                        transform: translateY(-3px) rotate(6deg) scale(1.08);
                        filter: drop-shadow(0 0 5px currentColor);
                    }
                    60% { 
                        transform: translateY(-2px) rotate(8deg) scale(1.05);
                        filter: drop-shadow(0 0 4px currentColor);
                    }
                    65% { 
                        transform: translateY(0) rotate(-3deg) scale(1);
                        filter: drop-shadow(0 0 2px currentColor);
                    }
                    70% { 
                        transform: translateY(-4px) rotate(4deg) scale(1.1);
                        filter: drop-shadow(0 0 6px currentColor);
                    }
                    75% { 
                        transform: translateY(-2px) rotate(-2deg) scale(1.05);
                        filter: drop-shadow(0 0 4px currentColor);
                    }
                    80% { 
                        transform: translateY(0) rotate(2deg) scale(1);
                        filter: drop-shadow(0 0 2px currentColor);
                    }
                    85% { 
                        transform: translateY(-3px) rotate(-3deg) scale(1.08);
                        filter: drop-shadow(0 0 5px currentColor);
                    }
                    90% { 
                        transform: translateY(0) rotate(1deg) scale(1);
                        filter: drop-shadow(0 0 2px currentColor);
                    }
                    95% { 
                        transform: translateY(-1px) rotate(-1deg) scale(1.02);
                        filter: drop-shadow(0 0 3px currentColor);
                    }
                    100% { 
                        transform: translateY(0) rotate(0deg) scale(1);
                        filter: drop-shadow(0 0 0px currentColor);
                    }
                }
            `}</style>
        </div>
    )
}