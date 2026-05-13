"use client"

import { useEffect, useState, type RefObject } from "react"
import { CornerDownRight, Send, Square } from "lucide-react"
import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode, Mousewheel } from "swiper/modules"
import "swiper/css"
import "swiper/css/free-mode"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { useRouter } from "next/navigation"
import { useTarot } from "@/contexts/tarot-context"
import AutoHeightTextarea from "./ui/auto-height-textarea"
import { useTranslations } from "next-intl"
import InterpretationModeSelector from "@/components/chat/interpretation-mode-selector"
import {
    ComposerSettingsMenu,
    type ComposerSettingsMenuProps,
} from "@/components/chat/composer-settings-menu"
import type { InterpretationMode } from "@/lib/interpretation-mode-storage"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"
import { PrivacyHighlightedText } from "@/components/chat/privacy-highlighted-user-text"

const INPUT_BORDER_BY_MODE: Record<InterpretationMode, string> = {
    auto: "border-border/60 focus:border-primary/60 focus:ring-primary/40",
    chat: "border-emerald-400/30 focus:border-emerald-400/60 focus:ring-emerald-400/30",
    tarot: "border-purple-400/30 focus:border-purple-400/60 focus:ring-purple-400/30",
    horoscope:
        "border-blue-400/30 focus:border-blue-400/60 focus:ring-blue-400/30",
}

const followUpChipClass =
    "swiper-no-swiping inline-flex max-w-[min(92vw,20rem)] shrink-0 items-center whitespace-nowrap rounded-full border border-white/12 bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl px-3 py-1.5 text-left text-xs leading-tight text-white/80 transition-colors hover:border-white/28 hover:from-indigo-500/25 hover:via-purple-500/25 hover:to-cyan-500/25 hover:text-white cursor-pointer"

const INPUT_GLOW_BY_MODE: Record<InterpretationMode, string> = {
    auto: "shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)]",
    chat: "shadow-[0_10px_30px_-10px_rgba(52,211,153,0.3)]",
    tarot: "shadow-[0_10px_30px_-10px_rgba(168,85,247,0.3)]",
    horoscope: "shadow-[0_10px_30px_-10px_rgba(96,165,250,0.3)]",
}

export type ComposerFollowUpsProps = {
    messageId: string
    items: string[]
    onSelect: (value: string) => void
    privacyAliases?: PromptAliasEntry[]
}

