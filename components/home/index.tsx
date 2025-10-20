"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { useEffect, useRef, useState } from "react"
import type { SwiperRef } from "swiper/react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Tarot from "./tarot"
import BirthChart from "./birth-chart"
import Horoscope from "./horoscope"
import Namelogy from "./namelogy"
import Numelogy from "./numelogy"
import LuckyColors from "./lucky-colors"
import Palmistry from "./palmistry"
import AboutSection from "./about-section"
import "swiper/css"

export default function Home() {
    const mainSwiperRef = useRef<SwiperRef | null>(null)
    const horizontalSwiperRef = useRef<SwiperRef | null>(null)
    const [currentSlide, setCurrentSlide] = useState(0)

    const features = [
        { id: "tarot", name: "AI Tarot Reading", component: Tarot, available: true },
        { id: "birthChart", name: "Birth Chart Analysis", component: BirthChart, available: false },
        { id: "horoscope", name: "Daily Horoscope", component: Horoscope, available: false },
        { id: "namelogy", name: "Namelogy", component: Namelogy, available: false },
        { id: "numelogy", name: "Numerology", component: Numelogy, available: false },
        { id: "luckyColors", name: "Lucky Colors", component: LuckyColors, available: false },
        { id: "palmistry", name: "Palmistry", component: Palmistry, available: false },
    ]

    const handleSlideChange = (swiper: { activeIndex: number }) => {
        setCurrentSlide(swiper.activeIndex)
    }

    const goToNextSlide = () => {
        if (horizontalSwiperRef.current) {
            horizontalSwiperRef.current.swiper.slideNext()
        }
    }

    const goToPrevSlide = () => {
        if (horizontalSwiperRef.current) {
            horizontalSwiperRef.current.swiper.slidePrev()
        }
    }

    useEffect(() => {
        const handleScrollToAbout = () => {
            if (mainSwiperRef.current) {
                mainSwiperRef.current.swiper.slideNext()
            }
        }

        const handleScrollToFeatures = () => {
            if (mainSwiperRef.current) {
                mainSwiperRef.current.swiper.slidePrev()
            }
        }

        window.addEventListener('scrollToAbout', handleScrollToAbout)
        window.addEventListener('scrollToFeatures', handleScrollToFeatures)
        
        return () => {
            window.removeEventListener('scrollToAbout', handleScrollToAbout)
            window.removeEventListener('scrollToFeatures', handleScrollToFeatures)
        }
    }, [])

    return (
        <div className='w-full h-screen'>
            <Swiper 
                ref={mainSwiperRef}
                className='w-full h-screen'
                direction="vertical"
                loop={false}
                mousewheel={{
                    enabled: true,
                    forceToAxis: true,
                }}
            >
                {/* Main Content with Horizontal Swiper */}
                <SwiperSlide className='w-full h-screen relative'>
                    <Swiper 
                        ref={horizontalSwiperRef}
                        className='w-full h-screen'
                        direction="horizontal"
                        loop={true}
                        onSlideChange={handleSlideChange}
                    >
                        {features.map((feature) => {
                            const FeatureComponent = feature.component
                            return (
                                <SwiperSlide key={feature.id} className='w-full h-screen'>
                                    <div className={`w-full h-full flex flex-col items-center justify-center ${
                                        feature.id !== 'tarot' ? 'px-8' : ''
                                    }`}>
                                        <FeatureComponent />
                                    </div>
                                </SwiperSlide>
                            )
                        })}
                    </Swiper>

                    {/* Navigation Elements */}
                    <div className="absolute bottom-8 left-8 z-10">
                        <button
                            onClick={goToPrevSlide}
                            className="group flex flex-col items-center space-y-2 p-3 rounded-lg bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
                        >
                            <ChevronLeft className="w-6 h-6 text-white group-hover:text-primary transition-colors" />
                            <span className="text-sm text-white/80 group-hover:text-white transition-colors">
                                {features[(currentSlide - 1 + features.length) % features.length].name}
                            </span>
                        </button>
                    </div>

                    <div className="absolute bottom-8 right-8 z-10">
                        <button
                            onClick={goToNextSlide}
                            className="group flex flex-col items-center space-y-2 p-3 rounded-lg bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
                        >
                            <ChevronRight className="w-6 h-6 text-white group-hover:text-primary transition-colors" />
                            <span className="text-sm text-white/80 group-hover:text-white transition-colors">
                                {features[(currentSlide + 1) % features.length].name}
                            </span>
                        </button>
                    </div>
                </SwiperSlide>
                
                {/* About Section */}
                <SwiperSlide className='w-full h-screen'>
                    <AboutSection />
                </SwiperSlide>
            </Swiper>
        </div>
    )
}