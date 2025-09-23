"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Pagination } from "swiper/modules"
import type { Swiper as SwiperType } from "swiper"
import "swiper/css"
import "swiper/css/pagination"
import { useService } from "@/contexts/service-context"
import type { MysticalServiceId } from "@/contexts/service-context"
import mysticalServices from "@/components/navbar/mystical-services"
import HomeQuestionWrapper from "@/components/home-question-wrapper"
import { TypewriterText } from "@/components/typewriter-text"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, LayoutGrid, Sparkles } from "lucide-react"
import { WaitlistDialog } from "@/components/waitlist-dialog"

export default function HomeInteractive() {
    const { activeService, setActiveService } = useService()
    const t = useTranslations("Home")
    const swiperRef = useRef<SwiperType | null>(null)
    const [showSteps, setShowSteps] = useState(false)
    const [waitlistOpen, setWaitlistOpen] = useState(false)
    const [waitlistLabel, setWaitlistLabel] = useState("")

    const serviceIds = useMemo<MysticalServiceId[]>(
        () => mysticalServices.map((s) => s.id as MysticalServiceId),
        []
    )
    const activeIndex = Math.max(0, serviceIds.indexOf(activeService))

    useEffect(() => {
        const id = setTimeout(() => setShowSteps(true), 3000)
        return () => clearTimeout(id)
    }, [])

    // Sync from context to swiper
    useEffect(() => {
        if (swiperRef.current && swiperRef.current.activeIndex !== activeIndex) {
            swiperRef.current.slideTo(activeIndex)
        }
    }, [activeIndex])

    // Handlers
    const handleSlideChange = (idx: number) => {
        const id = serviceIds[idx]
        if (id) setActiveService(id)
    }

    const openWaitlist = (label: string) => {
        setWaitlistLabel(label)
        setWaitlistOpen(true)
    }

    return (
        <section id='interactive' className='relative h-[calc(100vh-65px)] w-full flex items-stretch snap-start'>
            <Swiper
                onSwiper={(s: SwiperType) => (swiperRef.current = s)}
                onSlideChange={(s: SwiperType) => handleSlideChange(s.activeIndex)}
                initialSlide={activeIndex}
                modules={[Pagination]}
                pagination={{ clickable: true }}
                className='w-full'
            >
                {mysticalServices.map(({ id, label, available }) => (
                    <SwiperSlide key={id} className='!flex items-center justify-center'>
                        <div className='relative w-full h-full flex items-center justify-center px-6'>
                            {/* Hero headline / steps overlay */}
                            <div className='absolute top-8 left-1/2 -translate-x-1/2 w-full max-w-4xl text-center'>
                                {!showSteps ? (
                                    <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance h-20 sm:h-24 md:h-28 lg:h-32'>
                                        <TypewriterText text={t("hero.line1")} speed={60} className='text-white' />
                                        <br />
                                        <TypewriterText
                                            text={t("hero.line2")}
                                            speed={60}
                                            delay={60 * t("hero.line1").length}
                                            className='text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'
                                        />
                                    </h1>
                                ) : (
                                    <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto'>
                                        <Card className='bg-card/40 border-white/10'>
                                            <CardContent className='p-4 flex items-center gap-3'>
                                                <MessageSquare className='w-5 h-5 text-secondary' />
                                                <div className='text-left'>
                                                    <p className='text-sm text-white/70'>1.</p>
                                                    <p className='font-medium text-white'>{t("steps.step1")}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card className='bg-card/40 border-white/10'>
                                            <CardContent className='p-4 flex items-center gap-3'>
                                                <LayoutGrid className='w-5 h-5 text-secondary' />
                                                <div className='text-left'>
                                                    <p className='text-sm text-white/70'>2.</p>
                                                    <p className='font-medium text-white'>{t("steps.step2")}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card className='bg-card/40 border-white/10'>
                                            <CardContent className='p-4 flex items-center gap-3'>
                                                <Sparkles className='w-5 h-5 text-secondary' />
                                                <div className='text-left'>
                                                    <p className='text-sm text-white/70'>3.</p>
                                                    <p className='font-medium text-white'>{t("steps.step3")}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </div>

                            {/* Slide body */}
                            <div className='w-full max-w-4xl mt-40'>
                                {available ? (
                                    <div className='space-y-6'>
                                        <HomeQuestionWrapper />
                                    </div>
                                ) : (
                                    <div className='flex flex-col items-center gap-4'>
                                        <p className='text-white/80'>
                                            {label} is brewing in the stars.
                                        </p>
                                        <Button onClick={() => openWaitlist(label)}>
                                            Join the waitlist
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>

            <WaitlistDialog
                open={waitlistOpen}
                onOpenChange={setWaitlistOpen}
                serviceLabel={waitlistLabel}
            />
        </section>
    )
}

