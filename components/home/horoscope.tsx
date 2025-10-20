"use client"

import { Star, Sparkles } from "lucide-react"

export default function Horoscope() {
    
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-8 px-8">
            {/* Icon and Coming Soon Badge */}
            <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-sm border border-yellow-400/30 flex items-center justify-center mb-6">
                    <Star className="w-16 h-16 text-yellow-300" />
                </div>
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    Coming Soon
                </div>
            </div>

            {/* Title */}
            <div className="space-y-4">
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-white">
                    Daily Horoscope
                </h2>
                <p className="text-lg sm:text-xl text-gray-300 max-w-2xl">
                    Get personalized daily insights based on your zodiac sign and current planetary movements
                </p>
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/10 backdrop-blur-sm border border-yellow-400/20 rounded-xl p-6">
                    <Sparkles className="w-8 h-8 text-yellow-300 mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">Daily Forecasts</h3>
                    <p className="text-sm text-gray-400">Personalized daily predictions and guidance</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/10 backdrop-blur-sm border border-yellow-400/20 rounded-xl p-6">
                    <Sparkles className="w-8 h-8 text-yellow-300 mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">Lucky Numbers</h3>
                    <p className="text-sm text-gray-400">Discover your lucky numbers for the day</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/10 backdrop-blur-sm border border-yellow-400/20 rounded-xl p-6">
                    <Sparkles className="w-8 h-8 text-yellow-300 mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">Compatibility</h3>
                    <p className="text-sm text-gray-400">Check compatibility with others</p>
                </div>
            </div>

            {/* Coming Soon Message */}
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm border border-amber-400/30 rounded-xl p-6 max-w-2xl">
                <p className="text-amber-200 text-lg font-medium">
                    ✨ Your daily cosmic guidance is being prepared by the stars. Get ready for personalized horoscope insights!
                </p>
            </div>
        </div>
    )
}