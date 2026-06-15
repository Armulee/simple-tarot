"use client"

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { useTranslations } from "next-intl"
import { UserRound, UserPlus, Crown } from "lucide-react"
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from "@/components/ui/popover"
import { useCharacterMention } from "./character-mention-context"
import {
    INPUT_BORDER_BY_MODE,
    INPUT_GLOW_BY_MODE,
} from "./composer-input-styles"
import {
    findMentionRanges,
    getActiveMentionQuery,
    splitIntoMentionSegments,
    type ActiveMentionQuery,
} from "@/lib/chat/character-mentions"
import type { InterpretationMode } from "@/lib/interpretation-mode-storage"
import type { Character } from "@/types/character"

// Padding + type ramp shared by the textarea and its highlight backdrop. They
// MUST match exactly so the pink highlight lines up with the typed text.
const TEXT_BOX = "pl-4 pr-15 py-2 text-base md:text-sm leading-6"

type MentionTextareaProps = {
    id?: string
    value: string
    onChange: (value: string) => void
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
    placeholder?: string
    interpretationMode: InterpretationMode
}

/**
 * Composer textarea that highlights "@CharacterName" mentions in pink and
 * shows a character picker while typing "@". Uses the classic overlay
 * technique: a transparent-text <textarea> on top of an aria-hidden backdrop
 * that paints the pink highlight behind the mention spans.
 */
