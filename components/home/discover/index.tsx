"use client"

import { useEffect, useRef } from "react"
import type { SwiperRef } from "swiper/react"
import NormalFooter from "../../footer/normal-footer"
import DiscoverHeader from "./header"
import ServicesSection from "./services"
import RoadmapSection from "./roadmap"
import ValuesSection from "./values"
import TechnologySection from "./technology"
import TestimonialsSection from "./testimonials"
import StatisticsSection from "./statistics"
import CallToActionSection from "./call-to-action"

type DiscoverMore = {
    mainSwiperRef: React.RefObject<SwiperRef | null>
}

export default function DiscoverMore({ mainSwiperRef }: DiscoverMore) {
    const scrollRef = useRef<HTMLDivElement | null>(null)
    const lockUntilRef = useRef<number>(0)
    // Require a release before allowing swipe to previous slide when at top
    const awaitingReleaseForExitUpRef = useRef<boolean>(false)
    const releaseArmedRef = useRef<boolean>(false)
    const wheelEndTimerRef = useRef<number | null>(null)
    const lastWheelTsRef = useRef<number>(0)
    const touchStartYRef = useRef<number>(0)

    useEffect(() => {
        const container = scrollRef.current
        const swiper = mainSwiperRef.current?.swiper
        if (!container || !swiper) return

        // Keep swiper enabled initially; we'll manage based on interaction
        swiper.allowTouchMove = true

        const canScrollUp = () => container.scrollTop > 0
        const canScrollDown = () =>
            container.scrollTop + container.clientHeight <
            container.scrollHeight - 1

        // Disable Swiper only when the inner content is in the middle
        const updateAllowTouchMove = () => {
            const s = mainSwiperRef.current?.swiper
            if (!s) return
            const inMiddle = canScrollUp() && canScrollDown()
            s.allowTouchMove = !inMiddle
        }

        const onScroll = () => {
            updateAllowTouchMove()
        }

        const onWheel = (e: WheelEvent) => {
            // If we are in the initial lock window, swallow scroll to avoid immediate container scroll
            if (Date.now() < lockUntilRef.current) {
                e.stopPropagation()
                e.preventDefault?.()
                return
            }
            // Track wheel gaps to detect a quick release/new gesture
            const nowTs =
                typeof e.timeStamp === "number" ? e.timeStamp : Date.now()
            const gapMs = nowTs - (lastWheelTsRef.current || 0)
            lastWheelTsRef.current = nowTs

            // Arm a release when wheel activity stops briefly (fallback)
            if (wheelEndTimerRef.current)
                window.clearTimeout(wheelEndTimerRef.current)
            wheelEndTimerRef.current = window.setTimeout(() => {
                if (awaitingReleaseForExitUpRef.current) {
                    releaseArmedRef.current = true
                }
            }, 20)
            const s = mainSwiperRef.current?.swiper
            if (!s) return
            if (e.deltaY > 0) {
                if (canScrollDown()) {
                    s.allowTouchMove = false
                    e.stopPropagation()
                } else {
                    s.allowTouchMove = true
                }
                // scrolling down cancels any pending up-exit guard
                awaitingReleaseForExitUpRef.current = false
                releaseArmedRef.current = false
            } else if (e.deltaY < 0) {
                if (canScrollUp()) {
                    // Not at top yet; keep preventing swiper
                    s.allowTouchMove = false
                    e.stopPropagation()
                    awaitingReleaseForExitUpRef.current = false
                    releaseArmedRef.current = false
                } else {
                    // At absolute top (scrollTop === 0): require a release/new gesture before allowing exit up
                    if (!awaitingReleaseForExitUpRef.current) {
                        awaitingReleaseForExitUpRef.current = true
                        releaseArmedRef.current = false
                        s.allowTouchMove = false
                        e.stopPropagation()
                    } else if (!releaseArmedRef.current) {
                        // If there's been a clear gap between wheel events, treat as release
                        if (gapMs > 80) {
                            s.allowTouchMove = true
                            awaitingReleaseForExitUpRef.current = false
                            releaseArmedRef.current = false
                        } else {
                            // Still within the same wheel stream; block
                            s.allowTouchMove = false
                            e.stopPropagation()
                        }
                    } else {
                        // Release detected; allow swiper to handle and reset flags
                        s.allowTouchMove = true
                        awaitingReleaseForExitUpRef.current = false
                        releaseArmedRef.current = false
                    }
                }
            }
        }

        const onTouchStart = (e: TouchEvent) => {
            touchStartYRef.current = e.touches[0]?.clientY ?? 0
            // Evaluate at touch start to avoid first-gesture lock
            updateAllowTouchMove()
        }

        const onTouchMove = (e: TouchEvent) => {
            const s = mainSwiperRef.current?.swiper
            if (!s) return
            const currentY = e.touches[0]?.clientY ?? 0
            const deltaY = currentY - touchStartYRef.current
            if (deltaY < 0) {
                // swipe up -> scroll down
                if (canScrollDown()) {
                    s.allowTouchMove = false
                    e.stopPropagation()
                } else {
                    s.allowTouchMove = true
                }
            } else if (deltaY > 0) {
                // swipe down -> scroll up
                if (canScrollUp()) {
                    s.allowTouchMove = false
                    e.stopPropagation()
                } else {
                    s.allowTouchMove = true
                }
            }
        }

        // Evaluate once on mount so first interaction has correct state
        updateAllowTouchMove()

        container.addEventListener("scroll", onScroll, { passive: true })
        container.addEventListener("wheel", onWheel as EventListener, {
            passive: false,
        })
        container.addEventListener("touchstart", onTouchStart, {
            passive: true,
        })
        container.addEventListener("touchmove", onTouchMove, { passive: true })
        // Listen for discover-entered event to lock scroll briefly
        const onDiscoverEntered = () => {
            lockUntilRef.current = Date.now() + 500
        }
        window.addEventListener("discover-entered", onDiscoverEntered)

        return () => {
            if (swiper) swiper.allowTouchMove = true
            container.removeEventListener("scroll", onScroll as EventListener)
            container.removeEventListener("wheel", onWheel as EventListener)
            container.removeEventListener(
                "touchstart",
                onTouchStart as EventListener
            )
            container.removeEventListener(
                "touchmove",
                onTouchMove as EventListener
            )
            window.removeEventListener("discover-entered", onDiscoverEntered)
            if (wheelEndTimerRef.current)
                window.clearTimeout(wheelEndTimerRef.current)
            // no mouseenter/leave listeners to remove
        }
    }, [mainSwiperRef])

    return (
        <div ref={scrollRef} className='w-full h-full overflow-y-auto'>
            <div className='max-w-6xl mx-auto px-6 py-10 space-y-8'>
                <DiscoverHeader />
                <ServicesSection />
                <RoadmapSection />
                <ValuesSection />
                <TechnologySection />
                <TestimonialsSection />
                <StatisticsSection />
                <CallToActionSection />
                <NormalFooter />
            </div>
        </div>
    )
}
