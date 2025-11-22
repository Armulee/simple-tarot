"use client"

import { TypewriterText } from "../../typewriter-text"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function BirthChart() {
    return (
        <>
            {/* Main Heading */}
            <div className='space-y-4'>
                <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance h-20 sm:h-24 md:h-28 lg:h-32'>
                    <TypewriterText
                        text="Decode your cosmic blueprint"
                        speed={60}
                        className='text-white'
                    />
                </h1>
            </div>

            {/* CTA Button */}
            <div className='flex flex-col gap-6 justify-center items-center pt-8'>
                <Link href="/birth-chart">
                    <Button
                        size="lg"
                        className='card-glow text-lg px-8 py-6'
                    >
                        Get Your Birth Chart
                    </Button>
                </Link>
            </div>
        </>
    )
}