export default function MentionTextarea({
    id,
    value,
    onChange,
    onKeyDown,
    placeholder,
    interpretationMode,
}: MentionTextareaProps) {
    const t = useTranslations("Character")
    const { characters, isPaid, textareaRef, replaceActiveMention, openPaywall, openAddForm } =
        useCharacterMention()
    const backdropRef = useRef<HTMLDivElement>(null)
    const [activeQuery, setActiveQuery] = useState<ActiveMentionQuery | null>(
        null,
    )
    const [highlightedIndex, setHighlightedIndex] = useState(0)

    const border = INPUT_BORDER_BY_MODE[interpretationMode]
    const glow = INPUT_GLOW_BY_MODE[interpretationMode]

    const ranges = useMemo(
        () => findMentionRanges(value, characters),
        [value, characters],
    )
    const segments = useMemo(
        () => splitIntoMentionSegments(value, ranges),
        [value, ranges],
    )

    const filtered = useMemo(() => {
        if (!activeQuery) return []
        const q = activeQuery.query.toLowerCase()
        return characters
            .filter((c) => c.name.toLowerCase().includes(q))
            .slice(0, 6)
    }, [activeQuery, characters])

    const adjustHeight = useCallback(() => {
        const el = textareaRef.current
        if (!el) return
        el.style.height = "40px"
        el.style.height = `${el.scrollHeight}px`
    }, [textareaRef])

    useEffect(() => {
        adjustHeight()
    }, [value, adjustHeight])

    const syncScroll = useCallback(() => {
        const el = textareaRef.current
        const bd = backdropRef.current
        if (el && bd) {
            bd.scrollTop = el.scrollTop
            bd.scrollLeft = el.scrollLeft
        }
    }, [textareaRef])

    const refreshActiveQuery = useCallback(() => {
        const el = textareaRef.current
        if (!el) {
            setActiveQuery(null)
            return
        }
        const caret = el.selectionStart ?? value.length
        setActiveQuery(getActiveMentionQuery(value, caret))
        setHighlightedIndex(0)
    }, [textareaRef, value])

    // Re-evaluate the active "@query" whenever the value changes.
    useEffect(() => {
        refreshActiveQuery()
    }, [refreshActiveQuery])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value)
        setTimeout(adjustHeight, 0)
    }

    const pick = useCallback(
        (character: Character) => {
            if (!activeQuery) return
            setActiveQuery(null)
            if (!isPaid) {
                openPaywall()
                return
            }
            replaceActiveMention(character, activeQuery.start)
        },
        [activeQuery, isPaid, openPaywall, replaceActiveMention],
    )

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (activeQuery) {
            if (e.key === "Escape") {
                e.preventDefault()
                setActiveQuery(null)
                return
            }
            if (isPaid && filtered.length > 0) {
                if (e.key === "ArrowDown") {
                    e.preventDefault()
                    setHighlightedIndex((i) => (i + 1) % filtered.length)
                    return
                }
                if (e.key === "ArrowUp") {
                    e.preventDefault()
                    setHighlightedIndex(
                        (i) => (i - 1 + filtered.length) % filtered.length,
                    )
                    return
                }
                if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault()
                    pick(filtered[highlightedIndex] ?? filtered[0])
                    return
                }
            }
        }
        onKeyDown?.(e)
    }

    // Open the picker whenever an "@query" is active. For paid users it shows
    // the matches, an empty "create one" state, or "not found"; everyone else
    // sees the "paid only" notice.
    const popoverOpen = activeQuery !== null

    return (
        <Popover
            open={popoverOpen}
            onOpenChange={(open) => {
                if (!open) setActiveQuery(null)
            }}
        >
            <PopoverAnchor asChild>
                <div
                    className={`relative w-full rounded-2xl border bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl ${border} ${glow} transition-[border-color,box-shadow] duration-500 focus-within:ring-2 focus-within:ring-white/15`}
                >
                    <div
                        ref={backdropRef}
                        aria-hidden
                        className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-2xl text-left text-transparent ${TEXT_BOX}`}
                    >
                        {segments.map((seg, i) =>
                            seg.mention ? (
                                <mark
                                    key={i}
                                    className='rounded bg-pink-500/30 text-transparent'
                                >
                                    {seg.text}
                                </mark>
                            ) : (
                                <span key={i}>{seg.text}</span>
                            ),
                        )}
                    </div>
                    <textarea
                        id={id}
                        name={id}
                        ref={textareaRef}
                        value={value}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onSelect={refreshActiveQuery}
                        onClick={refreshActiveQuery}
                        onScroll={syncScroll}
                        placeholder={placeholder}
                        rows={1}
                        className={`relative z-10 block w-full resize-none bg-transparent text-left text-white caret-white placeholder:text-white/70 outline-none min-h-[40px] max-h-[200px] overflow-y-auto overflow-x-hidden scrollbar-hide ${TEXT_BOX}`}
                    />
                </div>
            </PopoverAnchor>
            <PopoverContent
                align='start'
                side='top'
                sideOffset={8}
                onOpenAutoFocus={(e) => e.preventDefault()}
                className='w-60 rounded-xl border-white/10 bg-[#0A0F26] p-2'
            >
                {!isPaid ? (
                    <div className='space-y-2 p-1'>
                        <p className='flex items-center gap-1.5 text-xs leading-snug text-white/80'>
                            <Crown className='size-3.5 shrink-0 text-amber-300' />
                            {t("mentionPaidOnly")}
                        </p>
                        <button
                            type='button'
                            onMouseDown={(e) => {
                                e.preventDefault()
                                setActiveQuery(null)
                                openPaywall()
                            }}
                            className='w-full rounded-lg bg-pink-500/20 px-3 py-1.5 text-xs font-medium text-pink-100 transition-colors hover:bg-pink-500/30'
                        >
                            {t("paywallFeature")}
                        </button>
                    </div>
                ) : characters.length === 0 ? (
                    <div className='space-y-2 p-1'>
                        <p className='text-xs text-white/70'>
                            {t("menuEmpty")}
                        </p>
                        <button
                            type='button'
                            onMouseDown={(e) => {
                                e.preventDefault()
                                setActiveQuery(null)
                                openAddForm()
                            }}
                            className='flex w-full items-center justify-center gap-2 rounded-lg bg-pink-500/20 px-3 py-1.5 text-xs font-medium text-pink-100 transition-colors hover:bg-pink-500/30'
                        >
                            <UserPlus className='size-3.5 shrink-0' />
                            {t("menuAddNew")}
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <p className='px-2 py-2 text-center text-xs text-white/60'>
                        {t("mentionNotFound")}
                    </p>
                ) : (
                    <div className='max-h-56 space-y-0.5 overflow-y-auto'>
                        {filtered.map((character, idx) => (
                            <button
                                key={character.id}
                                type='button'
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    pick(character)
                                }}
                                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${
                                    idx === highlightedIndex
                                        ? "bg-white/10 text-white"
                                        : "text-white/85 hover:bg-white/10 hover:text-white"
                                }`}
                            >
                                <UserRound className='size-4 shrink-0 text-pink-300' />
                                <span className='truncate'>
                                    {character.name}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
