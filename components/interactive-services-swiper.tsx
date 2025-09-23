"use client"

import { useState, useRef, useEffect } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation, Pagination, Autoplay } from "swiper/modules"
import type { Swiper as SwiperType } from "swiper"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Lock
} from "lucide-react"
import mysticalServices from "@/components/navbar/mystical-services"
import { WaitlistDialog } from "./waitlist-dialog"
import { useAuth } from "@/hooks/use-auth"

// Import Swiper styles
import "swiper/css"
import "swiper/css/navigation"
import "swiper/css/pagination"

interface InteractiveServicesSwiperProps {
    onServiceChange?: (serviceId: string) => void
    initialService?: string
}

export function InteractiveServicesSwiper({ 
    onServiceChange, 
    initialService = "tarot" 
}: InteractiveServicesSwiperProps) {
    const t = useTranslations("Services")
    const { user } = useAuth()
    const [activeIndex, setActiveIndex] = useState(0)
    const [waitlistOpen, setWaitlistOpen] = useState(false)
    const [selectedService, setSelectedService] = useState<string | null>(null)
    const swiperRef = useRef<SwiperType | null>(null)

    // Find initial index based on service
    useEffect(() => {
        const index = mysticalServices.findIndex(service => service.id === initialService)
        if (index !== -1) {
            setActiveIndex(index)
        }
    }, [initialService])

    const handleSlideChange = (swiper: SwiperType) => {
        const newIndex = swiper.activeIndex
        setActiveIndex(newIndex)
        const service = mysticalServices[newIndex]
        onServiceChange?.(service.id)
    }

    const handleServiceClick = (service: typeof mysticalServices[number]) => {
        if (!service.available) {
            setSelectedService(service.id)
            setWaitlistOpen(true)
            return
        }

        // For available services, scroll to that slide
        const index = mysticalServices.findIndex(s => s.id === service.id)
        if (index !== -1 && swiperRef.current) {
            swiperRef.current.slideTo(index)
        }
    }

    // const getServiceIcon = (serviceId: string) => {
    //     const service = mysticalServices.find(s => s.id === serviceId)
    //     return service?.Icon || Sparkles
    // }

    const getServiceDescription = (serviceId: string) => {
        const descriptions: Record<string, string> = {
            tarot: "Ask your questions and let the cards reveal your destiny through ancient wisdom",
            astrology: "Discover your cosmic blueprint and how the stars influence your life path",
            namelogy: "Uncover the hidden meanings and vibrations within your name",
            numerology: "Explore the mystical significance of numbers in your life journey",
            luckyColors: "Find your personal color palette for luck, success, and harmony"
        }
        return descriptions[serviceId] || "Discover mystical insights through ancient wisdom"
    }

    const getServiceFeatures = (serviceId: string) => {
        const features: Record<string, string[]> = {
            tarot: ["AI-Powered Readings", "Multiple Card Spreads", "Personalized Guidance"],
            astrology: ["Birth Chart Analysis", "Planetary Influences", "Compatibility Reports"],
            namelogy: ["Name Numerology", "Vibration Analysis", "Life Path Insights"],
            numerology: ["Life Path Numbers", "Destiny Analysis", "Future Predictions"],
            luckyColors: ["Personal Color Palette", "Chakra Alignment", "Energy Balancing"]
        }
        return features[serviceId] || []
    }

    return (
        <>
            <div className="w-full max-w-7xl mx-auto px-4">
                {/* Service Navigation */}
                <div className="flex justify-center mb-8">
                    <div className="flex flex-wrap gap-2 justify-center max-w-4xl">
                        {mysticalServices.map((service, index) => {
                            const Icon = service.Icon
                            const isActive = index === activeIndex
                            const isAvailable = service.available
                            
                            return (
                                <Button
                                    key={service.id}
                                    variant={isActive ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleServiceClick(service)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
                                        ${isActive 
                                            ? "bg-primary text-white shadow-lg shadow-primary/25" 
                                            : isAvailable
                                                ? "bg-white/10 text-white border-white/20 hover:bg-white/20"
                                                : "bg-white/5 text-white/50 border-white/10 cursor-not-allowed"
                                        }
                                        ${!isAvailable ? "opacity-60" : ""}
                                    `}
                                    disabled={!isAvailable}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="font-medium">{t(service.id)}</span>
                                    {!isAvailable && <Lock className="w-3 h-3" />}
                                </Button>
                            )
                        })}
                    </div>
                </div>

                {/* Main Swiper */}
                <div className="relative">
                    <Swiper
                        onSwiper={(swiper) => {
                            swiperRef.current = swiper
                        }}
                        onSlideChange={handleSlideChange}
                        modules={[Navigation, Pagination, Autoplay]}
                        spaceBetween={30}
                        slidesPerView={1}
                        centeredSlides={true}
                        loop={true}
                        autoplay={{
                            delay: 5000,
                            disableOnInteraction: true,
                        }}
                        navigation={{
                            nextEl: '.swiper-button-next',
                            prevEl: '.swiper-button-prev',
                        }}
                        pagination={{
                            clickable: true,
                            dynamicBullets: true,
                        }}
                        className="interactive-services-swiper"
                    >
                        {mysticalServices.map((service, index) => {
                            const Icon = service.Icon
                            const isActive = index === activeIndex
                            
                            return (
                                <SwiperSlide key={service.id}>
                                    <Card className={`
                                        h-[500px] bg-gradient-to-br from-card/20 to-card/10 
                                        backdrop-blur-sm border border-white/20 overflow-hidden
                                        transition-all duration-500
                                        ${isActive ? 'scale-105 shadow-2xl shadow-primary/20' : 'scale-95 opacity-80'}
                                    `}>
                                        <CardContent className="h-full flex flex-col items-center justify-center p-8 text-center">
                                            {/* Service Icon */}
                                            <div className={`
                                                w-20 h-20 rounded-full flex items-center justify-center mb-6
                                                bg-gradient-to-br from-primary/20 to-secondary/20
                                                border-2 border-primary/30
                                                transition-all duration-300
                                                ${isActive ? 'scale-110 shadow-lg shadow-primary/30' : ''}
                                            `}>
                                                <Icon className={`w-10 h-10 ${isActive ? 'text-primary' : 'text-white/70'}`} />
                                            </div>

                                            {/* Service Title */}
                                            <h3 className="text-3xl font-bold mb-4 text-white">
                                                {t(service.id)}
                                            </h3>

                                            {/* Service Description */}
                                            <p className="text-white/80 mb-6 max-w-md leading-relaxed">
                                                {getServiceDescription(service.id)}
                                            </p>

                                            {/* Features */}
                                            <div className="flex flex-wrap gap-2 justify-center mb-8">
                                                {getServiceFeatures(service.id).map((feature, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        variant="outline"
                                                        className="bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                                                    >
                                                        {feature}
                                                    </Badge>
                                                ))}
                                            </div>

                                            {/* Action Button */}
                                            {service.available ? (
                                                <Button
                                                    size="lg"
                                                    className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-8 py-3 rounded-full shadow-lg shadow-primary/25"
                                                >
                                                    <Sparkles className="w-5 h-5 mr-2" />
                                                    Start {t(service.id)} Reading
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="lg"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedService(service.id)
                                                        setWaitlistOpen(true)
                                                    }}
                                                    className="border-white/30 text-white/80 hover:bg-white/10 px-8 py-3 rounded-full"
                                                >
                                                    <Lock className="w-5 h-5 mr-2" />
                                                    Join Waitlist
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                </SwiperSlide>
                            )
                        })}
                    </Swiper>

                    {/* Custom Navigation Buttons */}
                    <button
                        className="swiper-button-prev absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300"
                        aria-label="Previous service"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        className="swiper-button-next absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300"
                        aria-label="Next service"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                {/* Swiper Pagination */}
                <div className="swiper-pagination mt-6 flex justify-center gap-2" />
            </div>

            {/* Waitlist Dialog */}
            <WaitlistDialog
                open={waitlistOpen}
                onOpenChange={setWaitlistOpen}
                serviceId={selectedService}
                isLoggedIn={!!user}
            />
        </>
    )
}