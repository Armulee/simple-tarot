"use client"

import { useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import {
    Plus,
    UserRound,
    Trash2,
    Crown,
    Paperclip,
    ChevronDown,
    Pencil,
} from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useCharacterMention } from "./character-mention-context"
import type { Character } from "@/types/character"

function formatCharacterBirth(character: Character, locale: string): string {
    try {
        const d = new Date(
            Date.UTC(
                character.birthYear,
                character.birthMonth - 1,
                character.birthDay,
            ),
        )
        const date = new Intl.DateTimeFormat(locale, {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
        }).format(d)
        if (character.birthHour != null && character.birthMinute != null) {
            const time = `${String(character.birthHour).padStart(
                2,
                "0",
            )}:${String(character.birthMinute).padStart(2, "0")}`
            return `${date} · ${time}`
        }
        return date
    } catch {
        return `${character.birthDay}/${character.birthMonth}/${character.birthYear}`
    }
}

type CharacterComposerButtonProps = {
    /** Receives each file picked from the "Add photos or files" option. */
    onAddMedia?: (file: File) => void
}

/**
 * The "+" button shown before the interpretation-mode selector. Opens a menu
 * with "Add photos or files" (opens the picker) and an expandable "Add
 * character" section listing the user's characters (click to mention) plus an
 * "Add" action. Adding/mentioning are paid features; the "Add" option shows a
 * faded crown and opens the paywall for non-paid users.
 */
export default function CharacterComposerButton({
    onAddMedia,
}: CharacterComposerButtonProps) {
    const t = useTranslations("Character")
    const locale = useLocale()
    const {
        characters,
        isPaid,
        insertMention,
        deleteCharacter,
        openAddForm,
        openEditForm,
        openPaywall,
    } = useCharacterMention()
    const [menuOpen, setMenuOpen] = useState(false)
    const [charExpanded, setCharExpanded] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (files && files.length) {
            Array.from(files).forEach((file) => onAddMedia?.(file))
            setMenuOpen(false)
        }
        // Reset so picking the same file again still fires onChange.
        e.target.value = ""
    }

    function handleMention(character: Character) {
        setMenuOpen(false)
        if (!isPaid) {
            openPaywall()
            return
        }
        insertMention(character)
    }

    function handleAddNew() {
        setMenuOpen(false)
        if (!isPaid) {
            openPaywall()
            return
        }
        openAddForm()
    }

    function handleEdit(character: Character) {
        setMenuOpen(false)
        if (!isPaid) {
            openPaywall()
            return
        }
        openEditForm(character)
    }

    async function handleDelete(character: Character) {
        try {
            await deleteCharacter(character.id)
            toast.success(t("deleted", { name: character.name }))
        } catch {
            toast.error(t("errorGeneric"))
        }
    }

    const itemClass =
        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white/85 transition-colors hover:bg-white/10 hover:text-white"

    return (
        <>
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                <PopoverTrigger asChild>
                    <button
                        type='button'
                        aria-label={t("addCharacter")}
                        className='inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-colors hover:border-white/30 hover:text-white'
                    >
                        <Plus className='size-4' aria-hidden />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    align='start'
                    side='top'
                    className='w-72 rounded-xl border-white/10 bg-[#0A0F26] p-2'
                >
                    <button
                        type='button'
                        onClick={() => fileRef.current?.click()}
                        className={itemClass}
                    >
                        <Paperclip className='size-4 shrink-0 text-white/70' />
                        {t("addMedia")}
                    </button>

                    <div className='my-1 h-px bg-white/10' />

                    <button
                        type='button'
                        onClick={() => setCharExpanded((v) => !v)}
                        aria-expanded={charExpanded}
                        className={itemClass}
                    >
                        <UserRound className='size-4 shrink-0 text-white' />
                        <span className='truncate'>{t("addCharacter")}</span>
                        <ChevronDown
                            className={`ml-auto size-4 shrink-0 text-white/40 transition-transform ${
                                charExpanded ? "rotate-180" : ""
                            }`}
                            aria-hidden
                        />
                    </button>

                    {charExpanded ? (
                        <div className='mt-0.5 space-y-0.5 border-l border-white/10 pl-1.5'>
                            <div className='max-h-48 space-y-0.5 overflow-y-auto'>
                                {characters.map((character) => (
                                    <div
                                        key={character.id}
                                        className='group flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-white/10'
                                    >
                                        <button
                                            type='button'
                                            onClick={() =>
                                                handleMention(character)
                                            }
                                            className='flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white/85 hover:text-white'
                                        >
                                            <UserRound className='size-4 shrink-0 text-pink-300' />
                                            <span className='truncate'>
                                                {character.name}
                                            </span>
                                            <span className='ml-auto shrink-0 pl-2 text-[11px] tabular-nums text-white/45'>
                                                {formatCharacterBirth(
                                                    character,
                                                    locale,
                                                )}
                                            </span>
                                        </button>
                                        <button
                                            type='button'
                                            aria-label={t("edit")}
                                            onClick={() =>
                                                handleEdit(character)
                                            }
                                            className='shrink-0 rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-pink-300'
                                        >
                                            <Pencil className='size-3.5' />
                                        </button>
                                        <button
                                            type='button'
                                            aria-label={t("delete")}
                                            onClick={() =>
                                                handleDelete(character)
                                            }
                                            className='shrink-0 rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-red-300'
                                        >
                                            <Trash2 className='size-3.5' />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                type='button'
                                onClick={handleAddNew}
                                className='flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white/85 transition-colors hover:bg-white/10 hover:text-white'
                            >
                                <Plus className='size-4 shrink-0 text-pink-300' />
                                <span className='truncate'>{t("add")}</span>
                                <Crown className='ml-auto size-3.5 shrink-0 text-amber-300/50' />
                            </button>
                        </div>
                    ) : null}
                </PopoverContent>
            </Popover>

            <input
                ref={fileRef}
                type='file'
                multiple
                hidden
                onChange={handleFileChange}
            />
        </>
    )
}
