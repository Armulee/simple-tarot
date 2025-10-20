"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode } from "swiper/modules"
import Tarot from "./tarot"
import BirthChart from "./birth-chart"
import Horoscope from "./horoscope"
import Namelogy from "./namelogy"
import Numelogy from "./numelogy"
import LuckyColors from "./lucky-colors"
import Palmistry from "./palmistry"
import AboutSection from "./about-section"
import "swiper/css"
import "swiper/css/free-mode"

export default function Home() {
    const features = [
        { id: "tarot", component: Tarot, available: true },
        { id: "birthChart", component: BirthChart, available: false },
        { id: "horoscope", component: Horoscope, available: false },
        { id: "namelogy", component: Namelogy, available: false },
        { id: "numelogy", component: Numelogy, available: false },
        { id: "luckyColors", component: LuckyColors, available: false },
        { id: "palmistry", component: Palmistry, available: false },
    ]

    return (
        <div className='w-full h-screen'>
            <Swiper 
                className='w-full h-screen'
                direction="vertical"
                loop={true}
                modules={[FreeMode]}
                freeMode={{
                    enabled: true,
                    sticky: true
                }}
                mousewheel={{
                    enabled: true,
                    forceToAxis: true,
                }}
                keyboard={{
                    enabled: true,
                }}
            >
                {/* Horizontal Feature Slides */}
                <SwiperSlide className='w-full h-screen'>
                    <Swiper 
                        className='w-full h-screen'
                        direction="horizontal"
                        loop={true}
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
                </SwiperSlide>
                
                {/* Vertical About Section */}
                <SwiperSlide className='w-full h-screen'>
                    <AboutSection />
                </SwiperSlide>
            </Swiper>
        </div>
    )
}