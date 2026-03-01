"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode, Mousewheel } from "swiper/modules"
import { Sparkles, Star } from "lucide-react"
import { useTranslations } from "next-intl"
import "swiper/css"
import "swiper/css/free-mode"

interface HomeQuickCardsProps {
    onCardClick: (question: string) => void
    disabled?: boolean
}

export default function HomeQuickCards({
    onCardClick,
    disabled = false,
}: HomeQuickCardsProps) {
    const t = useTranslations("Home")

    const cards = [
        {
            id: "cardReading",
            label: t("quickCards.cardReading"),
            question: t("quickCardQuestions.cardReading"),
            icon: Sparkles,
        },
        {
            id: "todayHoroscope",
            label: t("quickCards.todayHoroscope"),
            question: t("quickCardQuestions.todayHoroscope"),
            icon: Star,
        },
    ] as const

    return (
        <div className='flex justify-start px-4'>
            <div className='text-center w-full'>
                <Swiper
                    modules={[FreeMode, Mousewheel]}
                    freeMode={{
                        enabled: true,
                        momentum: true,
                        sticky: false,
                    }}
                    mousewheel={{
                        forceToAxis: true,
                        releaseOnEdges: true,
                        sensitivity: 1,
                    }}
                    slidesPerView='auto'
                    spaceBetween={12}
                    className='suggestion-swiper w-full px-2'
                >
                    {cards.map((card) => {
                        const Icon = card.icon
                        return (
                            <SwiperSlide
                                key={card.id}
                                className='!w-auto min-w-0'
                            >
                                <button
                                    type='button'
                                    onClick={() => {
                                        if (!disabled) {
                                            onCardClick(card.question)
                                        }
                                    }}
                                    disabled={disabled}
                                    className={`
                                        flex items-center gap-3 rounded-xl border border-white/10
                                        bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15
                                        backdrop-blur-xl px-4 py-3
                                        transition-all duration-300
                                        hover:from-indigo-500/25 hover:via-purple-500/25 hover:to-cyan-500/25
                                        hover:border-white/20 hover:shadow-[0_8px_25px_-8px_rgba(56,189,248,0.35)]
                                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
                                    `}
                                >
                                    <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10'>
                                        <Icon className='h-4 w-4 text-white/90' />
                                    </div>
                                    <span className='text-sm font-medium text-white/90 whitespace-nowrap'>
                                        {card.label}
                                    </span>
                                </button>
                            </SwiperSlide>
                        )
                    })}
                </Swiper>
            </div>
        </div>
    )
}
