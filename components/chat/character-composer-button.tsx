"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Plus, UserRound, UserPlus, Trash2, Crown } from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useCharacterMention } from "./character-mention-context"
import type { Character } from "@/types/character"

/**
 * The "+" button shown before the interpretation-mode selector. Opens a menu
 * of the user's saved characters (click to mention) plus an "Add new
 * character" action. Adding and mentioning are paid features — free users get
 * the upgrade paywall. All shared state (list, form, paywall) lives in the
 * CharacterMentionProvider so this menu and the "@" picker stay in sync.
 */
export default function CharacterComposerButton() {
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

    return (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
                <button
                    type='button'
                    aria-label={t("menuAddNew")}
                    className='inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-colors hover:border-white/30 hover:text-white'
                >
                    <Plus className='size-4' aria-hidden />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align='start'
                side='top'
                className='w-56 rounded-xl border-white/10 bg-[#0A0F26] p-2'
            >
                {characters.length > 0 ? (
                    <>
                        <p className='px-2 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45'>
                            {t("menuTitle")}
                        </p>
                        <div className='max-h-56 space-y-0.5 overflow-y-auto'>
                            {characters.map((character) => (
                                <div
                                    key={character.id}
                                    className='group flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-white/10'
                                >
                                    <button
                                        type='button'
                                        onClick={() => handleMention(character)}
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
                                        onClick={() => handleDelete(character)}
                                        className='shrink-0 rounded-md p-1.5 text-white/35 opacity-0 transition-opacity hover:bg-white/10 hover:text-red-300 focus:opacity-100 group-hover:opacity-100'
                                    >
                                        <Trash2 className='size-3.5' />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className='my-1 h-px bg-white/10' />
                    </>
                ) : null}

                <button
                    type='button'
                    onClick={handleAddNew}
                    className='flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white/85 transition-colors hover:bg-white/10 hover:text-white'
                >
                    <UserPlus className='size-4 shrink-0 text-white' />
                    <span className='truncate'>{t("menuAddNew")}</span>
                    <Crown className='ml-auto size-3.5 shrink-0 text-amber-300' />
                </button>
            </PopoverContent>
        </Popover>
    )
}
