"use client"

import { useTranslations } from "next-intl"
import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode, Mousewheel } from "swiper/modules"
import { CornerDownRight, MapPin, Sparkles, X } from "lucide-react"
import "swiper/css"
import "swiper/css/free-mode"
import type { HoroscopeBirthData } from "@/types/horoscope"
import type { CardUiText } from "./types"

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
    showAutoPick?: boolean
    intakeMode?: boolean
    intakeHelperText?: string
    currentLocationLabel?: string
    onLocationClick?: () => void
    onCancelIntake?: () => void
    onChooseCardInstead?: () => void
}

const buttonBase =
    "swiper-no-swiping inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 hover:text-white hover:border-white/30 transition-colors text-left cursor-pointer"

const DUMMY_CARD_UI: CardUiText = {
    selected: () => "",
    consumeStar: "",
    shuffle: "",
    pick: "",
    cardCount: () => "",
    decreaseCardCount: "",
    increaseCardCount: "",
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
    showAutoPick = true,
    intakeMode = false,
    intakeHelperText,
    currentLocationLabel,
    onLocationClick = () => {},
    onCancelIntake = () => {},
    onChooseCardInstead = () => {},
}: ActionTriggerProps) {
    const t = useTranslations("ActionTrigger")

    const hasBirthDate = Boolean(
        savedBirth?.day && savedBirth?.month && savedBirth?.year,
    )

    const slides = intakeMode
        ? [
              {
                  id: "choose-card-instead",
                  content: (
                      <button
                          type='button'
                          onClick={onChooseCardInstead}
                          className={buttonBase}
                      >
                          <Sparkles className='size-4' />
                          {t("chooseCardInstead")}
                      </button>
                  ),
              },
              {
                  id: "location",
                  content: (
                      <button
                          type='button'
                          onClick={onLocationClick}
                          className={buttonBase}
                      >
                          <MapPin className='size-4' />
                          {t("location", {
                              value:
                                  currentLocationLabel || t("locationUnknown"),
                          })}
                      </button>
                  ),
              },
              {
                  id: "cancel-intake",
                  content: (
                      <button
                          type='button'
                          onClick={onCancelIntake}
                          className={buttonBase}
                      >
                          <X className='size-4' />
                          {t("cancelIntake")}
                      </button>
                  ),
              },
          ]
        : [
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
                                    <span className='text-white/85'>
                                        {t("autoPickLabel")}
                                    </span>
                                    <span
                                        className={
                                            autoPickOn
                                                ? "text-green-500 font-medium"
                                                : "text-white/85 font-medium"
                                        }
                                    >
                                        {autoPickOn
                                            ? t("autoPickOn")
                                            : t("autoPickOff")}
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
                          className={`${buttonBase} ${
                              hasBirthDate
                                  ? "border-primary/30 bg-primary/10 text-white"
                                  : ""
                          }`}
                      >
                          <CornerDownRight className='size-4' />
                          {hasBirthDate
                              ? t("editBirthInfo")
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
                    ]
                  : []),
          ]

    return (
        <div className='space-y-3'>
            {intakeMode && intakeHelperText ? (
                <p className='text-sm text-white/70'>{intakeHelperText}</p>
            ) : null}
            <Swiper
                modules={[FreeMode, Mousewheel]}
                noSwiping
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
        </div>
    )
}
