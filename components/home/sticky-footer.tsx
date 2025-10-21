"use client"

import { ChevronUp } from "lucide-react"

export default function StickyFooter() {
    const scrollToAbout = () => {
        // This will be handled by the parent swiper
        const event = new CustomEvent('scrollToAbout')
        window.dispatchEvent(event)
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 to-transparent backdrop-blur-sm border-t border-white/10">
            <div className="max-w-6xl mx-auto px-8 py-4">
                <div className="flex items-center justify-between">
                    <div className="text-white">
                        <p className="text-sm font-medium">Discover more about our platform</p>
                        <p className="text-xs text-gray-400">Swipe up to learn about our services and roadmap</p>
                    </div>
                    <button 
                        onClick={scrollToAbout}
                        className="flex items-center space-x-2 bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                    >
                        <span className="text-sm font-medium">Learn More</span>
                        <ChevronUp className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}