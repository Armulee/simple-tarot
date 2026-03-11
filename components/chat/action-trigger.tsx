"use client"

import { useTranslations, useLocale } from "next-intl"
import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode, Mousewheel } from "swiper/modules"
import { CornerDownRight } from "lucide-react"
import "swiper/css"
import "swiper/css/free-mode"
import type { HoroscopeBirthData } from "@/types/horoscope"
import type { CardUiText } from "./types"

function formatBirthDate(
    birth: HoroscopeBirthData | null,
    locale: string,
): string {
    if (!birth?.day || !birth?.month || !birth?.year) return ""
    const date = new Date(birth.year, birth.month - 1, birth.day)
    return date.toLocaleDateString(
        locale.startsWith("th") ? "th-TH" : "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric",
        },
    )
}

type ActionTriggerProps = {
    autoPickOn?: boolean
    onToggleAutoPick?: () => void
    savedBirth: HoroscopeBirthData | null
    onBirthInfoClick: () => void
    showDrawTrigger?: boolean
    showInsufficientStars?: boolean
    cardsToSelect?: number
    cardUi?: CardUiText
    onScrollToDraw?: () => void
    onPickAll?: () => void
    showAutoPick?: boolean
}

const buttonBase =
    "w-fit flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 hover:text-white hover:border-white/30 transition-colors text-left"

const DUMMY_CARD_UI: CardUiText = {
    selected: () => "",
    consumeStar: "",
    shuffle: "",
    pick: "",
    swipe: "",
    drawCta: () => "",
    topUpCta: () => "",
    pickAllCta: () => "",
    pickAllPlaceholder: "",
}

export default function ActionTrigger({
    autoPickOn = false,
    onToggleAutoPick = () => {},
    savedBirth,
    onBirthInfoClick,
    showDrawTrigger = false,
    showInsufficientStars = false,
    cardsToSelect = 0,
    cardUi = DUMMY_CARD_UI,
    onScrollToDraw = () => {},
    onPickAll = () => {},
    showAutoPick = true,
}: ActionTriggerProps) {
    const t = useTranslations("ActionTrigger")
    const locale = useLocale()

    const birthDateStr = formatBirthDate(savedBirth, locale)
    const hasBirthDate = Boolean(birthDateStr)

    const slides = [
        ...(showAutoPick
            ? [
                  {
                      id: "auto-pick",
                      content: (
                <button
                    type='button'
                    onClick={onToggleAutoPick}
                    className={buttonBase}
                >
                    <span className='text-white/85'>{t("autoPickLabel")}</span>
                    <span
                        className={
                            autoPickOn
                                ? "text-green-500 font-medium"
                                : "text-white/85 font-medium"
                        }
                    >
                        {autoPickOn ? t("autoPickOn") : t("autoPickOff")}
                    </span>
                </button>
            ),
                  },
              ]
            : []),
        {
            id: "birth-info",
            content: (
                <button
                    type='button'
                    onClick={onBirthInfoClick}
                    className={buttonBase}
                >
                    <CornerDownRight className='size-4' />
                    {hasBirthDate
                        ? t("birthInfo", { date: birthDateStr })
                        : t("newBirthInfo")}
                </button>
            ),
        },
        ...(showDrawTrigger && !autoPickOn
            ? [
                  {
                      id: "draw",
                      content: (
                          <button
                              type='button'
                              onClick={onScrollToDraw}
                              className={buttonBase}
                          >
                              <CornerDownRight className='size-4' />
                              {showInsufficientStars
                                  ? cardUi.topUpCta(cardsToSelect)
                                  : cardUi.drawCta(cardsToSelect)}
                          </button>
                      ),
                  },
                  ...(!showInsufficientStars
                      ? [
                            {
                                id: "pick-all",
                                content: (
                                    <button
                                        type='button'
                                        onClick={onPickAll}
                                        className={buttonBase}
                                    >
                                        <CornerDownRight className='size-4' />
                                        {cardUi.pickAllCta()}
                                    </button>
                                ),
                            },
                        ]
                      : []),
              ]
            : []),
    ]

    return (
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
            spaceBetween={8}
            className='action-trigger-swiper w-full !overflow-visible'
        >
            {slides.map((slide) => (
                <SwiperSlide
                    key={slide.id}
                    className='!w-auto !flex-shrink-0 min-w-0'
                >
                    {slide.content}
                </SwiperSlide>
            ))}
        </Swiper>
    )
}
