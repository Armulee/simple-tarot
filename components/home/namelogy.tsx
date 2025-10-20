"use client"

import { ArrowUpAZ, Sparkles } from "lucide-react"

export default function Namelogy() {
    
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-8 px-8">
            {/* Icon and Coming Soon Badge */}
            <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-600/20 backdrop-blur-sm border border-emerald-400/30 flex items-center justify-center mb-6">
                    <ArrowUpAZ className="w-16 h-16 text-emerald-300" />
                </div>
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    Coming Soon
                </div>
            </div>

            {/* Title */}
            <div className="space-y-4">
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-white">
                    Namelogy
                </h2>
                <p className="text-lg sm:text-xl text-gray-300 max-w-2xl">
                    Uncover the hidden meanings and vibrations behind names through ancient letter analysis
                </p>
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-600/10 backdrop-blur-sm border border-emerald-400/20 rounded-xl p-6">
                    <Sparkles className="w-8 h-8 text-emerald-300 mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">Name Analysis</h3>
                    <p className="text-sm text-gray-400">Deep dive into your name&apos;s spiritual meaning</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-600/10 backdrop-blur-sm border border-emerald-400/20 rounded-xl p-6">
                    <Sparkles className="w-8 h-8 text-emerald-300 mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">Letter Vibrations</h3>
                    <p className="text-sm text-gray-400">Understand the energy of each letter</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-600/10 backdrop-blur-sm border border-emerald-400/20 rounded-xl p-6">
                    <Sparkles className="w-8 h-8 text-emerald-300 mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">Name Compatibility</h3>
                    <p className="text-sm text-gray-400">Check name compatibility with others</p>
                </div>
            </div>

            {/* Coming Soon Message */}
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm border border-amber-400/30 rounded-xl p-6 max-w-2xl">
                <p className="text-amber-200 text-lg font-medium">
                    🔤 The ancient art of name analysis is being revived. Discover the hidden power in your name!
                </p>
            </div>
        </div>
    )
}