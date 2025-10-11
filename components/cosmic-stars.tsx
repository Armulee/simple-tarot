"use client"
import { useMemo, useEffect, useState } from "react"

interface Star {
    id: number
    size: "1px" | "2px"
    top: string
    left: string
    animation: string
    duration: string
}

const generateRandomStars = (count: number = 50): Star[] => {
    const animations = [
        "twinkle-1",
        "twinkle-2",
        "twinkle-3",
        "twinkle-4",
        "twinkle-5",
        "twinkle-6",
        "twinkle-7",
        "twinkle-8",
    ]
    const sizes: ("1px" | "2px")[] = ["1px", "2px"]
    const durations = [
        "3.2s",
        "3.4s",
        "3.6s",
        "3.8s",
        "4.0s",
        "4.2s",
        "4.4s",
        "4.6s",
        "4.8s",
        "5.0s",
        "5.2s",
    ]

    return Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        size: sizes[Math.floor(Math.random() * sizes.length)],
        top: `${Math.floor(Math.random() * 95) + 2}%`, // 2% to 97% to avoid edges
        left: `${Math.floor(Math.random() * 95) + 2}%`, // 2% to 97% to avoid edges
        animation: animations[Math.floor(Math.random() * animations.length)],
        duration: durations[Math.floor(Math.random() * durations.length)],
    }))
}

export default function CosmicStars() {
    const [isClient, setIsClient] = useState(false)
    const stars = useMemo(
        () => (isClient ? generateRandomStars(100) : []),
        [isClient]
    )

    useEffect(() => {
        setIsClient(true)
    }, [])

    if (!isClient) {
        return <div className='fixed inset-0 pointer-events-none z-[1]' />
    }

    return (
        <div className='fixed inset-0 pointer-events-none z-[1]'>
            {stars.map((star) => (
                <div
                    key={star.id}
                    className='absolute rounded-full pointer-events-none'
                    style={{
                        backgroundColor: "var(--cosmic-star-color)",
                        width: star.size,
                        height: star.size,
                        top: star.top,
                        left: star.left,
                        animation: `${star.animation} ${star.duration} ease-in-out infinite`,
                    }}
                />
            ))}
        </div>
    )
}
