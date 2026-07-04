"use client"

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react"
import { UserPlus } from "lucide-react"
import { useTranslations } from "next-intl"
import { CharacterFormDialog } from "@/components/characters/character-form-dialog"
import {
    PaywallDialog,
    type PaywallTier,
} from "@/components/subscription/paywall-dialog"
import { useCharacters } from "@/hooks/use-characters"
import { useActiveSubscription } from "@/hooks/use-active-subscription"
import { canManageCharacters } from "@/lib/payments/plan-limits"
import type { Character } from "@/types/character"

type CharacterMentionContextValue = {
    characters: Character[]
    /** Whether the user may add/mention characters (paid plans only). */
    isPaid: boolean
    /** Attached by the mention textarea to its underlying <textarea>. */
    textareaRef: React.RefObject<HTMLTextAreaElement | null>
    /** Insert "@Name " at the caret (used by the "+" menu). */
    insertMention: (character: Character) => void
    /** Replace the active "@query" (queryStart..caret) with "@Name ". */
    replaceActiveMention: (character: Character, queryStart: number) => void
    deleteCharacter: (id: string) => Promise<void>
    openAddForm: () => void
    /** Open the form pre-filled to edit an existing character. */
    openEditForm: (character: Character) => void
    openPaywall: () => void
}

const CharacterMentionContext =
    createContext<CharacterMentionContextValue | null>(null)

export function useCharacterMention(): CharacterMentionContextValue {
    const value = useContext(CharacterMentionContext)
    if (!value) {
        throw new Error(
            "useCharacterMention must be used within a CharacterMentionProvider",
        )
    }
    return value
}

/**
 * Single source of truth for character-mention state inside one composer:
 * the character list, the paid gate, caret-aware mention insertion, and the
 * shared add-character form + paywall dialogs. Mounted only when mentions are
 * enabled, so non-mention composers pay no cost.
 */
export function CharacterMentionProvider({
    value,
    onChange,
    children,
}: {
    value: string
    onChange: (value: string) => void
    children: ReactNode
}) {
    const t = useTranslations("Character")
    const { characters, createCharacter, updateCharacter, deleteCharacter } =
        useCharacters()
    const { subscription } = useActiveSubscription()
    const isPaid = canManageCharacters(subscription?.tier)
    const tier: PaywallTier = subscription?.tier ?? "free"

    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const [formOpen, setFormOpen] = useState(false)
    const [editingCharacter, setEditingCharacter] = useState<Character | null>(
        null,
    )
    const [paywallOpen, setPaywallOpen] = useState(false)

    const applyInsert = useCallback(
        (start: number, end: number, text: string) => {
            const next = value.slice(0, start) + text + value.slice(end)
            onChange(next)
            const caret = start + text.length
            requestAnimationFrame(() => {
                const el = textareaRef.current
                if (!el) return
                el.focus()
                try {
                    el.setSelectionRange(caret, caret)
                } catch {
                    /* ignore */
                }
            })
        },
        [value, onChange],
    )

    const insertMention = useCallback(
        (character: Character) => {
            const el = textareaRef.current
            const start = el?.selectionStart ?? value.length
            const end = el?.selectionEnd ?? value.length
            // Keep the mention a separate word: add a leading space when the
            // preceding character isn't whitespace (and a trailing space).
            const prevChar = value.slice(0, start).slice(-1)
            const lead = prevChar === "" || !/\s/.test(prevChar) ? " " : ""
            applyInsert(start, end, `${lead}@${character.name} `)
        },
        [applyInsert, value],
    )

    const replaceActiveMention = useCallback(
        (character: Character, queryStart: number) => {
            const el = textareaRef.current
            const caret = el?.selectionStart ?? value.length
            const prevChar = value.slice(0, queryStart).slice(-1)
            const lead = prevChar === "" || !/\s/.test(prevChar) ? " " : ""
            applyInsert(queryStart, caret, `${lead}@${character.name} `)
        },
        [applyInsert, value],
    )

    const openAddForm = useCallback(() => {
        setEditingCharacter(null)
        setFormOpen(true)
    }, [])
    const openEditForm = useCallback((character: Character) => {
        setEditingCharacter(character)
        setFormOpen(true)
    }, [])
    const openPaywall = useCallback(() => setPaywallOpen(true), [])

    const ctx = useMemo<CharacterMentionContextValue>(
        () => ({
            characters,
            isPaid,
            textareaRef,
            insertMention,
            replaceActiveMention,
            deleteCharacter,
            openAddForm,
            openEditForm,
            openPaywall,
        }),
        [
            characters,
            isPaid,
            insertMention,
            replaceActiveMention,
            deleteCharacter,
            openAddForm,
            openEditForm,
            openPaywall,
        ],
    )

    return (
        <CharacterMentionContext.Provider value={ctx}>
            {children}
            <CharacterFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                onCreate={createCharacter}
                character={editingCharacter}
                onUpdate={updateCharacter}
            />
            <PaywallDialog
                open={paywallOpen}
                onOpenChange={setPaywallOpen}
                requiredTier='basic'
                currentTier={tier}
                title={t("paywallTitle")}
                description={t("paywallDescription")}
                feature={t("paywallFeature")}
                icon={<UserPlus className='h-6 w-6 text-pink-300' />}
            />
        </CharacterMentionContext.Provider>
    )
}
