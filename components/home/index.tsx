"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { useEffect, useRef } from "react"
import type { SwiperRef } from "swiper/react"
import { Mousewheel } from "swiper/modules"
import Tarot from "./features/tarot"
import BirthChart from "./features/birth-chart"
import Horoscope from "./features/horoscope"
import Namelogy from "./features/namelogy"
import Numelogy from "./features/numelogy"
import LuckyColors from "./features/lucky-colors"
import Palmistry from "./features/palmistry"
import NormalFooter from "../footer/normal-footer"
import DiscoverMore from "./discover"

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

        window.addEventListener("scrollToAbout", handleScrollToAbout)
        return () =>
            window.removeEventListener("scrollToAbout", handleScrollToAbout)
    }, [])

    return (
        <div className='w-full h-[100dvh] overflow-hidden relative'>
            <Swiper
                ref={mainSwiperRef}
                className='w-full h-full'
                direction='vertical'
                loop={false}
                modules={[Mousewheel]}
                mousewheel={{
                    enabled: true,
                    forceToAxis: true,
                }}
                onSlideChange={(swiper) => {
                    // When entering the Discover slide (index 1), notify it to lock scroll briefly
                    if (swiper.activeIndex === 1) {
                        try {
                            window.dispatchEvent(
                                new CustomEvent("discover-entered")
                            )
                        } catch {}
                    }
                }}
                // Do not force allowTouchMove in onSlideChange; About manages it
            >
                {/* Main Content with Horizontal Swiper */}
                <SwiperSlide className='w-full h-full relative'>
                    <Swiper
                        className='w-full h-[calc(100%-160px)] md:h-[calc(100%-70px)]'
                        direction='horizontal'
                        loop={true}
                        nested
                        touchStartPreventDefault={false}
                    >
                        {features.map((feature) => {
                            const FeatureComponent = feature.component
                            return (
                                <SwiperSlide
                                    key={feature.id}
                                    className='w-full h-full'
                                >
                                    <div
                                        className={`w-full h-full flex flex-col items-center justify-center ${
                                            feature.id !== "tarot" ? "px-8" : ""
                                        }`}
                                    >
                                        <FeatureComponent />
                                    </div>
                                </SwiperSlide>
                            )
                        })}
                    </Swiper>
                    <NormalFooter />
                    {/* Learn more chevron indicator moved to Tarot section */}
                </SwiperSlide>

                {/* About Section */}
                <SwiperSlide className='w-full h-full'>
                    <DiscoverMore mainSwiperRef={mainSwiperRef} />
                </SwiperSlide>
            </Swiper>
        </div>
    )
}
