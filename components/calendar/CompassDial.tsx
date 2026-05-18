"use client"

import { useTranslations } from "next-intl"
import { DIRECTION_DEG } from "./constants"

export function CompassDial({ direction }: { direction: string }) {
    const t = useTranslations("Calendar.lucky")
    const deg = DIRECTION_DEG[direction] ?? 0

    return (
        <div className='relative h-8 w-8 shrink-0'>
            <div className='absolute inset-0 rounded-full ring-1 ring-white/20 bg-white/[0.04]' />
            <div
                className='absolute inset-0 grid place-items-center transition-transform duration-500'
                style={{ transform: `rotate(${deg}deg)` }}
            >
                <span className='h-3 w-[2px] -translate-y-[6px] rounded-full bg-amber-200 shadow-[0_0_6px_rgba(252,211,77,0.6)]' />
            </div>
            <span className='absolute top-0.5 left-1/2 -translate-x-1/2 text-[7px] text-white/40'>
                {t("compassNorth")}
            </span>
        </div>
    )
}
