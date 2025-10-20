"use client"

import { Hash, Sparkles } from "lucide-react"

export default function Numelogy() {
    
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-8 px-8">
            {/* Icon and Coming Soon Badge */}
            <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-rose-500/20 to-pink-600/20 backdrop-blur-sm border border-rose-400/30 flex items-center justify-center mb-6">
                    <Hash className="w-16 h-16 text-rose-300" />
                </div>
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    Coming Soon
                </div>
            </div>

            {/* Title */}
            <div className="space-y-4">
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-white">
                    Numerology
                </h2>
                <p className="text-lg sm:text-xl text-gray-300 max-w-2xl">
                    Decode the mystical significance of numbers in your life through ancient numerological wisdom
                </p>
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
                <div className="bg-gradient-to-br from-rose-500/10 to-pink-600/10 backdrop-blur-sm border border-rose-400/20 rounded-xl p-6">
                    <Sparkles className="w-8 h-8 text-rose-300 mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">Life Path Number</h3>
                    <p className="text-sm text-gray-400">Discover your core life purpose and destiny</p>
                </div>
                <div className="bg-gradient-to-br from-rose-500/10 to-pink-600/10 backdrop-blur-sm border border-rose-400/20 rounded-xl p-6">
                    <Sparkles className="w-8 h-8 text-rose-300 mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">Expression Number</h3>
                    <p className="text-sm text-gray-400">Understand your talents and abilities</p>
                </div>
                <div className="bg-gradient-to-br from-rose-500/10 to-pink-600/10 backdrop-blur-sm border border-rose-400/20 rounded-xl p-6">
                    <Sparkles className="w-8 h-8 text-rose-300 mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">Soul Urge</h3>
                    <p className="text-sm text-gray-400">Explore your inner desires and motivations</p>
                </div>
            </div>

            {/* Coming Soon Message */}
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm border border-amber-400/30 rounded-xl p-6 max-w-2xl">
                <p className="text-amber-200 text-lg font-medium">
                    🔢 The ancient wisdom of numbers is being digitized. Unlock the secrets hidden in your birth date and name!
                </p>
            </div>
        </div>
    )
}