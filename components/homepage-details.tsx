"use client"

// import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
    Sparkles, 
    Brain, 
    Users, 
    Star,
    BookOpen,
    ArrowUpAZ,
    Hash,
    Palette,
    Heart,
    TrendingUp,
    Clock,
    Globe
} from "lucide-react"
import Link from "next/link"

interface HomepageDetailsProps {
    onFeatureClick?: (featureId: string) => void
}

export function HomepageDetails({ onFeatureClick }: HomepageDetailsProps) {

    const mainFeatures = [
        {
            id: "ai-powered",
            icon: <Brain className="w-8 h-8" />,
            title: "AI-Powered Insights",
            description: "Advanced artificial intelligence interprets your cards with personalized, meaningful guidance based on traditional tarot wisdom.",
            color: "from-blue-500 to-cyan-500",
            stats: "99.9% Accuracy"
        },
        {
            id: "cosmic-experience",
            icon: <Sparkles className="w-8 h-8" />,
            title: "Cosmic Experience",
            description: "Immerse yourself in a beautiful galaxy-themed interface with smooth animations and mystical atmosphere.",
            color: "from-purple-500 to-pink-500",
            stats: "10K+ Users"
        },
        {
            id: "personalized",
            icon: <Heart className="w-8 h-8" />,
            title: "Personal Journey",
            description: "Each reading is tailored to your unique questions and spiritual path for truly meaningful insights.",
            color: "from-pink-500 to-rose-500",
            stats: "100% Personalized"
        }
    ]

    const services = [
        {
            id: "tarot",
            icon: <BookOpen className="w-6 h-6" />,
            title: "Tarot Reading",
            description: "Ask your questions and let the cards reveal your destiny through ancient wisdom",
            status: "available",
            features: ["Multiple Spreads", "AI Interpretation", "Personal Guidance"]
        },
        {
            id: "astrology",
            icon: <Star className="w-6 h-6" />,
            title: "Astrology",
            description: "Discover your cosmic blueprint and how the stars influence your life path",
            status: "coming-soon",
            features: ["Birth Charts", "Planetary Influences", "Compatibility"]
        },
        {
            id: "numerology",
            icon: <Hash className="w-6 h-6" />,
            title: "Numerology",
            description: "Explore the mystical significance of numbers in your life journey",
            status: "coming-soon",
            features: ["Life Path Numbers", "Destiny Analysis", "Future Predictions"]
        },
        {
            id: "namelogy",
            icon: <ArrowUpAZ className="w-6 h-6" />,
            title: "Namelogy",
            description: "Uncover the hidden meanings and vibrations within your name",
            status: "coming-soon",
            features: ["Name Analysis", "Vibration Reading", "Life Path Insights"]
        },
        {
            id: "lucky-colors",
            icon: <Palette className="w-6 h-6" />,
            title: "Lucky Colors",
            description: "Find your personal color palette for luck, success, and harmony",
            status: "coming-soon",
            features: ["Color Palette", "Chakra Alignment", "Energy Balancing"]
        }
    ]

    const stats = [
        { icon: <Users className="w-6 h-6" />, label: "Active Users", value: "50K+" },
        { icon: <TrendingUp className="w-6 h-6" />, label: "Readings Given", value: "1M+" },
        { icon: <Clock className="w-6 h-6" />, label: "Response Time", value: "< 3s" },
        { icon: <Globe className="w-6 h-6" />, label: "Countries", value: "100+" }
    ]

    const handleFeatureClick = (featureId: string) => {
        onFeatureClick?.(featureId)
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-16 space-y-16">
            {/* Stats Section */}
            <div className="text-center space-y-8">
                <div className="space-y-4">
                    <h2 className="text-4xl font-bold text-white">
                        Trusted by Seekers Worldwide
                    </h2>
                    <p className="text-xl text-white/70 max-w-2xl mx-auto">
                        Join thousands of people who have discovered deeper insights about their path
                    </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {stats.map((stat, index) => (
                        <Card
                            key={index}
                            className="bg-gradient-to-br from-card/20 to-card/10 backdrop-blur-sm border border-white/20"
                        >
                            <CardContent className="p-6 text-center space-y-3">
                                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center border border-primary/30">
                                    {stat.icon}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                                    <p className="text-sm text-white/70">{stat.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Main Features */}
            <div className="space-y-12">
                <div className="text-center space-y-4">
                    <h2 className="text-4xl font-bold text-white">
                        Why Choose Asking Fate?
                    </h2>
                    <p className="text-xl text-white/70 max-w-2xl mx-auto">
                        Experience the perfect blend of ancient wisdom and modern technology
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {mainFeatures.map((feature) => (
                        <Card
                            key={feature.id}
                            className="bg-gradient-to-br from-card/20 to-card/10 backdrop-blur-sm border border-white/20 overflow-hidden hover:border-primary/50 transition-all duration-300 group cursor-pointer"
                            onClick={() => handleFeatureClick(feature.id)}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center text-white shadow-lg`}>
                                        {feature.icon}
                                    </div>
                                    <Badge variant="outline" className="bg-white/10 text-white/80 border-white/20">
                                        {feature.stats}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <CardTitle className="text-xl text-white group-hover:text-primary transition-colors">
                                    {feature.title}
                                </CardTitle>
                                <p className="text-white/80 leading-relaxed">
                                    {feature.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Services Section */}
            <div className="space-y-12">
                <div className="text-center space-y-4">
                    <h2 className="text-4xl font-bold text-white">
                        Mystical Services
                    </h2>
                    <p className="text-xl text-white/70 max-w-2xl mx-auto">
                        Explore our range of AI-powered mystical services
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service) => (
                        <Card
                            key={service.id}
                            className={`
                                bg-gradient-to-br from-card/20 to-card/10 backdrop-blur-sm 
                                border border-white/20 overflow-hidden transition-all duration-300
                                ${service.status === 'available' 
                                    ? 'hover:border-primary/50 cursor-pointer group' 
                                    : 'opacity-75 cursor-not-allowed'
                                }
                            `}
                            onClick={() => service.status === 'available' && handleFeatureClick(service.id)}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <div className={`
                                        w-12 h-12 rounded-full flex items-center justify-center text-white
                                        ${service.status === 'available' 
                                            ? 'bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30' 
                                            : 'bg-white/10 border border-white/20'
                                        }
                                    `}>
                                        {service.icon}
                                    </div>
                                    <Badge 
                                        variant="outline" 
                                        className={
                                            service.status === 'available' 
                                                ? 'bg-primary/10 text-primary border-primary/30' 
                                                : 'bg-white/10 text-white/60 border-white/20'
                                        }
                                    >
                                        {service.status === 'available' ? 'Available' : 'Coming Soon'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <CardTitle className={`text-lg ${service.status === 'available' ? 'text-white group-hover:text-primary transition-colors' : 'text-white/70'}`}>
                                        {service.title}
                                    </CardTitle>
                                    <p className="text-white/70 text-sm leading-relaxed mt-2">
                                        {service.description}
                                    </p>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                    {service.features.map((feature, idx) => (
                                        <Badge
                                            key={idx}
                                            variant="outline"
                                            className="bg-white/5 text-white/60 border-white/10 text-xs"
                                        >
                                            {feature}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div className="text-center space-y-8 py-12">
                <div className="space-y-4">
                    <h2 className="text-4xl font-bold text-white">
                        Ready to Begin Your Journey?
                    </h2>
                    <p className="text-xl text-white/70 max-w-2xl mx-auto">
                        Join thousands of seekers who have discovered deeper insights about their path through our AI-powered readings.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/reading">
                        <Button
                            size="lg"
                            className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-8 py-4 rounded-full shadow-lg shadow-primary/25"
                        >
                            <Sparkles className="w-6 h-6 mr-2" />
                            Start Your First Reading
                        </Button>
                    </Link>
                    
                    <Link href="/about">
                        <Button
                            variant="outline"
                            size="lg"
                            className="border-white/30 text-white hover:bg-white/10 px-8 py-4 rounded-full"
                        >
                            Learn More
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}