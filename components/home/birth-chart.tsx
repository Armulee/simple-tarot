"use client"

import { Calendar, Sparkles } from "lucide-react"

export default function BirthChart() {
    
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-8 px-8">
            {/* Icon and Coming Soon Badge */}
            <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-600/20 backdrop-blur-sm border border-purple-400/30 flex items-center justify-center mb-6">
                    <Calendar className="w-16 h-16 text-purple-300" />
                </div>
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    Coming Soon
                </div>
            </div>

            {/* Title */}
            <div className="space-y-4">
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-white">
                    Birth Chart
                </h2>
                <p className="text-lg sm:text-xl text-gray-300 max-w-2xl">
                    Discover your cosmic blueprint through personalized birth chart analysis
                </p>
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
                <div className="bg-gradient-to-br from-purple-500/10 to-indigo-600/10 backdrop-blur-sm border border-purple-400/20 rounded-xl p-6">
                    <Sparkles className="w-8 h-8 text-purple-300 mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">Planetary Positions</h3>
                    <p className="text-sm text-gray-400">Detailed analysis of planetary placements at birth</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500/10 to-indigo-600/10 backdrop-blur-sm border border-purple-400/20 rounded-xl p-6">
                    <Sparkles className="w-8 h-8 text-purple-300 mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">House Analysis</h3>
                    <p className="text-sm text-gray-400">Understanding life areas through astrological houses</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500/10 to-indigo-600/10 backdrop-blur-sm border border-purple-400/20 rounded-xl p-6">
                    <Sparkles className="w-8 h-8 text-purple-300 mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">Aspect Patterns</h3>
                    <p className="text-sm text-gray-400">Complex planetary relationships and their meanings</p>
                </div>
            </div>

            {/* Coming Soon Message */}
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm border border-amber-400/30 rounded-xl p-6 max-w-2xl">
                <p className="text-amber-200 text-lg font-medium">
                    🌟 This mystical feature is being crafted with cosmic precision. Stay tuned for your personalized birth chart experience!
                </p>
            </div>
        </div>
    )
}