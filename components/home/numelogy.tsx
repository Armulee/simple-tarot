"use client"

import { Hash } from "lucide-react"

export default function Numelogy() {
    return (
        <div className='space-y-4 text-center'>
            {/* Main Heading */}
            <div className='space-y-4'>
                <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance h-20 sm:h-24 md:h-28 lg:h-32'>
                    <span className='text-white'>Numerology</span>
                    <br />
                    <span className='text-transparent bg-gradient-to-r from-rose-400 to-pink-500 bg-clip-text'>
                        Coming Soon
                    </span>
                </h1>
            </div>

            {/* Icon */}
            <div className='flex justify-center pt-8'>
                <div className='w-24 h-24 rounded-full bg-gradient-to-br from-rose-500/20 to-pink-600/20 border border-rose-400/30 flex items-center justify-center'>
                    <Hash className="w-12 h-12 text-rose-300" />
                </div>
            </div>

            {/* Description */}
            <p className='text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto'>
                Decode the mystical significance of numbers in your life
            </p>
        </div>
    )
}