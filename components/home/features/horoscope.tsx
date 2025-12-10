"use client"

import { Star, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

export default function Horoscope() {
    const router = useRouter()
    const t = useTranslations("Home")

    const handleGetHoroscope = () => {
        router.push("/horoscope")
    }

    return (
        <div className='space-y-4 text-center'>
            {/* Main Heading */}
            <div className='space-y-4'>
                <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance h-20 sm:h-24 md:h-28 lg:h-32'>
                    <span className='text-white'>Daily Horoscope</span>
                    <br />
                    <span className='text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text'>
                        AI-Powered Reading
                    </span>
                </h1>
            </div>

            {/* Icon */}
            <div className='flex justify-center pt-8'>
                <div className='w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-600/20 border border-yellow-400/30 flex items-center justify-center'>
                    <Star className="w-12 h-12 text-yellow-300" />
                </div>
            </div>

            {/* Description */}
            <p className='text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto'>
                Get personalized daily insights based on your birth chart and transit positions
            </p>

            {/* CTA Button */}
            <div className='flex justify-center pt-8'>
                <Button
                    onClick={handleGetHoroscope}
                    className='py-2 px-6 md:px-8 rounded-xl bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-yellow-600/20 backdrop-blur-xl border border-yellow-400/30 hover:border-yellow-400/50 text-white font-medium text-base shadow-[0_10px_30px_-10px_rgba(251,191,36,0.35)] hover:shadow-[0_10px_30px_-10px_rgba(251,191,36,0.5)] transition-all duration-300 flex items-center justify-center gap-2'
                >
                    <Sparkles className='w-5 h-5' />
                    Get Your Horoscope
                </Button>
            </div>
        </div>
    )
}