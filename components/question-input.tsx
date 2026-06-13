"use client"

import { useEffect, useState, type RefObject } from "react"
import {
    CornerDownRight,
    Image as ImageIcon,
    Paperclip,
    Send,
    Square,
    X,
} from "lucide-react"
import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode, Mousewheel } from "swiper/modules"
import "swiper/css"
import "swiper/css/free-mode"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { useTarot } from "@/contexts/tarot-context"
import { useAuth } from "@/hooks/use-auth"
import {
    AvatarChatToggle,
    type ComposerTarget,
} from "@/components/chat/avatar-chat-toggle"
import {
    newComposerSessionId,
    persistInitialQuestion,
} from "@/lib/avatar/composer-handoff"
import AutoHeightTextarea from "./ui/auto-height-textarea"
import { useTranslations } from "next-intl"
import InterpretationModeSelector from "@/components/chat/interpretation-mode-selector"
import CharacterComposerButton from "@/components/chat/character-composer-button"
import MentionTextarea from "@/components/chat/mention-textarea"
import { CharacterMentionProvider } from "@/components/chat/character-mention-context"
import {
    ComposerSettingsMenu,
    type ComposerSettingsMenuProps,
} from "@/components/chat/composer-settings-menu"
import type { InterpretationMode } from "@/lib/interpretation-mode-storage"
import {
    INPUT_BORDER_BY_MODE,
    INPUT_GLOW_BY_MODE,
} from "@/components/chat/composer-input-styles"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"
import { PrivacyHighlightedText } from "@/components/chat/privacy/privacy-highlighted-user-text"

/** Shared with homepage quick cards so composer chips match exactly. */
export const followUpChipClass =
    "inline-flex max-w-[min(92vw,20rem)] shrink-0 items-center whitespace-nowrap rounded-lg border border-white/12 bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl px-3 py-1.5 text-left text-xs leading-tight text-white/80 transition-colors hover:border-white/28 hover:from-indigo-500/25 hover:via-purple-500/25 hover:to-cyan-500/25 hover:text-white cursor-pointer touch-pan-x"

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
    composerTarget,
    onComposerTargetChange,
    onAvatarSubmit,
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
    /** Avatar/chat toggle state. When set, the toggle renders in the bottom row. */
    composerTarget?: ComposerTarget
    onComposerTargetChange?: (target: ComposerTarget) => void
    /**
     * Override for avatar-mode submit (used on the /avatar page to reveal in
     * place). When omitted, avatar-mode submit creates a session and navigates
     * to /avatar/{ref} with the question as the initial message.
     */
    onAvatarSubmit?: (value: string) => void | Promise<void>
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
    const locale = useLocale()
    const { user } = useAuth()
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

    // Attachments picked from the "+" menu. Shown as chips in the composer;
    // not yet wired into the reading pipeline.
    const [attachments, setAttachments] = useState<File[]>([])
    const handleAddMedia = (file: File) =>
        setAttachments((prev) => [...prev, file].slice(0, 8))
    const removeAttachment = (index: number) =>
        setAttachments((prev) => prev.filter((_, i) => i !== index))

    const showBottomChrome =
        actionTrigger != null ||
        composerFollowUps != null ||
        composerSettings != null ||
        statusStrip != null

    const handleAvatarSubmit = async (value: string) => {
        // On the /avatar page the parent handles the reveal in place.
        if (onAvatarSubmit) {
            void onAvatarSubmit(value)
            return
        }
        // Elsewhere: persist the question as a session and hand off to /avatar,
        // mirroring how the text chat creates a session reference in the URL.
        const id = newComposerSessionId()
        const ok = await persistInitialQuestion({
            id,
            question: value,
            userId: user?.id ?? null,
        })
        const target = ok ? `/${locale}/avatar/${id}` : `/${locale}/avatar`
        try {
            router.prefetch(target)
        } catch {}
        router.push(target)
    }

    const handleStartReading = () => {
        const currentValue =
            (question || "").trim() || (defaultValue || "").trim()
        if (currentValue) {
            setAttachments([])
            if (composerTarget === "avatar") {
                void handleAvatarSubmit(currentValue)
                return
            }
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
                {attachments.length > 0 && (
                    <div className='mb-2 flex flex-wrap gap-1.5'>
                        {attachments.map((file, i) => (
                            <span
                                key={`${file.name}-${i}`}
                                className='inline-flex max-w-[12rem] items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/80'
                            >
                                {file.type.startsWith("image/") ? (
                                    <ImageIcon className='size-3.5 shrink-0 text-white/60' />
                                ) : (
                                    <Paperclip className='size-3.5 shrink-0 text-white/60' />
                                )}
                                <span className='truncate'>{file.name}</span>
                                <button
                                    type='button'
                                    onClick={() => removeAttachment(i)}
                                    aria-label={t("removeAttachment")}
                                    className='shrink-0 text-white/50 hover:text-white'
                                >
                                    <X className='size-3' />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
                <div className='relative group w-full'>
                    <div className='pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(120%_120%_at_0%_0%,rgba(99,102,241,0.18),rgba(168,85,247,0.12)_35%,rgba(34,211,238,0.10)_70%,transparent_80%)] blur-xl opacity-90 group-focus-within:opacity-0 transition-opacity' />
                    {enableCharacterMention ? (
                        <MentionTextarea
                            id={id}
                            value={question}
                            onChange={setQuestion}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder || t("placeholder")}
                            interpretationMode={interpretationMode ?? "auto"}
                        />
                    ) : (
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
                    )}
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
                {((composerTarget !== undefined && onComposerTargetChange) ||
                    (interpretationMode !== undefined &&
                        onInterpretationModeChange)) && (
                    <div className='mt-2 flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-2'>
                            {composerTarget !== undefined &&
                                onComposerTargetChange && (
                                    <AvatarChatToggle
                                        value={composerTarget}
                                        onChange={onComposerTargetChange}
                                    />
                                )}
                        </div>
                        <div className='flex items-center gap-2'>
                            {enableCharacterMention ? (
                                <CharacterComposerButton
                                    onAddMedia={handleAddMedia}
                                />
                            ) : null}
                            {interpretationMode !== undefined &&
                                onInterpretationModeChange && (
                                    <InterpretationModeSelector
                                        value={interpretationMode}
                                        onChange={onInterpretationModeChange}
                                    />
                                )}
                            {composerSettings ? (
                                <ComposerSettingsMenu {...composerSettings} />
                            ) : null}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )

    // When mentions are enabled, wrap the composer in the provider that owns
    // the character list, the add form, and the paywall (shared by the "+"
    // menu and the "@" picker).
    const composed = enableCharacterMention ? (
        <CharacterMentionProvider value={question} onChange={setQuestion}>
            {inputContent}
        </CharacterMentionProvider>
    ) : (
        inputContent
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
                        {composed}
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

    return composed
}
