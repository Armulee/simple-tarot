"use client"

import { useTranslations } from "next-intl"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    saveInterpretationModeToStorage,
    type InterpretationMode,
} from "@/lib/interpretation-mode-storage"
import { FaStar, FaMessage } from "react-icons/fa6"
import { TbPlayCardStarFilled } from "react-icons/tb"
import { PiSparkleFill } from "react-icons/pi"
import { useState } from "react"

const MODE_ICONS = {
    auto: PiSparkleFill,
    tarot: TbPlayCardStarFilled,
    horoscope: FaStar,
    chat: FaMessage,
} as const
type InterpretationModeSelectorProps = {
    value: InterpretationMode
    onChange: (mode: InterpretationMode) => void
}

export default function InterpretationModeSelector({
    value,
    onChange,
}: InterpretationModeSelectorProps) {
    const t = useTranslations("InterpretationMode")
    const [open, setOpen] = useState(false)

    const handleSelect = (mode: InterpretationMode) => {
        saveInterpretationModeToStorage(mode)
        onChange(mode)
        setOpen(false)
    }

    const label =
        value === "auto"
            ? t("auto")
            : value === "tarot"
              ? t("tarot")
              : value === "horoscope"
                ? t("horoscope")
                : t("chat")

    const IconComponent = MODE_ICONS[value]

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type='button'
                    className='inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85 hover:border-white/30 hover:text-white transition-colors'
                >
                    <IconComponent className='size-3.5 opacity-70' />
                    <span>{label}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                align='center'
                side='top'
                className='w-48 rounded-xl border-white/10 bg-[#0A0F26] p-2'
            >
                <div className='space-y-1'>
                    {(["auto", "tarot", "horoscope", "chat"] as const).map(
                        (mode) => {
                            const Icon = MODE_ICONS[mode]
                            return (
                                <button
                                    key={mode}
                                    type='button'
                                    onClick={() => handleSelect(mode)}
                                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                        value === mode
                                            ? "bg-yellow-500/20 text-yellow-400"
                                            : "text-white/80 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    <Icon className='size-4 shrink-0' />
                                    {t(mode)}
                                </button>
                            )
                        },
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
