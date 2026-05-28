"use client"

import { useTranslations } from "next-intl"
import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode, Mousewheel } from "swiper/modules"
import { CornerDownRight, MapPin, Sparkles, X } from "lucide-react"
import "swiper/css"
import "swiper/css/free-mode"
import type { CardUiText } from "./types"

type ActionTriggerProps = {
    /** Used with `showDrawTrigger` to hide the draw chip while auto-pick is on. */
    autoPickOn?: boolean
    showDrawTrigger?: boolean
    showInsufficientStars?: boolean
    cardsToSelect?: number
    cardUi?: CardUiText
    onScrollToDraw?: () => void
    intakeMode?: boolean
    intakeHelperText?: string
    currentLocationLabel?: string
    onLocationClick?: () => void
    onCancelIntake?: () => void
    onChooseCardInstead?: () => void
}

const buttonBase =
    "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 hover:text-white hover:border-white/30 transition-colors text-left cursor-pointer"

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
    showDrawTrigger = false,
    showInsufficientStars = false,
    cardsToSelect = 0,
    cardUi = DUMMY_CARD_UI,
    onScrollToDraw = () => {},
    intakeMode = false,
    intakeHelperText,
    currentLocationLabel,
    onLocationClick = () => {},
    onCancelIntake = () => {},
    onChooseCardInstead = () => {},
}: ActionTriggerProps) {
    const t = useTranslations("ActionTrigger")

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
        : showDrawTrigger && !autoPickOn
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
          : []

    if (!intakeMode && slides.length === 0) {
        return null
    }

    return (
        <div className='space-y-3'>
            {intakeMode && intakeHelperText ? (
                <p className='text-sm text-white/70'>{intakeHelperText}</p>
            ) : null}
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
        </div>
    )
}
