"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { useEffect, useRef, useState } from "react"
import type { SwiperRef } from "swiper/react"
import { useSearchParams } from "next/navigation"
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
import FeaturePagination from "./feature-pagination"

import "swiper/css"

export default function Home() {
    const mainSwiperRef = useRef<SwiperRef | null>(null)
    const horizontalSwiperRef = useRef<SwiperRef | null>(null)
    const horizontalSwiperContainerRef = useRef<HTMLDivElement | null>(null)
    const [activeFeatureIndex, setActiveFeatureIndex] = useState(0)
    const [isHorizontalReady, setIsHorizontalReady] = useState(false)
    const searchParams = useSearchParams()

    const features = [
        { id: "tarot", component: Tarot, available: true },
        { id: "birthChart", component: BirthChart, available: true },
        { id: "astrology", component: Horoscope, available: true },
        { id: "namelogy", component: Namelogy, available: false },
        { id: "numerology", component: Numelogy, available: false },
        { id: "luckyColors", component: LuckyColors, available: false },
        { id: "palmistry", component: Palmistry, available: false },
    ]

    const jumpToService = (serviceId: string | null | undefined) => {
        if (!serviceId) return
        const targetIndex = features.findIndex(
            (f) => f.id.toLowerCase() === serviceId.toLowerCase()
        )
        if (targetIndex < 0) return
        const swiper = horizontalSwiperRef.current?.swiper
        if (!swiper) return
        swiper.slideToLoop(targetIndex)
    }

    // If the user navigates to `/?service=<id>`, jump the horizontal swiper to that service.
    useEffect(() => {
        if (!isHorizontalReady) return
        jumpToService(searchParams.get("service"))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHorizontalReady, searchParams])

    useEffect(() => {
        const handleScrollToAbout = () => {
            if (mainSwiperRef.current) {
                mainSwiperRef.current.swiper.slideNext()
            }
        }
        const handleScrollToHero = () => {
            if (mainSwiperRef.current) {
                mainSwiperRef.current.swiper.slideTo(0)
            }
        }

        window.addEventListener("scrollToAbout", handleScrollToAbout)
        window.addEventListener("scrollToHero", handleScrollToHero)
        return () => {
            window.removeEventListener("scrollToAbout", handleScrollToAbout)
            window.removeEventListener("scrollToHero", handleScrollToHero)
        }
    }, [])

    // Prevent browser back/forward gestures on horizontal wheel scroll
    useEffect(() => {
        const el = horizontalSwiperContainerRef.current
        if (!el) return

        const onWheel = (e: WheelEvent) => {
            // Stop propagation of horizontal wheel to avoid browser back/forward gestures
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                e.stopPropagation()
            }
        }

        el.addEventListener("wheel", onWheel, { passive: true })
        return () => {
            el.removeEventListener("wheel", onWheel)
        }
    }, [])

    return (
        <div className='w-full max-h-[calc(100dvh-65px)] overflow-hidden relative'>
            <Swiper
                ref={mainSwiperRef}
                className='w-full h-full max-h-[calc(100dvh-65px)]'
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
                <SwiperSlide className='w-full h-full'>
                    <div className='w-full h-full flex flex-col'>
                        {/* Feature Content Area - Expands to fill available space */}
                        <div
                            ref={horizontalSwiperContainerRef}
                            className='flex-1 min-h-0 relative'
                        >
                            <Swiper
                                ref={horizontalSwiperRef}
                                className='w-full h-full'
                                direction='horizontal'
                                loop={true}
                                nested
                                touchStartPreventDefault={false}
                                modules={[Mousewheel]}
                                mousewheel={{
                                    enabled: true,
                                    forceToAxis: true,
                                    sensitivity: 1,
                                    releaseOnEdges: false,
                                }}
                                onSwiper={(swiper) => {
                                    setIsHorizontalReady(true)
                                    // Respect deep-linking to a specific service on mount.
                                    jumpToService(searchParams.get("service"))
                                    const realIndex = swiper.realIndex
                                    setActiveFeatureIndex(realIndex)
                                    try {
                                        const serviceId =
                                            features[realIndex]?.id ?? "tarot"
                                        window.dispatchEvent(
                                            new CustomEvent(
                                                "active-service-changed",
                                                { detail: { serviceId } }
                                            )
                                        )
                                    } catch {}
                                }}
                                onSlideChange={(swiper) => {
                                    // Calculate real index accounting for loop
                                    const realIndex = swiper.realIndex
                                    setActiveFeatureIndex(realIndex)
                                    try {
                                        const serviceId =
                                            features[realIndex]?.id ?? "tarot"
                                        window.dispatchEvent(
                                            new CustomEvent(
                                                "active-service-changed",
                                                { detail: { serviceId } }
                                            )
                                        )
                                    } catch {}

                                    // Notify birth chart component when it becomes active (index 1)
                                    if (realIndex === 1) {
                                        try {
                                            window.dispatchEvent(
                                                new CustomEvent(
                                                    "birth-chart-slide-active"
                                                )
                                            )
                                        } catch {}
                                    }
                                    // Notify birth chart when it becomes inactive
                                    if (realIndex !== 1) {
                                        try {
                                            window.dispatchEvent(
                                                new CustomEvent(
                                                    "birth-chart-slide-inactive"
                                                )
                                            )
                                        } catch {}
                                    }
                                    // Notify horoscope component when it becomes active (index 2)
                                    if (realIndex === 2) {
                                        try {
                                            window.dispatchEvent(
                                                new CustomEvent(
                                                    "horoscope-slide-active"
                                                )
                                            )
                                        } catch {}
                                    }
                                    // Notify horoscope when it becomes inactive
                                    if (realIndex !== 2) {
                                        try {
                                            window.dispatchEvent(
                                                new CustomEvent(
                                                    "horoscope-slide-inactive"
                                                )
                                            )
                                        } catch {}
                                    }
                                }}
                            >
                                {features.map((feature) => {
                                    const FeatureComponent = feature.component
                                    return (
                                        <SwiperSlide
                                            key={feature.id}
                                            className='w-full h-full'
                                        >
                                            <div className='w-full h-full flex flex-col items-center justify-end pb-18 overflow-hidden'>
                                                <FeatureComponent />
                                            </div>
                                        </SwiperSlide>
                                    )
                                })}
                            </Swiper>
                        </div>

                        {/* Pagination Section */}
                        <div className='flex-shrink-0 py-4'>
                            <FeaturePagination
                                features={features}
                                activeIndex={activeFeatureIndex}
                                onDotClick={(index) => {
                                    if (horizontalSwiperRef.current) {
                                        horizontalSwiperRef.current.swiper.slideToLoop(
                                            index
                                        )
                                    }
                                }}
                                onLearnMore={() => {
                                    const event = new CustomEvent(
                                        "scrollToAbout"
                                    )
                                    window.dispatchEvent(event)
                                }}
                            />
                        </div>

                        {/* Footer Section */}
                        <div className='flex-shrink-0'>
                            <NormalFooter />
                        </div>
                    </div>
                </SwiperSlide>

                {/* About Section */}
                <SwiperSlide className='w-full h-full'>
                    <DiscoverMore mainSwiperRef={mainSwiperRef} />
                </SwiperSlide>
            </Swiper>
        </div>
    )
}
