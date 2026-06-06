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
import { FaStar, FaMessage, FaWandMagicSparkles } from "react-icons/fa6"
import { TbPlayCardStarFilled } from "react-icons/tb"
import { PiSparkleFill } from "react-icons/pi"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"

const MODE_ICONS = {
    auto: PiSparkleFill,
    chat: FaMessage,
    tarot: TbPlayCardStarFilled,
    horoscope: FaStar,
    oracle: FaWandMagicSparkles,
} as const

const MODE_THEME = {
    auto: {
        border: "border-white/15 hover:border-white/30",
        text: "text-white/85 hover:text-white",
        icon: "text-white/70",
        activeBg: "bg-yellow-500/20",
        activeText: "text-yellow-400",
        flare: "shadow-[0_0_18px_4px_rgba(234,179,8,0.5)]",
    },
    chat: {
        border: "border-emerald-400/40 hover:border-emerald-400/60",
        text: "text-emerald-300 hover:text-emerald-200",
        icon: "text-emerald-400",
        activeBg: "bg-emerald-500/20",
        activeText: "text-emerald-400",
        flare: "shadow-[0_0_18px_4px_rgba(52,211,153,0.55)]",
    },
    tarot: {
        border: "border-purple-400/40 hover:border-purple-400/60",
        text: "text-purple-300 hover:text-purple-200",
        icon: "text-purple-400",
        activeBg: "bg-purple-500/20",
        activeText: "text-purple-400",
        flare: "shadow-[0_0_18px_4px_rgba(168,85,247,0.55)]",
    },
    horoscope: {
        border: "border-blue-400/40 hover:border-blue-400/60",
        text: "text-blue-300 hover:text-blue-200",
        icon: "text-blue-400",
        activeBg: "bg-blue-500/20",
        activeText: "text-blue-400",
        flare: "shadow-[0_0_18px_4px_rgba(96,165,250,0.55)]",
    },
    oracle: {
        border: "border-amber-300/40 hover:border-amber-300/60",
        text: "text-amber-200 hover:text-amber-100",
        icon: "text-amber-300",
        activeBg: "bg-amber-400/20",
        activeText: "text-amber-300",
        flare: "shadow-[0_0_18px_4px_rgba(252,211,77,0.6)]",
    },
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
    const { user } = useAuth()
    const isAuthenticated = Boolean(user)
    const [open, setOpen] = useState(false)
    const [flare, setFlare] = useState(false)
    const isFirstRender = useRef(true)

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        setFlare(true)
        const timer = setTimeout(() => setFlare(false), 600)
        return () => clearTimeout(timer)
    }, [value])

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
                : value === "oracle"
                  ? t("oracle")
                  : t("chat")

    const IconComponent = MODE_ICONS[value]
    const theme = MODE_THEME[value]

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type='button'
                    className={`relative inline-flex items-center gap-1.5 rounded-full border bg-white/5 px-3 py-1.5 text-xs transition-all duration-300 ${theme.border} ${theme.text} ${flare ? theme.flare : ""}`}
                >
                    <span className={`relative transition-colors duration-300 ${theme.icon}`}>
                        <IconComponent className='size-3.5' />
                        {flare && (
                            <span
                                className='pointer-events-none absolute inset-0 animate-ping rounded-full'
                                style={{ animationDuration: "600ms", animationIterationCount: 1 }}
                            />
                        )}
                    </span>
                    <span>{label}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                align='center'
                side='top'
                className='w-48 rounded-xl border-white/10 bg-[#0A0F26] p-2'
            >
                <div className='space-y-1'>
                    {(
                        [
                            "auto",
                            "chat",
                            "tarot",
                            "horoscope",
                            "oracle",
                        ] as const
                    ).map(
                        (mode) => {
                            const Icon = MODE_ICONS[mode]
                            const mt = MODE_THEME[mode]
                            const horoscopeLocked =
                                mode === "horoscope" && !isAuthenticated
                            return (
                                <button
                                    key={mode}
                                    type='button'
                                    disabled={horoscopeLocked}
                                    title={
                                        horoscopeLocked
                                            ? t("horoscopeLoginRequired")
                                            : undefined
                                    }
                                    onClick={() => {
                                        if (horoscopeLocked) return
                                        handleSelect(mode)
                                    }}
                                    className={`flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                        horoscopeLocked
                                            ? "cursor-not-allowed opacity-45"
                                            : ""
                                    } ${
                                        value === mode
                                            ? `${mt.activeBg} ${mt.activeText}`
                                            : "text-white/80 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    <span className='flex w-full items-center gap-2'>
                                        <Icon className='size-4 shrink-0' />
                                        {t(mode)}
                                    </span>
                                    {horoscopeLocked ? (
                                        <span className='pl-6 text-[11px] leading-tight text-white/45'>
                                            {t("horoscopeLoginRequired")}
                                        </span>
                                    ) : null}
                                </button>
                            )
                        },
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

export { MODE_THEME }