export default function QuestionInput({
    id = "question-input",
    label = "",
    className,
    buttonClassName,
    placeholder,
    defaultValue,
    value,
    onChange,
    onSubmit,
    onStop,
    isLoading = false,
    followUp = false,
    followUpParentId,
    centered = false,
    interpretationMode,
    onInterpretationModeChange,
    composerSettings,
    composerFollowUps,
    actionTrigger,
    disclaimerText,
    showDisclaimer = true,
    error,
    containerRef,
    sectionId,
    wrapperClassName = "",
    inputWrapperClassName = "max-w-sm md:max-w-md",
}: {
    id?: string
    label?: string
    className?: string
    buttonClassName?: string
    placeholder?: string
    defaultValue?: string
    value?: string
    onChange?: (value: string) => void
    onSubmit?: (value: string) => void | Promise<void>
    onStop?: () => void
    isLoading?: boolean
    followUp?: boolean
    followUpParentId?: string
    centered?: boolean
    interpretationMode?: InterpretationMode
    onInterpretationModeChange?: (mode: InterpretationMode) => void
    composerSettings?: ComposerSettingsMenuProps | null
    composerFollowUps?: ComposerFollowUpsProps | null
    actionTrigger?: React.ReactNode
    disclaimerText?: string
    showDisclaimer?: boolean
    error?: React.ReactNode
    containerRef?: RefObject<HTMLDivElement | null>
    sectionId?: string
    wrapperClassName?: string
    inputWrapperClassName?: string
}) {
    const t = useTranslations("QuestionInput")
    const [internalQuestion, setInternalQuestion] = useState("")
    const [isSmallDevice, setIsSmallDevice] = useState(false)
    const router = useRouter()
    const {
        setQuestion: setContextQuestion,
        setCurrentStep,
        setReadingType,
        setSelectedCards,
        setInterpretation,
        setIsFollowUp,
        setFollowUpQuestion,
        question: lastQuestion,
        selectedCards: lastCards,
        interpretation: lastInterpretation,
        clearReadingStorage,
    } = useTarot()

    const question = value !== undefined ? value : internalQuestion
    const setQuestion = onChange || setInternalQuestion

    const showBottomChrome =
        actionTrigger != null ||
        composerFollowUps != null ||
        composerSettings != null

    const handleStartReading = () => {
        const currentValue =
            (question || "").trim() || (defaultValue || "").trim()
        if (currentValue) {
            if (onSubmit) {
                void onSubmit(currentValue)
                return
            }
            if (followUp) {
                handleFollowUpQuestion(currentValue)
            } else {
                clearReadingStorage()

                setContextQuestion(currentValue)
                setIsFollowUp(false)
                setFollowUpQuestion(null)
                setCurrentStep("reading-type")

                try {
                    const payload = JSON.stringify({
                        question: currentValue,
                        readingType: null,
                        selectedCards: [],
                        currentStep: "reading-type",
                        interpretation: null,
                        isFollowUp: false,
                        followUpQuestion: null,
                    })
                    localStorage.setItem("reading-state-v1", payload)
                } catch {}
                router.push("/tarot")
            }
        }
    }

    const handleFollowUpQuestion = (fuQuestion: string) => {
        try {
            const backupData = {
                question: lastQuestion,
                selectedCards: lastCards,
                interpretation: lastInterpretation,
                parentReadingId: followUpParentId || null,
                timestamp: Date.now(),
            }
            localStorage.setItem(
                "reading-state-v1-backup",
                JSON.stringify(backupData),
            )
        } catch (e) {
            console.error("Failed to backup reading data:", e)
        }

        setIsFollowUp(true)
        setFollowUpQuestion(fuQuestion)
        setReadingType("simple")
        setSelectedCards([])
        setInterpretation(null)
        setCurrentStep("card-selection")

        try {
            const payload = JSON.stringify({
                question: lastQuestion,
                readingType: "simple",
                selectedCards: [],
                currentStep: "card-selection",
                interpretation: null,
                isFollowUp: true,
                followUpQuestion: fuQuestion,
                parentReadingId: followUpParentId || null,
            })
            localStorage.setItem("reading-state-v1", payload)
        } catch {
            // ignore
        }

        router.push("/tarot")
    }

    useEffect(() => {
        const checkDevice = () => {
            setIsSmallDevice(
                /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                    navigator.userAgent,
                ),
            )
        }

        checkDevice()
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter") {
            if (!isSmallDevice && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault()
                handleStartReading()
                return
            }
        }
    }

    const aliases = composerFollowUps?.privacyAliases ?? []

    const followUpItems =
        composerFollowUps && composerFollowUps.items.length > 0
            ? composerFollowUps.items.slice(0, 4)
            : []

    const followUpRow =
        composerFollowUps && followUpItems.length > 0 ? (
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
                className='composer-follow-up-swiper w-full !overflow-visible'
            >
                {followUpItems.map((s, idx) => (
                    <SwiperSlide
                        key={`${composerFollowUps.messageId}-fu-${idx}`}
                        className='!w-auto !flex-shrink-0 min-w-0'
                    >
                        <button
                            type='button'
                            onClick={() => composerFollowUps.onSelect(s)}
                            className={followUpChipClass}
                        >
                            <CornerDownRight
                                aria-hidden
                                className='mr-1.5 size-3.5 shrink-0 text-white/55'
                            />
                            <span className='block max-w-[min(92vw,20rem)] truncate'>
                                <PrivacyHighlightedText
                                    text={s}
                                    aliases={aliases}
                                />
                            </span>
                        </button>
                    </SwiperSlide>
                ))}
            </Swiper>
        ) : null

    const inputContent = (
        <div className={`w-full ${centered ? "text-center" : "text-left"}`}>
            <Label
                htmlFor={id}
                className={`block mb-2 text-lg ${centered ? "" : "px-4"}`}
            >
                {label}
            </Label>
            <div className={`w-full ${className ?? "max-w-sm md:max-w-md"}`}>
                <div className='relative group w-full'>
                    <div className='pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(120%_120%_at_0%_0%,rgba(99,102,241,0.18),rgba(168,85,247,0.12)_35%,rgba(34,211,238,0.10)_70%,transparent_80%)] blur-xl opacity-90 group-focus-within:opacity-0 transition-opacity' />
                    <AutoHeightTextarea
                        id={id}
                        name={id}
                        placeholder={placeholder || t("placeholder")}
                        className={`relative z-10 w-full pl-4 pr-15 py-2 text-white placeholder:text-white/70 bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl border ${INPUT_BORDER_BY_MODE[interpretationMode ?? "auto"]} focus:ring-2 rounded-2xl resize-y ${INPUT_GLOW_BY_MODE[interpretationMode ?? "auto"]} resize-none transition-[border-color,box-shadow] duration-500`}
                        onChange={(e) => setQuestion(e.target.value)}
                        value={question}
                        defaultValue={defaultValue}
                        onKeyDown={handleKeyDown}
                    />
                    <Button
                        onClick={isLoading ? onStop : handleStartReading}
                        disabled={
                            !isLoading && !question.trim() && !defaultValue
                        }
                        size='lg'
                        variant='ghost'
                        className={`absolute bottom-0 right-0 z-20 bg-transparent hover:bg-transparent border-0 text-lg disabled:opacity-30 disabled:cursor-not-allowed text-indigo-300 hover:text-white ${
                            buttonClassName ?? ""
                        }`}
                    >
                        <span className='pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-400/50 via-purple-400/50 to-cyan-400/50 opacity-80 hover:opacity-0' />
                        {isLoading ? (
                            <Square className='relative z-10 w-5 h-5 drop-shadow-sm fill-current' />
                        ) : (
                            <Send className='relative z-10 w-5 h-5 drop-shadow-sm' />
                        )}
                    </Button>
                </div>
                {interpretationMode !== undefined &&
                    onInterpretationModeChange && (
                        <div className='mt-2 flex items-center justify-start gap-2'>
                            <InterpretationModeSelector
                                value={interpretationMode}
                                onChange={onInterpretationModeChange}
                            />
                            {composerSettings ? (
                                <ComposerSettingsMenu {...composerSettings} />
                            ) : null}
                        </div>
                    )}
            </div>
        </div>
    )

    if (showBottomChrome) {
        return (
            <div
                className={`border-t border-white/10 bg-[#07060f]/80 backdrop-blur ${wrapperClassName}`}
            >
                <div
                    ref={containerRef}
                    id={sectionId}
                    className='mx-auto w-full max-w-3xl px-4 py-4 space-y-4 transition-all duration-500'
                >
                    {error}
                    <div
                        className={`flex flex-col transition-[max-width] duration-500 ease-in-out ${inputWrapperClassName}`}
                    >
                        {followUpRow ?? actionTrigger}
                        {inputContent}
                    </div>
                    {showDisclaimer && disclaimerText && (
                        <p className='text-[11px] leading-relaxed text-white/50 text-center text-left'>
                            {disclaimerText}
                        </p>
                    )}
                </div>
            </div>
        )
    }

    return inputContent
}
