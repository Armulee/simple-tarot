"use client"

import { Hand, Sparkles } from "lucide-react"

export default function Palmistry() {
    
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-8 px-8">
            {/* Icon and Coming Soon Badge */}
            <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-600/20 backdrop-blur-sm border border-amber-400/30 flex items-center justify-center mb-6">
                    <Hand className="w-16 h-16 text-amber-300" />
                </div>
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    Coming Soon
                </div>
            </div>

            {/* Title */}
            <div className="space-y-4">
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-white">
                    Palmistry
                </h2>
                <p className="text-lg sm:text-xl text-gray-300 max-w-2xl">
                    Read the lines of destiny written in your palms through ancient palm reading wisdom
                </p>
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
                <div className="bg-gradient-to-br from-amber-500/10 to-yellow-600/10 backdrop-blur-sm border border-amber-400/20 rounded-xl p-6">
                    <Sparkles className="w-8 h-8 text-amber-300 mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">Life Line</h3>
                    <p className="text-sm text-gray-400">Analyze your life force and vitality</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/10 to-yellow-600/10 backdrop-blur-sm border border-amber-400/20 rounded-xl p-6">
                    <Sparkles className="w-8 h-8 text-amber-300 mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">Heart Line</h3>
                    <p className="text-sm text-gray-400">Understand your emotional nature and relationships</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/10 to-yellow-600/10 backdrop-blur-sm border border-amber-400/20 rounded-xl p-6">
                    <Sparkles className="w-8 h-8 text-amber-300 mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">Head Line</h3>
                    <p className="text-sm text-gray-400">Discover your mental abilities and approach to life</p>
                </div>
            </div>

            {/* Coming Soon Message */}
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm border border-amber-400/30 rounded-xl p-6 max-w-2xl">
                <p className="text-amber-200 text-lg font-medium">
                    ✋ The ancient art of palm reading is being digitized. Your destiny awaits in the lines of your hand!
                </p>
            </div>
        </div>
    )
}