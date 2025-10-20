"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules"
import Tarot from "./tarot"
import BirthChart from "./birth-chart"
import Horoscope from "./horoscope"
import Namelogy from "./namelogy"
import Numelogy from "./numelogy"
import LuckyColors from "./lucky-colors"
import Palmistry from "./palmistry"
import "swiper/css"
import "swiper/css/navigation"
import "swiper/css/pagination"
import "swiper/css/effect-fade"

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
        <div className='w-full h-screen relative'>
            {/* Navigation Dots */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
                <div className="flex space-x-3">
                    {features.map((feature) => (
                        <div
                            key={feature.id}
                            className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                feature.available 
                                    ? 'bg-gradient-to-r from-primary to-secondary' 
                                    : 'bg-gray-500/50'
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Feature Counter */}
            <div className="absolute top-8 right-8 z-20">
                <div className="bg-black/20 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
                    <span className="text-white text-sm font-medium">
                        <span className="text-primary">1</span> / {features.length} Features
                    </span>
                </div>
            </div>

            <Swiper
                className='w-full h-screen'
                modules={[Navigation, Pagination, Autoplay, EffectFade]}
                effect="fade"
                fadeEffect={{ crossFade: true }}
                autoplay={{
                    delay: 8000,
                    disableOnInteraction: false,
                }}
                speed={1000}
                loop={true}
                navigation={false}
                pagination={false}
            >
                {features.map((feature) => {
                    const FeatureComponent = feature.component
                    return (
                        <SwiperSlide key={feature.id} className='w-full h-screen'>
                            <div className='w-full h-full flex flex-col items-center justify-center relative'>
                                {/* Background Pattern */}
                                <div className="absolute inset-0 opacity-10">
                                    <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-xl" />
                                    <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-full blur-xl" />
                                    <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-gradient-to-br from-primary/15 to-secondary/15 rounded-full blur-lg" />
                                </div>
                                
                                {/* Feature Content */}
                                <div className="relative z-10">
                                    <FeatureComponent />
                                </div>

                                {/* Coming Soon Overlay for unavailable features */}
                                {!feature.available && (
                                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-30">
                                        <div className="bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-black px-8 py-4 rounded-full shadow-2xl">
                                            <span className="text-lg font-bold">✨ Coming Soon ✨</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </SwiperSlide>
                    )
                })}
            </Swiper>
        </div>
    )
}
