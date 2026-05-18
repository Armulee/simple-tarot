"use client"

import { Activity } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { DayData } from "@/lib/calendar-helper"
import { VITALITY_META } from "./constants"
import { SectionHeader } from "./SectionHeader"

export function VitalityCard({ data }: { data: DayData }) {
    const t = useTranslations("Calendar")

    return (
        <div className='rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-5 space-y-4'>
            <SectionHeader icon={Activity} label={t("detail.vitality")} />
            <div className='space-y-3'>
                {VITALITY_META.map(
                    ({ key, Icon, barFrom, barTo, iconBg, iconText }) => {
                        const score = data.vitality[key]
                        return (
                            <div key={key} className='space-y-1.5'>
                                <div className='flex items-center justify-between gap-2'>
                                    <div className='flex items-center gap-2.5 text-sm text-white/85'>
                                        <span
                                            className={cn(
                                                "inline-flex h-6 w-6 items-center justify-center rounded-lg ring-1",
                                                iconBg,
                                                iconText,
                                            )}
                                        >
                                            <Icon className='h-3 w-3' />
                                        </span>
                                        {t(`vitalityLabels.${key}`)}
                                    </div>
                                    <div className='text-xs text-white/60 tabular-nums font-medium'>
                                        {score.toFixed(1)}
                                        <span className='text-white/30'>
                                            /10
                                        </span>
                                    </div>
                                </div>
                                <div className='relative h-2 rounded-full bg-white/[0.06] overflow-hidden'>
                                    <div
                                        className={cn(
                                            "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r shadow-[0_0_8px_-1px_currentColor]",
                                            barFrom,
                                            barTo,
                                        )}
                                        style={{
                                            width: `${score * 10}%`,
                                            transition:
                                                "width 600ms cubic-bezier(0.22,1,0.36,1)",
                                        }}
                                    />
                                </div>
                            </div>
                        )
                    },
                )}
            </div>
        </div>
    )
}
