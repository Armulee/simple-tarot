"use client"

import { Clock, Compass, Hash, Palette, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import type { DayData } from "@/lib/calendar-helper"
import { COLOR_HEX_MAP } from "./constants"
import { translateLuckyColor, translateLuckyDirection } from "./utils"
import { CompassDial } from "./CompassDial"
import { LuckyTile } from "./LuckyTile"
import { SectionHeader } from "./SectionHeader"

export function LuckyCard({ data }: { data: DayData }) {
    const t = useTranslations("Calendar")
    const tLuckyColors = useTranslations("Calendar.lucky.colors")
    const tLuckyDirections = useTranslations("Calendar.lucky.directions")

    return (
        <div className='rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-5 space-y-3'>
            <SectionHeader icon={Sparkles} label={t("detail.lucky")} />
            <div className='grid grid-cols-2 gap-2.5'>
                <LuckyTile label={t("lucky.labels.colors")} Icon={Palette}>
                    <div className='flex flex-wrap items-center gap-1.5 mt-1'>
                        {data.lucky.colors.map((color, i) => (
                            <div
                                key={`${color}-${i}`}
                                className='flex items-center gap-1.5'
                            >
                                <span
                                    className='h-3 w-3 rounded-full ring-1 ring-white/20 shadow-[0_0_6px_-1px_currentColor]'
                                    style={{
                                        backgroundColor:
                                            COLOR_HEX_MAP[color] ?? "#cbd5e1",
                                        color:
                                            COLOR_HEX_MAP[color] ?? "#cbd5e1",
                                    }}
                                />
                                <span className='text-xs text-white/85'>
                                    {translateLuckyColor(color, tLuckyColors)}
                                </span>
                            </div>
                        ))}
                    </div>
                </LuckyTile>

                <LuckyTile label={t("lucky.labels.numbers")} Icon={Hash}>
                    <div className='flex items-center gap-1.5 mt-1'>
                        {data.lucky.numbers.map((n, i) => (
                            <span
                                key={`${n}-${i}`}
                                className='inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05] ring-1 ring-white/15 font-serif text-sm text-white tabular-nums'
                            >
                                {n}
                            </span>
                        ))}
                    </div>
                </LuckyTile>

                <LuckyTile label={t("lucky.labels.direction")} Icon={Compass}>
                    <div className='flex items-center gap-2 mt-1'>
                        <CompassDial direction={data.lucky.direction} />
                        <span className='text-sm text-white/90 font-medium leading-snug'>
                            {translateLuckyDirection(
                                data.lucky.direction,
                                tLuckyDirections,
                            )}
                        </span>
                    </div>
                </LuckyTile>

                <LuckyTile label={t("lucky.labels.time")} Icon={Clock}>
                    <div className='mt-1 text-sm text-white/90 font-medium tabular-nums'>
                        {data.lucky.time}
                    </div>
                </LuckyTile>
            </div>
        </div>
    )
}
