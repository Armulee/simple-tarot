"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
    Sparkles, 
    Zap, 
    Heart, 
    Globe, 
    Star, 
    Users,
    ChevronDown
} from "lucide-react"

interface FeaturesSectionProps {
    onFeatureClick?: (featureId: string) => void
}

export function FeaturesSection({ onFeatureClick }: FeaturesSectionProps) {
    const [activeFeature, setActiveFeature] = useState<string | null>(null)

    const features = [
        {
            id: "tarot",
            icon: Sparkles,
            title: "AI Tarot Reading",
            description: "Get personalized tarot card readings powered by advanced AI",
            color: "from-purple-500 to-pink-500",
            gradient: "bg-gradient-to-br from-purple-500/20 to-pink-500/20",
            borderColor: "border-purple-500/30"
        },
        {
            id: "astrology",
            icon: Star,
            title: "Vedic Astrology",
            description: "Discover your cosmic blueprint with traditional Vedic wisdom",
            color: "from-blue-500 to-cyan-500",
            gradient: "bg-gradient-to-br from-blue-500/20 to-cyan-500/20",
            borderColor: "border-blue-500/30"
        },
        {
            id: "numerology",
            icon: Zap,
            title: "Numerology",
            description: "Unlock the hidden meanings in your life path numbers",
            color: "from-yellow-500 to-orange-500",
            gradient: "bg-gradient-to-br from-yellow-500/20 to-orange-500/20",
            borderColor: "border-yellow-500/30"
        },
        {
            id: "namelogy",
            icon: Globe,
            title: "Namelogy",
            description: "Explore the spiritual significance of your name",
            color: "from-green-500 to-emerald-500",
            gradient: "bg-gradient-to-br from-green-500/20 to-emerald-500/20",
            borderColor: "border-green-500/30"
        },
        {
            id: "colors",
            icon: Heart,
            title: "Lucky Colors",
            description: "Find colors that enhance your energy and fortune",
            color: "from-red-500 to-pink-500",
            gradient: "bg-gradient-to-br from-red-500/20 to-pink-500/20",
            borderColor: "border-red-500/30"
        },
        {
            id: "community",
            icon: Users,
            title: "Community",
            description: "Connect with like-minded spiritual seekers",
            color: "from-indigo-500 to-purple-500",
            gradient: "bg-gradient-to-br from-indigo-500/20 to-purple-500/20",
            borderColor: "border-indigo-500/30"
        }
    ]

    const handleFeatureClick = (featureId: string) => {
        setActiveFeature(featureId)
        onFeatureClick?.(featureId)
    }

    const handleScrollToInteractive = () => {
        // This will be handled by the parent component
        onFeatureClick?.("interactive")
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
            {/* Header */}
            <div className="pt-16 pb-8 text-center">
                <Badge variant="outline" className="mb-4 bg-white/10 border-white/20 text-white">
                    ✨ Spiritual Services
                </Badge>
                <h2 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4">
                    Discover Your
                    <span className="block text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
                        Cosmic Path
                    </span>
                </h2>
                <p className="text-xl text-white/70 max-w-2xl mx-auto px-4">
                    Explore our comprehensive suite of AI-powered spiritual guidance tools
                </p>
            </div>

            {/* Features Grid */}
            <div className="flex-1 px-6 pb-16">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        {features.map((feature) => {
                            const IconComponent = feature.icon
                            return (
                                <Card 
                                    key={feature.id}
                                    className={`cursor-pointer transition-all duration-300 hover:scale-105 bg-white/5 backdrop-blur-xl border-white/10 hover:border-white/20 group ${feature.borderColor} ${
                                        activeFeature === feature.id ? 'ring-2 ring-white/50 scale-105' : ''
                                    }`}
                                    onClick={() => handleFeatureClick(feature.id)}
                                >
                                    <CardContent className="p-6 text-center">
                                        <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${feature.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                                            <IconComponent className={`w-8 h-8 text-transparent bg-gradient-to-r ${feature.color} bg-clip-text`} />
                                        </div>
                                        <h3 className="text-xl font-semibold text-white mb-2">
                                            {feature.title}
                                        </h3>
                                        <p className="text-white/70 text-sm leading-relaxed">
                                            {feature.description}
                                        </p>
                                        <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                                                Explore
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    {/* Interactive Section CTA */}
                    <div className="text-center">
                        <Card className="max-w-2xl mx-auto bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-xl border-purple-500/20">
                            <CardContent className="p-8">
                                <h3 className="text-2xl font-bold text-white mb-4">
                                    Ready to Begin Your Journey?
                                </h3>
                                <p className="text-white/70 mb-6">
                                    Experience our interactive spiritual guidance tools and discover what the universe has in store for you.
                                </p>
                                <button
                                    onClick={handleScrollToInteractive}
                                    className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-semibold hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
                                >
                                    Try Interactive Demo
                                    <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform duration-300" />
                                </button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}