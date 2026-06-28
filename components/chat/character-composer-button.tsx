"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
    Plus,
    UserRound,
    UserPlus,
    Trash2,
    Crown,
    Camera,
    Paperclip,
    ChevronDown,
    Image as ImageIcon,
} from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useCharacterMention } from "./character-mention-context"
import type { Character } from "@/types/character"

type CharacterComposerButtonProps = {
    /** Receives a file picked from the photo/camera/file options. */
    onAddMedia?: (file: File) => void
}

/**
 * The "+" button shown before the interpretation-mode selector. Opens a menu
 * with attachment options (photo / camera / file) and an expandable "Add
 * character" section listing the user's characters (click to mention) plus an
 * "Add" action. Adding/mentioning are paid features; the "Add" option shows a
 * faded crown and opens the paywall for non-paid users.
 */
export default function CharacterComposerButton({
    onAddMedia,
}: CharacterComposerButtonProps) {
    const t = useTranslations("Character")
    const {
        characters,
        isPaid,
        insertMention,
        deleteCharacter,
        openAddForm,
        openPaywall,
    } = useCharacterMention()
    const [menuOpen, setMenuOpen] = useState(false)
    const [charExpanded, setCharExpanded] = useState(false)
    const photoRef = useRef<HTMLInputElement>(null)
    const cameraRef = useRef<HTMLInputElement>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    function pickFrom(ref: React.RefObject<HTMLInputElement | null>) {
        ref.current?.click()
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) {
            onAddMedia?.(file)
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
                    className='w-60 rounded-xl border-white/10 bg-[#0A0F26] p-2'
                >
                    <button
                        type='button'
                        onClick={() => pickFrom(photoRef)}
                        className={itemClass}
                    >
                        <ImageIcon className='size-4 shrink-0 text-white/70' />
                        {t("addPhoto")}
                    </button>
                    <button
                        type='button'
                        onClick={() => pickFrom(cameraRef)}
                        className={itemClass}
                    >
                        <Camera className='size-4 shrink-0 text-white/70' />
                        {t("takePhoto")}
                    </button>
                    <button
                        type='button'
                        onClick={() => pickFrom(fileRef)}
                        className={itemClass}
                    >
                        <Paperclip className='size-4 shrink-0 text-white/70' />
                        {t("addFile")}
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
                                        </button>
                                        <button
                                            type='button'
                                            aria-label={t("delete")}
                                            onClick={() =>
                                                handleDelete(character)
                                            }
                                            className='shrink-0 rounded-md p-1.5 text-white/35 opacity-0 transition-opacity hover:bg-white/10 hover:text-red-300 focus:opacity-100 group-hover:opacity-100'
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
                                <UserPlus className='size-4 shrink-0 text-pink-300' />
                                <span className='truncate'>{t("add")}</span>
                                <Crown className='ml-auto size-3.5 shrink-0 text-amber-300/50' />
                            </button>
                        </div>
                    ) : null}
                </PopoverContent>
            </Popover>

            <input
                ref={photoRef}
                type='file'
                accept='image/*'
                hidden
                onChange={handleFileChange}
            />
            <input
                ref={cameraRef}
                type='file'
                accept='image/*'
                capture='environment'
                hidden
                onChange={handleFileChange}
            />
            <input
                ref={fileRef}
                type='file'
                hidden
                onChange={handleFileChange}
            />
        </>
    )
}
