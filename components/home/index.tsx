"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { useEffect, useRef } from "react"
import type { SwiperRef } from "swiper/react"
import { Mousewheel } from "swiper/modules"
import { ChevronDown } from "lucide-react"
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
        <div className='w-full h-full overflow-hidden'>
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
                // Do not force allowTouchMove in onSlideChange; About manages it
            >
                {/* Main Content with Horizontal Swiper */}
                <SwiperSlide className='w-full h-full relative'>
                    <Swiper
                        className='w-full h-full'
                        direction="horizontal"
                        loop={true}
                        nested
                        touchStartPreventDefault={false}
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

                    {/* Learn more chevron indicator */}
                    <div className='pointer-events-none absolute bottom-6 left-0 right-0 flex justify-center'>
                        <button
                            type='button'
                            className='pointer-events-auto flex flex-col items-center gap-2 text-white/80 hover:text-white'
                            onClick={() => {
                                const event = new CustomEvent('scrollToAbout')
                                window.dispatchEvent(event)
                            }}
                        >
                            <div className='flex items-center gap-4'>
                                <div className='h-px w-12 bg-white/30' />
                                <span className='text-xs uppercase tracking-wide'>Learn more</span>
                                <div className='h-px w-12 bg-white/30' />
                            </div>
                            <ChevronDown className='w-5 h-5 animate-bounce' />
                        </button>
                    </div>
                </SwiperSlide>
                
                {/* About Section */}
                <SwiperSlide className='w-full h-full'>
                    <AboutSection mainSwiperRef={mainSwiperRef} />
                </SwiperSlide>
            </Swiper>
        </div>
    )
}