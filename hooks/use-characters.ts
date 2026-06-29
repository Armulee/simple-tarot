"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import type { Character, CreateCharacterInput } from "@/types/character"

/** Thrown by createCharacter when the user is not on a paid plan. */
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
 * Loads + mutates the signed-in user's characters. Listing is open to every
 * authenticated user; createCharacter is paywalled server-side and throws
 * CharacterPaywallError for free users so the caller can show an upgrade CTA.
 */
export function useCharacters() {
    const { user } = useAuth()
    const [characters, setCharacters] = useState<Character[]>([])
    const [loading, setLoading] = useState(false)

    const refresh = useCallback(async () => {
        if (!user) {
            setCharacters([])
            return
        }
        setLoading(true)
        try {
            const token = await getAccessToken()
            if (!token) {
                setCharacters([])
                return
            }
            const res = await fetch("/api/characters", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                const { characters: data } = await res.json()
                setCharacters(Array.isArray(data) ? data : [])
            }
        } catch {
            // Keep the last known list on transient errors.
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        void refresh()
    }, [refresh])

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
            setCharacters((prev) => [character as Character, ...prev])
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
            setCharacters((prev) =>
                prev.map((c) => (c.id === id ? (character as Character) : c)),
            )
            return character as Character
        },
        [],
    )

    const deleteCharacter = useCallback(
        async (id: string): Promise<void> => {
            const token = await getAccessToken()
            if (!token) throw new Error("UNAUTHORIZED")
            // Optimistic removal; revert by refreshing if the request fails.
            setCharacters((prev) => prev.filter((c) => c.id !== id))
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
