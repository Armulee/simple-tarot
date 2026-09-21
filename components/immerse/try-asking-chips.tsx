"use client"

import { Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode, Mousewheel } from "swiper/modules"
import "swiper/css"
import "swiper/css/free-mode"

import { followUpChipClass } from "@/components/question-input"

/**
 * "Try asking…" starter prompts. Tapping one sends it straight to Astra.
 *
 * A single swipeable row at every width — wrapping them onto a second line on
 * wide screens pushed the stack up into Astra. Same Swiper setup the home
 * quick-cards use, so a mouse wheel scrolls it horizontally on desktop rather
 * than doing nothing.
 */
export function TryAskingChips({ onPick }: { onPick: (question: string) => void }) {
    const t = useTranslations("Immerse")
    const prompts = t.raw("tryAsking") as string[]
    if (!Array.isArray(prompts) || prompts.length === 0) return null

    return (
        <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-white/85">
                <Sparkles className="h-4 w-4 text-amber-200" />
                {t("tryAskingLabel")}
            </p>
            <Swiper
                modules={[FreeMode, Mousewheel]}
                touchEventsTarget="container"
                freeMode={{ enabled: true, momentum: true, sticky: false }}
                mousewheel={{ forceToAxis: true, releaseOnEdges: true, sensitivity: 1 }}
                slidesPerView="auto"
                spaceBetween={8}
                className="w-full touch-pan-x !overflow-visible"
            >
                {prompts.map((prompt) => (
                    <SwiperSlide key={prompt} className="!w-auto !flex-shrink-0 min-w-0">
                        <button
                            type="button"
                            onClick={() => onPick(prompt)}
                            className={`${followUpChipClass} whitespace-nowrap`}
                        >
                            {prompt}
                        </button>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    )
}
