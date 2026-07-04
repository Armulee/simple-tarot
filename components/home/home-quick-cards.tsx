"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode, Mousewheel } from "swiper/modules"
import { Orbit, Sparkles, Star, CalendarDays } from "lucide-react"
import { useTranslations } from "next-intl"
import { followUpChipClass } from "@/components/question-input"
import "swiper/css"
import "swiper/css/free-mode"

interface HomeQuickCardsProps {
    onCardClick: (question: string, cardId: string) => void
    disabled?: boolean
    /** Use inside `QuestionInput` action strip (no outer max-width / horizontal padding). */
    embedded?: boolean
}

export default function HomeQuickCards({
    onCardClick,
    disabled = false,
    embedded = false,
}: HomeQuickCardsProps) {
    const t = useTranslations("Home")

    const cards = [
        {
            id: "tarotCard",
            label: t("quickCards.tarotCard"),
            question: t("quickCardQuestions.tarotCard"),
            icon: Sparkles,
        },
        {
            id: "birthChart",
            label: t("quickCards.birthChart"),
            question: t("quickCardQuestions.birthChart"),
            icon: Orbit,
        },
        {
            id: "horoscope",
            label: t("quickCards.horoscope"),
            question: t("quickCardQuestions.horoscope"),
            icon: Star,
        },
        {
            id: "calendarYear",
            label: t("quickCards.calendarYear"),
            question: t("quickCardQuestions.calendarYear"),
            icon: CalendarDays,
        },
    ] as const

    const outerClass = embedded
        ? "w-full"
        : "flex justify-start mx-auto w-full max-w-3xl px-4"

    return (
        <div className={outerClass}>
            <div className='w-full text-left'>
                <Swiper
                    modules={[FreeMode, Mousewheel]}
                    noSwiping={false}
                    touchEventsTarget='container'
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
                    spaceBetween={8}
                    className='w-full touch-pan-x !overflow-visible'
                >
                    {cards.map((card) => {
                        const Icon = card.icon
                        return (
                            <SwiperSlide
                                key={card.id}
                                className='!w-auto !flex-shrink-0 min-w-0'
                            >
                                <div
                                    role='button'
                                    tabIndex={disabled ? -1 : 0}
                                    aria-disabled={disabled || undefined}
                                    onClick={() => {
                                        if (!disabled) {
                                            onCardClick(card.question, card.id)
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (disabled) return
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault()
                                            onCardClick(card.question, card.id)
                                        }
                                    }}
                                    className={`${followUpChipClass} ${disabled ? "opacity-50 cursor-not-allowed hover:from-indigo-500/15 hover:via-purple-500/15 hover:to-cyan-500/15" : ""}`}
                                >
                                    <Icon
                                        aria-hidden
                                        className='mr-1.5 size-3.5 shrink-0 text-white/55'
                                    />
                                    <span className='block max-w-[min(92vw,20rem)] truncate'>
                                        {card.label}
                                    </span>
                                </div>
                            </SwiperSlide>
                        )
                    })}
                </Swiper>
            </div>
        </div>
    )
}
