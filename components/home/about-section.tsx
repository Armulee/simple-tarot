"use client"

import { 
    BookOpen, 
    Calendar, 
    Star, 
    ArrowUpAZ, 
    Hash, 
    Palette, 
    Hand,
    Sparkles,
    Shield,
    Zap,
    Heart,
    Globe,
    Target,
    Clock,
    CheckCircle
} from "lucide-react"

export default function AboutSection() {
    const services = [
        {
            id: "tarot",
            name: "AI Tarot Reading",
            description: "Get personalized tarot card readings powered by advanced AI technology",
            icon: BookOpen,
            status: "Available",
            color: "from-primary to-secondary"
        },
        {
            id: "birthChart",
            name: "Birth Chart Analysis",
            description: "Discover your cosmic blueprint through detailed astrological birth chart analysis",
            icon: Calendar,
            status: "Coming Soon",
            color: "from-purple-400 to-indigo-500"
        },
        {
            id: "horoscope",
            name: "Daily Horoscope",
            description: "Receive personalized daily insights based on your zodiac sign and planetary movements",
            icon: Star,
            status: "Coming Soon",
            color: "from-yellow-400 to-orange-500"
        },
        {
            id: "namelogy",
            name: "Namelogy",
            description: "Uncover the hidden meanings and vibrations behind names through ancient letter analysis",
            icon: ArrowUpAZ,
            status: "Coming Soon",
            color: "from-emerald-400 to-teal-500"
        },
        {
            id: "numerology",
            name: "Numerology",
            description: "Decode the mystical significance of numbers in your life through numerological wisdom",
            icon: Hash,
            status: "Coming Soon",
            color: "from-rose-400 to-pink-500"
        },
        {
            id: "luckyColors",
            name: "Lucky Colors",
            description: "Discover your personal color palette for luck, success, and positive energy",
            icon: Palette,
            status: "Coming Soon",
            color: "from-violet-400 to-purple-500"
        },
        {
            id: "palmistry",
            name: "Palmistry",
            description: "Read the lines of destiny written in your palms through ancient palm reading wisdom",
            icon: Hand,
            status: "Coming Soon",
            color: "from-amber-400 to-yellow-500"
        }
    ]

    const roadmap = [
        {
            phase: "Phase 1",
            title: "Core Platform",
            status: "Completed",
            features: ["AI Tarot Reading", "User Authentication", "Payment System", "Mobile Responsive Design"]
        },
        {
            phase: "Phase 2",
            title: "Astrological Services",
            status: "In Development",
            features: ["Birth Chart Analysis", "Daily Horoscope", "Compatibility Reports"]
        },
        {
            phase: "Phase 3",
            title: "Name & Number Analysis",
            status: "Planned",
            features: ["Namelogy", "Numerology", "Lucky Numbers & Colors"]
        },
        {
            phase: "Phase 4",
            title: "Advanced Features",
            status: "Planned",
            features: ["Palmistry", "Dream Interpretation", "Crystal Guidance", "Community Features"]
        }
    ]

    const values = [
        {
            icon: Shield,
            title: "Privacy First",
            description: "Your personal data and readings are completely private and secure"
        },
        {
            icon: Heart,
            title: "Authentic Guidance",
            description: "Combining ancient wisdom with modern AI for genuine spiritual insights"
        },
        {
            icon: Globe,
            title: "Accessible to All",
            description: "Making mystical guidance available to everyone, everywhere"
        },
        {
            icon: Zap,
            title: "Instant Access",
            description: "Get your readings and insights immediately, 24/7"
        }
    ]

    return (
        <div className="w-full min-h-screen bg-gradient-to-b from-gray-900 to-black">
            <div className="max-w-6xl mx-auto px-8 pt-24 pb-16 space-y-16">
                {/* Header */}
                <div className="text-center space-y-6">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-white">
                        About <span className="text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">Asking Fate</span>
                    </h1>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                        We&apos;re revolutionizing spiritual guidance by combining ancient mystical wisdom with cutting-edge AI technology, making personalized insights accessible to everyone.
                    </p>
                </div>

                {/* Mission Statement */}
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur-sm border border-primary/20 rounded-2xl p-8">
                    <div className="text-center space-y-4">
                        <Target className="w-16 h-16 text-primary mx-auto" />
                        <h2 className="text-3xl font-bold text-white">Our Mission</h2>
                        <p className="text-lg text-gray-300 max-w-4xl mx-auto">
                            To democratize access to spiritual guidance by creating an AI-powered platform that provides authentic, personalized mystical insights. We believe everyone deserves access to the wisdom that can help them navigate life&apos;s journey with clarity and purpose.
                        </p>
                    </div>
                </div>

                {/* Services Grid */}
                <div className="space-y-8">
                    <h2 className="text-3xl font-bold text-white text-center">Our Services</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {services.map((service) => {
                            const IconComponent = service.icon
                            return (
                                <div key={service.id} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-primary/30 transition-all duration-300">
                                    <div className="flex items-center space-x-4 mb-4">
                                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${service.color} flex items-center justify-center`}>
                                            <IconComponent className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                                            <span className={`text-sm px-2 py-1 rounded-full ${
                                                service.status === 'Available' 
                                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            }`}>
                                                {service.status}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-gray-400 text-sm">{service.description}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Roadmap */}
                <div className="space-y-8">
                    <h2 className="text-3xl font-bold text-white text-center">Development Roadmap</h2>
                    <div className="space-y-6">
                        {roadmap.map((phase) => (
                            <div key={phase.phase} className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            phase.status === 'Completed' 
                                                ? 'bg-green-500/20 border border-green-500/30' 
                                                : phase.status === 'In Development'
                                                ? 'bg-blue-500/20 border border-blue-500/30'
                                                : 'bg-gray-500/20 border border-gray-500/30'
                                        }`}>
                                            {phase.status === 'Completed' ? (
                                                <CheckCircle className="w-5 h-5 text-green-400" />
                                            ) : phase.status === 'In Development' ? (
                                                <Clock className="w-5 h-5 text-blue-400" />
                                            ) : (
                                                <Target className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-white">{phase.phase}: {phase.title}</h3>
                                            <span className={`text-sm px-3 py-1 rounded-full ${
                                                phase.status === 'Completed' 
                                                    ? 'bg-green-500/20 text-green-400' 
                                                    : phase.status === 'In Development'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-gray-500/20 text-gray-400'
                                            }`}>
                                                {phase.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {phase.features.map((feature, featureIndex) => (
                                        <div key={featureIndex} className="flex items-center space-x-2">
                                            <Sparkles className="w-4 h-4 text-primary" />
                                            <span className="text-gray-300 text-sm">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Values */}
                <div className="space-y-8">
                    <h2 className="text-3xl font-bold text-white text-center">Our Values</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {values.map((value, index) => {
                            const IconComponent = value.icon
                            return (
                                <div key={index} className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 text-center">
                                    <IconComponent className="w-12 h-12 text-primary mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-white mb-2">{value.title}</h3>
                                    <p className="text-gray-400">{value.description}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Technology Stack */}
                <div className="space-y-8">
                    <h2 className="text-3xl font-bold text-white text-center">Technology & Innovation</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 text-center">
                            <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">AI-Powered</h3>
                            <p className="text-gray-400">Advanced machine learning algorithms provide personalized and accurate readings</p>
                        </div>
                        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 text-center">
                            <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Secure & Private</h3>
                            <p className="text-gray-400">End-to-end encryption ensures your personal data and readings remain confidential</p>
                        </div>
                        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 text-center">
                            <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Global Access</h3>
                            <p className="text-gray-400">Available worldwide with multi-language support and cultural adaptations</p>
                        </div>
                    </div>
                </div>

                {/* User Testimonials */}
                <div className="space-y-8">
                    <h2 className="text-3xl font-bold text-white text-center">What Our Users Say</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6">
                            <p className="text-gray-300 italic mb-4">&quot;The AI tarot readings feel incredibly personal and accurate. It&apos;s like having a spiritual guide available 24/7.&quot;</p>
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                                    <span className="text-white font-semibold">S</span>
                                </div>
                                <div>
                                    <p className="text-white font-semibold">Sarah M.</p>
                                    <p className="text-gray-400 text-sm">Premium User</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6">
                            <p className="text-gray-300 italic mb-4">&quot;I love how the platform combines ancient wisdom with modern technology. The readings have helped me gain clarity in difficult times.&quot;</p>
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                                    <span className="text-white font-semibold">M</span>
                                </div>
                                <div>
                                    <p className="text-white font-semibold">Michael R.</p>
                                    <p className="text-gray-400 text-sm">Regular User</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics */}
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur-sm border border-primary/20 rounded-2xl p-8">
                    <h2 className="text-3xl font-bold text-white text-center mb-8">Platform Impact</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-4xl font-bold text-primary mb-2">50K+</div>
                            <div className="text-gray-300">Active Users</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-primary mb-2">1M+</div>
                            <div className="text-gray-300">Readings Completed</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-primary mb-2">98%</div>
                            <div className="text-gray-300">User Satisfaction</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                            <div className="text-gray-300">Available</div>
                        </div>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="bg-gradient-to-r from-primary/20 to-secondary/20 backdrop-blur-sm border border-primary/30 rounded-2xl p-8 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">Ready to Begin Your Journey?</h2>
                    <p className="text-lg text-gray-300 mb-6">
                        Join thousands of users who have discovered their path through our AI-powered mystical guidance.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button className="bg-gradient-to-r from-primary to-secondary text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
                            Start Your Reading
                        </button>
                        <button className="border border-primary/30 text-primary px-8 py-3 rounded-lg font-semibold hover:bg-primary/10 transition-colors">
                            Learn More
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center py-8 border-t border-gray-700/30">
                    <p className="text-gray-400">
                        © 2024 Asking Fate. All rights reserved. | Privacy Policy | Terms of Service
                    </p>
                </div>
            </div>
        </div>
    )
}