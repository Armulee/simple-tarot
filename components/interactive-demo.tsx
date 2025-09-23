"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
    Sparkles, 
    Star, 
    Zap, 
    Globe, 
    Heart, 
    Users,
    ArrowRight,
    RefreshCw
} from "lucide-react"

interface InteractiveDemoProps {
    selectedFeature?: string
}

export function InteractiveDemo({ selectedFeature }: InteractiveDemoProps) {
    const [currentFeature, setCurrentFeature] = useState(selectedFeature || "tarot")
    const [isAnimating, setIsAnimating] = useState(false)

    const features = {
        tarot: {
            icon: Sparkles,
            title: "AI Tarot Reading",
            description: "Ask any question and receive personalized guidance through ancient tarot wisdom",
            demo: "The cards reveal that new opportunities are approaching. Trust your intuition and take bold steps forward.",
            color: "from-purple-500 to-pink-500",
            gradient: "bg-gradient-to-br from-purple-500/20 to-pink-500/20"
        },
        astrology: {
            icon: Star,
            title: "Vedic Astrology",
            description: "Discover your cosmic blueprint and planetary influences",
            demo: "Your rising sign suggests strong leadership qualities. Mercury's current position indicates excellent communication opportunities.",
            color: "from-blue-500 to-cyan-500",
            gradient: "bg-gradient-to-br from-blue-500/20 to-cyan-500/20"
        },
        numerology: {
            icon: Zap,
            title: "Numerology",
            description: "Unlock the hidden meanings in your life path numbers",
            demo: "Your life path number 7 indicates deep spiritual wisdom and analytical thinking. This is a time for introspection and growth.",
            color: "from-yellow-500 to-orange-500",
            gradient: "bg-gradient-to-br from-yellow-500/20 to-orange-500/20"
        },
        namelogy: {
            icon: Globe,
            title: "Namelogy",
            description: "Explore the spiritual significance of your name",
            demo: "Your name carries the energy of transformation and renewal. It suggests you're meant to inspire positive change in others.",
            color: "from-green-500 to-emerald-500",
            gradient: "bg-gradient-to-br from-green-500/20 to-emerald-500/20"
        },
        colors: {
            icon: Heart,
            title: "Lucky Colors",
            description: "Find colors that enhance your energy and fortune",
            demo: "Your lucky colors are deep purple and silver. Wearing these colors will enhance your spiritual connection and intuition.",
            color: "from-red-500 to-pink-500",
            gradient: "bg-gradient-to-br from-red-500/20 to-pink-500/20"
        },
        community: {
            icon: Users,
            title: "Community",
            description: "Connect with like-minded spiritual seekers",
            demo: "Join our community of 10,000+ spiritual seekers sharing insights, experiences, and cosmic wisdom.",
            color: "from-indigo-500 to-purple-500",
            gradient: "bg-gradient-to-br from-indigo-500/20 to-purple-500/20"
        }
    }

    const handleFeatureChange = useCallback((featureId: string) => {
        if (featureId === currentFeature) return
        
        setIsAnimating(true)
        setTimeout(() => {
            setCurrentFeature(featureId)
            setIsAnimating(false)
        }, 300)
    }, [currentFeature])

    useEffect(() => {
        if (selectedFeature && selectedFeature !== currentFeature) {
            handleFeatureChange(selectedFeature)
        }
    }, [selectedFeature, currentFeature, handleFeatureChange])

    const currentFeatureData = features[currentFeature as keyof typeof features]
    const IconComponent = currentFeatureData.icon

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
            {/* Header */}
            <div className="pt-16 pb-8 text-center">
                <Badge variant="outline" className="mb-4 bg-white/10 border-white/20 text-white">
                    🎯 Interactive Demo
                </Badge>
                <h2 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4">
                    Experience
                    <span className="block text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
                        AI-Powered Guidance
                    </span>
                </h2>
                <p className="text-xl text-white/70 max-w-2xl mx-auto px-4">
                    Try our interactive spiritual guidance tools and see the magic in action
                </p>
            </div>

            {/* Interactive Demo */}
            <div className="flex-1 px-6 pb-16">
                <div className="max-w-4xl mx-auto">
                    {/* Feature Selector */}
                    <div className="flex flex-wrap justify-center gap-3 mb-8">
                        {Object.entries(features).map(([id, feature]) => {
                            const FeatureIcon = feature.icon
                            const isActive = id === currentFeature
                            return (
                                <button
                                    key={id}
                                    onClick={() => handleFeatureChange(id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                                        isActive 
                                            ? 'bg-white text-slate-900 shadow-lg' 
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                                >
                                    <FeatureIcon className="w-4 h-4" />
                                    <span className="text-sm font-medium">{feature.title}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Demo Card */}
                    <Card className={`${currentFeatureData.gradient} backdrop-blur-xl border-white/20 transition-all duration-500 ${
                        isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
                    }`}>
                        <CardContent className="p-8">
                            <div className="text-center mb-6">
                                <div className={`w-20 h-20 mx-auto mb-4 rounded-full ${currentFeatureData.gradient} flex items-center justify-center`}>
                                    <IconComponent className={`w-10 h-10 text-transparent bg-gradient-to-r ${currentFeatureData.color} bg-clip-text`} />
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-2">
                                    {currentFeatureData.title}
                                </h3>
                                <p className="text-white/70 text-lg">
                                    {currentFeatureData.description}
                                </p>
                            </div>

                            {/* Demo Result */}
                            <div className="bg-black/20 rounded-2xl p-6 mb-6 backdrop-blur-sm">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <Badge variant="secondary" className="mb-2 bg-white/10 text-white border-white/20">
                                            AI Response
                                        </Badge>
                                        <p className="text-white/90 leading-relaxed">
                                            {currentFeatureData.demo}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button 
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
                                >
                                    Start Full Reading
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                                <Button 
                                    variant="outline"
                                    className="border-white/20 text-white hover:bg-white/10 px-8 py-3 rounded-full font-semibold"
                                    onClick={() => handleFeatureChange(currentFeature)}
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Try Again
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Back to Top */}
                    <div className="text-center mt-12">
                        <button 
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-all duration-300 backdrop-blur-sm"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}