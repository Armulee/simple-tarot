"use client"

import { useState, useRef, useEffect } from "react"
import { useTranslations } from "next-intl"
import { EnhancedTypewriterText } from "./enhanced-typewriter-text"
import { InteractiveServicesSwiper } from "./interactive-services-swiper"
import { HomepageDetails } from "./homepage-details"
import HomeQuestionWrapper from "./home-question-wrapper"
import { Button } from "@/components/ui/button"
import { 
    ChevronDown, 
    ArrowUp,
    MessageCircle,
    SquareStack,
    Brain
} from "lucide-react"
import Link from "next/link"
import { useService } from "@/contexts/service-context"

interface HomepageContainerProps {
    onServiceChange?: (serviceId: string) => void
}

export function HomepageContainer({ onServiceChange }: HomepageContainerProps) {
    const t = useTranslations("Home")
    const { setActiveService } = useService()
    const [currentSection, setCurrentSection] = useState<'hero' | 'interactive' | 'details'>('hero')
    const [showScrollIndicator, setShowScrollIndicator] = useState(true)
    const [isScrolling, setIsScrolling] = useState(false)
    
    const heroRef = useRef<HTMLDivElement>(null)
    const interactiveRef = useRef<HTMLDivElement>(null)
    const detailsRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Handle scroll effects
    useEffect(() => {
        const handleScroll = () => {
            if (isScrolling) return
            
            const container = containerRef.current
            if (!container) return

            const scrollTop = container.scrollTop
            const containerHeight = container.clientHeight

            // Calculate which section should be active
            if (scrollTop < containerHeight * 0.3) {
                setCurrentSection('hero')
            } else if (scrollTop < containerHeight * 1.3) {
                setCurrentSection('interactive')
            } else {
                setCurrentSection('details')
            }

            // Hide scroll indicator after first scroll
            if (scrollTop > 50) {
                setShowScrollIndicator(false)
            }
        }

        const container = containerRef.current
        if (container) {
            container.addEventListener('scroll', handleScroll)
            return () => container.removeEventListener('scroll', handleScroll)
        }
    }, [isScrolling])

    const scrollToSection = (section: 'hero' | 'interactive' | 'details') => {
        setIsScrolling(true)
        
        const targetRef = section === 'hero' ? heroRef : section === 'interactive' ? interactiveRef : detailsRef
        const container = containerRef.current
        
        if (targetRef.current && container) {
            const targetTop = targetRef.current.offsetTop
            container.scrollTo({
                top: targetTop,
                behavior: 'smooth'
            })
        }
        
        setTimeout(() => setIsScrolling(false), 1000)
    }

    const scrollToInteractive = () => {
        scrollToSection('interactive')
    }

    const handleFeatureClick = (featureId: string) => {
        if (featureId === 'tarot' || featureId === 'ai-powered') {
            scrollToSection('interactive')
        } else {
            // For other features, scroll to interactive and then to specific service
            scrollToSection('interactive')
            setTimeout(() => {
                // Trigger service change in the swiper
                setActiveService(featureId)
                onServiceChange?.(featureId)
            }, 500)
        }
    }

    const handleServiceChange = (serviceId: string) => {
        setActiveService(serviceId)
        onServiceChange?.(serviceId)
    }

    const handleTypewriterComplete = () => {
        // Auto-scroll to interactive section after typewriter completes
        setTimeout(() => {
            scrollToSection('interactive')
        }, 2000)
    }

    return (
        <div className="relative h-screen overflow-y-auto scroll-smooth" ref={containerRef}>
            {/* Hero Section */}
            <section 
                ref={heroRef}
                className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center"
            >
                <div className="max-w-4xl w-full mx-auto space-y-8">
                    {/* Main Heading with Enhanced Typewriter */}
                    <div className="space-y-4">
                        <h1 className="font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance h-20 sm:h-24 md:h-28 lg:h-32">
                            <EnhancedTypewriterText
                                text={t("hero.line1")}
                                speed={60}
                                className="text-white"
                                onComplete={handleTypewriterComplete}
                            />
                            <br />
                            <span className="text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">
                                {t("hero.line2")}
                            </span>
                        </h1>
                    </div>

                    {/* Question Input */}
                    <div className="flex flex-col gap-6 justify-center items-center pt-8 max-w-md mx-auto px-4">
                        <div className="w-full">
                            <HomeQuestionWrapper />
                        </div>

                        <Button
                            asChild
                            variant="ghost"
                            size="lg"
                            className="border-border/30 hover:bg-card/20 backdrop-blur-sm px-8 py-6 text-lg bg-transparent"
                        >
                            <Link href="/about">{t("learnMore")}</Link>
                        </Button>
                    </div>

                    {/* Scroll Indicator */}
                    {showScrollIndicator && (
                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={scrollToInteractive}
                                className="flex flex-col items-center gap-2 text-white/70 hover:text-white hover:bg-white/10"
                            >
                                <span className="text-sm">Explore Services</span>
                                <ChevronDown className="w-5 h-5" />
                            </Button>
                        </div>
                    )}
                </div>
            </section>

            {/* Interactive Services Section */}
            <section 
                ref={interactiveRef}
                className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-16"
            >
                <div className="w-full max-w-7xl mx-auto">
                    <div className="text-center mb-12 space-y-4">
                        <h2 className="text-4xl md:text-5xl font-bold text-white">
                            Choose Your Mystical Journey
                        </h2>
                        <p className="text-xl text-white/70 max-w-2xl mx-auto">
                            Swipe to explore different services or tap to dive deeper
                        </p>
                    </div>
                    
                    <InteractiveServicesSwiper onServiceChange={handleServiceChange} />
                    
                    {/* Navigation to Details */}
                    <div className="text-center mt-12">
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => scrollToSection('details')}
                            className="border-white/30 text-white hover:bg-white/10 px-8 py-3 rounded-full"
                        >
                            <ChevronDown className="w-5 h-5 mr-2" />
                            Learn More About Our Features
                        </Button>
                    </div>
                </div>
            </section>

            {/* Homepage Details Section */}
            <section 
                ref={detailsRef}
                className="relative z-10 min-h-screen bg-gradient-to-b from-transparent to-black/20"
            >
                <HomepageDetails onFeatureClick={handleFeatureClick} />
                
                {/* Back to Top */}
                <div className="fixed bottom-8 right-8 z-50">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => scrollToSection('hero')}
                        className="w-12 h-12 rounded-full border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                    >
                        <ArrowUp className="w-5 h-5" />
                    </Button>
                </div>
            </section>

            {/* Section Indicator */}
            <div className="fixed left-8 top-1/2 transform -translate-y-1/2 z-50 space-y-2">
                {[
                    { id: 'hero', label: 'Home', icon: MessageCircle },
                    { id: 'interactive', label: 'Services', icon: SquareStack },
                    { id: 'details', label: 'Features', icon: Brain }
                ].map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => scrollToSection(id as 'hero' | 'interactive' | 'details')}
                        className={`
                            w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                            ${currentSection === id 
                                ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                                : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }
                        `}
                        title={label}
                    >
                        <Icon className="w-5 h-5" />
                    </button>
                ))}
            </div>
        </div>
    )
}