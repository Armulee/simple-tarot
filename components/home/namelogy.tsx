"use client"

import { ArrowUpAZ } from "lucide-react"

export default function Namelogy() {
    return (
        <div className='space-y-4 text-center'>
            {/* Main Heading */}
            <div className='space-y-4'>
                <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance h-20 sm:h-24 md:h-28 lg:h-32'>
                    <span className='text-white'>Namelogy</span>
                    <br />
                    <span className='text-transparent bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text'>
                        Coming Soon
                    </span>
                </h1>
            </div>

            {/* Icon */}
            <div className='flex justify-center pt-8'>
                <div className='w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-400/30 flex items-center justify-center'>
                    <ArrowUpAZ className="w-12 h-12 text-emerald-300" />
                </div>
            </div>

            {/* Description */}
            <p className='text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto'>
                Uncover the hidden meanings behind names through ancient letter analysis
            </p>
        </div>
    )
}