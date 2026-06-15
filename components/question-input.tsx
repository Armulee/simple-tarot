"use client"

import { useEffect, useRef, useState, type RefObject } from "react"
import { CornerDownRight, Send, Square, X } from "lucide-react"
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
import CharacterComposerButton from "@/components/chat/character-composer-button"
import type { Character } from "@/types/character"
import {
    ComposerSettingsMenu,
    type ComposerSettingsMenuProps,
} from "@/components/chat/composer-settings-menu"
import type { InterpretationMode } from "@/lib/interpretation-mode-storage"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"
import { PrivacyHighlightedText } from "@/components/chat/privacy/privacy-highlighted-user-text"

const INPUT_BORDER_BY_MODE: Record<InterpretationMode, string> = {
    auto: "border-border/60 focus:border-primary/60 focus:ring-primary/40",
    chat: "border-emerald-400/30 focus:border-emerald-400/60 focus:ring-emerald-400/30",
    tarot: "border-purple-400/30 focus:border-purple-400/60 focus:ring-purple-400/30",
    horoscope:
        "border-blue-400/30 focus:border-blue-400/60 focus:ring-blue-400/30",
    oracle: "border-amber-300/40 focus:border-amber-300/70 focus:ring-amber-300/30",
}

/** Shared with homepage quick cards so composer chips match exactly. */
export const followUpChipClass =
    "inline-flex max-w-[min(92vw,20rem)] shrink-0 items-center whitespace-nowrap rounded-lg border border-white/12 bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl px-3 py-1.5 text-left text-xs leading-tight text-white/80 transition-colors hover:border-white/28 hover:from-indigo-500/25 hover:via-purple-500/25 hover:to-cyan-500/25 hover:text-white cursor-pointer touch-pan-x"

const INPUT_GLOW_BY_MODE: Record<InterpretationMode, string> = {
    auto: "shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)]",
    chat: "shadow-[0_10px_30px_-10px_rgba(52,211,153,0.3)]",
    tarot: "shadow-[0_10px_30px_-10px_rgba(168,85,247,0.3)]",
    horoscope: "shadow-[0_10px_30px_-10px_rgba(96,165,250,0.3)]",
    oracle: "shadow-[0_10px_30px_-10px_rgba(252,211,77,0.35)]",
}

function chipKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
    action: () => void,
) {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        action()
    }
}

export type ComposerFollowUpsProps = {
    messageId: string
    items: string[]
    onSelect: (value: string) => void
    /** Hides the suggestion strip (and related composer row) for this chat session. */
    onDismissStrip?: () => void
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
    statusStrip,
    disclaimerText,
    showDisclaimer = true,
    error,
    containerRef,
    sectionId,
    wrapperClassName = "",
    inputWrapperClassName = "max-w-sm md:max-w-md",
    enableCharacterMention = false,
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
    /**
     * Transient status display (e.g. share-image download progress). When
     * set, it takes over the composer chrome row that normally hosts the
     * follow-up suggestion strip / action trigger.
     */
    statusStrip?: React.ReactNode
    disclaimerText?: string
    showDisclaimer?: boolean
    error?: React.ReactNode
    containerRef?: RefObject<HTMLDivElement | null>
    sectionId?: string
    wrapperClassName?: string
    inputWrapperClassName?: string
    /** Show the "+" character mention button before the mode selector. */
    enableCharacterMention?: boolean
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

    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Insert an "@CharacterName " mention at the caret (or append). Phase 3
    // adds the pink highlight overlay + id resolution; here we insert plain
    // text so the mention round-trips through the existing string value.
    const handleInsertMention = (character: Character) => {
        const mentionText = `@${character.name} `
        const el = textareaRef.current
        if (!el) {
            setQuestion(question ? `${question} ${mentionText}` : mentionText)
            return
        }
        const start = el.selectionStart ?? question.length
        const end = el.selectionEnd ?? question.length
        const next =
            question.slice(0, start) + mentionText + question.slice(end)
        setQuestion(next)
        const caret = start + mentionText.length
        requestAnimationFrame(() => {
            el.focus()
            try {
                el.setSelectionRange(caret, caret)
            } catch {
                /* ignore */
            }
        })
    }

    const showBottomChrome =
        actionTrigger != null ||
        composerFollowUps != null ||
        composerSettings != null ||
        statusStrip != null

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
            <div className='w-full space-y-2'>
                <div className='flex items-center justify-between gap-3 min-w-0'>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 truncate'>
                        {t("followUpSuggestionLabel")}
                    </p>
                    {composerFollowUps.onDismissStrip ? (
                        <button
                            type='button'
                            onClick={composerFollowUps.onDismissStrip}
                            className='shrink-0 rounded-lg p-1.5 text-white/55 hover:text-white hover:bg-white/10 transition-colors'
                            aria-label={t("dismissFollowUpStrip")}
                        >
                            <X className='size-4' aria-hidden />
                        </button>
                    ) : null}
                </div>
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
                    className='composer-follow-up-swiper w-full touch-pan-x !overflow-visible'
                >
                    {followUpItems.map((s, idx) => (
                        <SwiperSlide
                            key={`${composerFollowUps.messageId}-fu-${idx}`}
                            className='!w-auto !flex-shrink-0 min-w-0'
                        >
                            <div
                                role='button'
                                tabIndex={0}
                                onClick={() => composerFollowUps.onSelect(s)}
                                onKeyDown={(e) =>
                                    chipKeyDown(e, () =>
                                        composerFollowUps.onSelect(s),
                                    )
                                }
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
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
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
                        ref={textareaRef}
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
                            {enableCharacterMention ? (
                                <CharacterComposerButton
                                    onMention={handleInsertMention}
                                />
                            ) : null}
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
                        {statusStrip ?? followUpRow ?? actionTrigger}
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
