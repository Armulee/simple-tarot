"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { useEffect, useRef } from "react"
import type { SwiperRef } from "swiper/react"
import { Mousewheel } from "swiper/modules"
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

    const features = [
        { id: "tarot", component: Tarot, available: true },
        { id: "birthChart", component: BirthChart, available: false },
        { id: "horoscope", component: Horoscope, available: false },
        { id: "namelogy", component: Namelogy, available: false },
        { id: "numelogy", component: Numelogy, available: false },
        { id: "luckyColors", component: LuckyColors, available: false },
        { id: "palmistry", component: Palmistry, available: false },
    ]

    useEffect(() => {
        const handleScrollToAbout = () => {
            if (mainSwiperRef.current) {
                mainSwiperRef.current.swiper.slideNext()
            }
        }

        window.addEventListener('scrollToAbout', handleScrollToAbout)
        return () => window.removeEventListener('scrollToAbout', handleScrollToAbout)
    }, [])

    return (
        <div className='w-full h-full'>
            <Swiper
                ref={mainSwiperRef}
                className='w-full h-full'
                direction="vertical"
                loop={false}
                modules={[Mousewheel]}
                mousewheel={{
                    enabled: true,
                    forceToAxis: true,
                }}
                onSlideChange={(swiper) => {
                    // Ensure vertical navigation is re-enabled after leaving About
                    swiper.allowTouchMove = true
                }}
            >
                {/* Main Content with Horizontal Swiper */}
                <SwiperSlide className='w-full h-full'>
                    <Swiper
                        className='w-full h-full'
                        direction="horizontal"
                        loop={true}
                    >
                        {features.map((feature) => {
                            const FeatureComponent = feature.component
                            return (
                                <SwiperSlide key={feature.id} className='w-full h-full'>
                                    <div className={`w-full h-full flex flex-col items-center justify-center ${
                                        feature.id !== 'tarot' ? 'px-8' : ''
                                    }`}>
                                        <FeatureComponent />
                                    </div>
                                </SwiperSlide>
                            )
                        })}
                    </Swiper>
                </SwiperSlide>
                
                {/* About Section */}
                <SwiperSlide className='w-full h-full'>
                    <AboutSection mainSwiperRef={mainSwiperRef} />
                </SwiperSlide>
            </Swiper>
        </div>
    )
}