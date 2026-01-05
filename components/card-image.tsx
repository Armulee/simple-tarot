"use client"

import Image from "next/image"
import { TarotCard } from "@/contexts/tarot-context"

interface CardImageProps {
    card: TarotCard
    className?: string
    size?: "sm" | "md" | "lg"
    showAura?: boolean
    showLabel?: boolean
}

export function CardImage({
    card,
    className = "",
    size = "md",
    showAura = false,
    showLabel = true,
}: CardImageProps) {
    const sizeClasses = {
        sm: "w-16",
        md: "w-24",
        lg: "w-32",
    }

    return (
        <div className={`relative ${sizeClasses[size]} ${className}`}>
            {/* Aura effect */}
            {showAura && (
                <div className='absolute inset-0 rounded-lg bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 blur-xl scale-110 opacity-60 animate-pulse'></div>
            )}

            <div
                className={`relative w-full rounded-lg overflow-hidden border-2 border-border/30 shadow-lg ${
                    showAura ? "shadow-primary/30 shadow-2xl" : ""
                }`}
            >
                <Image
                    src={`/${card.image}`}
                    alt={card.name}
                    width={0}
                    height={0}
                    className={`w-full h-auto object-contain transition-transform duration-300 ${
                        card.isReversed ? "rotate-180" : ""
                    }`}
                    sizes='(max-width: 768px) 64px, (max-width: 1024px) 96px, 128px'
                />
            </div>

            {showLabel && (
                <div className='mt-2 text-center'>
                    <p className='text-xs font-medium text-foreground truncate'>
                        {card.name}
                    </p>
                    {card.isReversed && (
                        <p className='text-xs text-red-400 font-medium'>
                            Reversed
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
