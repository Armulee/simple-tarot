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
    /**
     * Selected-day context shown as a pill at the start of the chip row.
     * Mirrors the `/calendar` page's PageContextComposer chip so the
     * viewer can see what date their next question will be read for.
     */
    dayContext?: { label: string; hint?: string } | null
}

const buttonBase =
    "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 hover:text-white hover:border-white/30 transition-colors text-left cursor-pointer touch-pan-x"

function chipKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
    action: () => void,
) {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        action()
    }
}

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
    dayContext = null,
}: ActionTriggerProps) {
    const t = useTranslations("ActionTrigger")

    const slides = intakeMode
        ? [
              {
                  id: "choose-card-instead",
                  content: (
                      <div
                          role='button'
                          tabIndex={0}
                          onClick={onChooseCardInstead}
                          onKeyDown={(e) => chipKeyDown(e, onChooseCardInstead)}
                          className={buttonBase}
                      >
                          <Sparkles className='size-4' />
                          {t("chooseCardInstead")}
                      </div>
                  ),
              },
              {
                  id: "location",
                  content: (
                      <div
                          role='button'
                          tabIndex={0}
                          onClick={onLocationClick}
                          onKeyDown={(e) => chipKeyDown(e, onLocationClick)}
                          className={buttonBase}
                      >
                          <MapPin className='size-4' />
                          {t("location", {
                              value:
                                  currentLocationLabel || t("locationUnknown"),
                          })}
                      </div>
                  ),
              },
              {
                  id: "cancel-intake",
                  content: (
                      <div
                          role='button'
                          tabIndex={0}
                          onClick={onCancelIntake}
                          onKeyDown={(e) => chipKeyDown(e, onCancelIntake)}
                          className={buttonBase}
                      >
                          <X className='size-4' />
                          {t("cancelIntake")}
                      </div>
                  ),
              },
          ]
        : showDrawTrigger && !autoPickOn
          ? [
                {
                    id: "draw",
                    content: (
                        <div
                            role='button'
                            tabIndex={0}
                            onClick={onScrollToDraw}
                            onKeyDown={(e) => chipKeyDown(e, onScrollToDraw)}
                            className={buttonBase}
                        >
                            <CornerDownRight className='size-4' />
                            {showInsufficientStars
                                ? cardUi.topUpCta(cardsToSelect)
                                : cardUi.drawCta(cardsToSelect)}
                        </div>
                    ),
                },
            ]
          : []

    if (!intakeMode && slides.length === 0 && !dayContext) {
        return null
    }

    return (
        <div className='space-y-3'>
            {intakeMode && intakeHelperText ? (
                <p className='text-sm text-white/70'>{intakeHelperText}</p>
            ) : null}
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
                className='action-trigger-swiper w-full touch-pan-x !overflow-visible'
            >
                {dayContext ? (
                    <SwiperSlide
                        key='day-context'
                        className='!w-auto !flex-shrink-0 min-w-0'
                    >
                        <div
                            className='inline-flex max-w-full items-center gap-2 rounded-xl border border-amber-300/30 bg-gradient-to-br from-amber-300/10 via-white/[0.04] to-violet-400/10 px-3 py-1.5 text-xs text-white/85 backdrop-blur'
                            role='note'
                            aria-label={
                                dayContext.hint
                                    ? `${dayContext.label} — ${dayContext.hint}`
                                    : dayContext.label
                            }
                        >
                            <Sparkles className='size-3.5 shrink-0 text-amber-200/85' />
                            <span className='truncate font-medium text-white'>
                                {dayContext.label}
                            </span>
                            {dayContext.hint ? (
                                <span className='hidden sm:inline text-white/60'>
                                    — {dayContext.hint}
                                </span>
                            ) : null}
                        </div>
                    </SwiperSlide>
                ) : null}
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
