"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import type { Character, CreateCharacterInput } from "@/types/character"

/** Thrown by createCharacter/updateCharacter when the user is not on a paid plan. */
export class CharacterPaywallError extends Error {
    requiredTier: string
    constructor(requiredTier: string) {
        super("PAYWALL")
        this.name = "CharacterPaywallError"
        this.requiredTier = requiredTier
    }
}

async function getAccessToken(): Promise<string | null> {
    const {
        data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token ?? null
}

/**
 * Shared module-level store so EVERY useCharacters() consumer (the composer's
 * mention provider, the chat session's routing/redaction logic, the life
 * monitor, …) reads ONE list. Without this, each hook instance kept its own
 * state and a character added/edited in the composer was invisible to the
 * session — so tagging it found no mention and the question fell through to a
 * tarot draw instead of a synastry/character reading.
 */
type CharactersState = { characters: Character[]; loading: boolean }

let state: CharactersState = { characters: [], loading: false }
let loadedUserId: string | null = null
let inFlightUserId: string | null = null
const listeners = new Set<() => void>()

function setState(patch: Partial<CharactersState>) {
    state = { ...state, ...patch }
    for (const l of listeners) l()
}

function subscribe(cb: () => void) {
    listeners.add(cb)
    return () => {
        listeners.delete(cb)
    }
}

async function loadCharacters(userId: string, force = false): Promise<void> {
    if (!force && (loadedUserId === userId || inFlightUserId === userId)) return
    inFlightUserId = userId
    setState({ loading: true })
    try {
        const token = await getAccessToken()
        if (!token) {
            loadedUserId = userId
            setState({ characters: [], loading: false })
            return
        }
        const res = await fetch("/api/characters", {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
            const { characters: data } = await res.json()
            loadedUserId = userId
            setState({
                characters: Array.isArray(data) ? data : [],
                loading: false,
            })
        } else {
            setState({ loading: false })
        }
    } catch {
        // Keep the last known list on transient errors.
        setState({ loading: false })
    } finally {
        inFlightUserId = null
    }
}

/**
 * Loads + mutates the signed-in user's characters from the shared store.
 * Listing is open to every authenticated user; create/update are paywalled
 * server-side and throw CharacterPaywallError for free users so the caller can
 * show an upgrade CTA. Mutations update the shared store, so every consumer
 * stays in sync.
 */
export function useCharacters() {
    const { user } = useAuth()
    const characters = useSyncExternalStore(
        subscribe,
        () => state.characters,
        () => state.characters,
    )
    const loading = useSyncExternalStore(
        subscribe,
        () => state.loading,
        () => state.loading,
    )

    useEffect(() => {
        if (!user) {
            loadedUserId = null
            setState({ characters: [] })
            return
        }
        void loadCharacters(user.id)
    }, [user])

    const refresh = useCallback(async () => {
        if (!user) {
            loadedUserId = null
            setState({ characters: [] })
            return
        }
        await loadCharacters(user.id, true)
    }, [user])

    const createCharacter = useCallback(
        async (input: CreateCharacterInput): Promise<Character> => {
            const token = await getAccessToken()
            if (!token) throw new Error("UNAUTHORIZED")
            const res = await fetch("/api/characters", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(input),
            })
            if (res.status === 402) {
                const body = await res.json().catch(() => ({}))
                throw new CharacterPaywallError(body?.requiredTier ?? "basic")
            }
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body?.error ?? "CREATE_FAILED")
            }
            const { character } = await res.json()
            setState({ characters: [character as Character, ...state.characters] })
            return character as Character
        },
        [],
    )

    const updateCharacter = useCallback(
        async (id: string, input: CreateCharacterInput): Promise<Character> => {
            const token = await getAccessToken()
            if (!token) throw new Error("UNAUTHORIZED")
            const res = await fetch(`/api/characters/${id}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(input),
            })
            if (res.status === 402) {
                const body = await res.json().catch(() => ({}))
                throw new CharacterPaywallError(body?.requiredTier ?? "basic")
            }
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body?.error ?? "UPDATE_FAILED")
            }
            const { character } = await res.json()
            setState({
                characters: state.characters.map((c) =>
                    c.id === id ? (character as Character) : c,
                ),
            })
            return character as Character
        },
        [],
    )

    const deleteCharacter = useCallback(
        async (id: string): Promise<void> => {
            const token = await getAccessToken()
            if (!token) throw new Error("UNAUTHORIZED")
            // Optimistic removal; revert by refreshing if the request fails.
            const previous = state.characters
            setState({ characters: previous.filter((c) => c.id !== id) })
            const res = await fetch(`/api/characters/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) {
                void refresh()
                const body = await res.json().catch(() => ({}))
                throw new Error(body?.error ?? "DELETE_FAILED")
            }
        },
        [refresh],
    )

    return {
        characters,
        loading,
        refresh,
        createCharacter,
        updateCharacter,
        deleteCharacter,
    }
}
