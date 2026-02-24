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
import { Sparkles } from "lucide-react"
import { useState } from "react"

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
              : t("horoscope")

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type='button'
                    className='inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85 hover:border-white/30 hover:text-white transition-colors'
                >
                    <Sparkles className='size-3.5 opacity-70' />
                    <span>{label}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                align='center'
                side='top'
                className='w-48 rounded-xl border-white/10 bg-[#0A0F26] p-2'
            >
                <div className='space-y-1'>
                    <button
                        type='button'
                        onClick={() => handleSelect("auto")}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            value === "auto"
                                ? "bg-primary/20 text-primary"
                                : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                        {t("auto")}
                    </button>
                    <button
                        type='button'
                        onClick={() => handleSelect("tarot")}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            value === "tarot"
                                ? "bg-primary/20 text-primary"
                                : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                        {t("tarot")}
                    </button>
                    <button
                        type='button'
                        onClick={() => handleSelect("horoscope")}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            value === "horoscope"
                                ? "bg-primary/20 text-primary"
                                : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                        {t("horoscope")}
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
