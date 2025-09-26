"use client"

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react"
import { useAuth } from "@/hooks/use-auth"
import { starAdd, starGetOrCreate, starRefresh, starSpend } from "@/lib/stars"
import { hasCookieConsent } from "@/components/cookie-consent"

interface StarsContextType {
	stars: number
	initialized: boolean
	addStars: (amount: number) => void
	spendStars: (amount: number) => boolean
	resetStars: (value?: number) => void
	nextRefillAt?: number | null
    refillCap: number
}

const StarsContext = createContext<StarsContextType | undefined>(undefined)
const DEFAULT_STARS = 5
const REFILL_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

export function StarsProvider({ children }: { children: ReactNode }) {

    const [stars, setStars] = useState<number>(DEFAULT_STARS)
	const [initialized, setInitialized] = useState(false)
	const [nextRefillAt, setNextRefillAt] = useState<number | null>(null)
	const { user } = useAuth()

	// Refill cap: anonymous 5, signed-in 15
	const refillCap = user ? 15 : 5

	// Helper to compute next refill timestamp from lastRefill and current balance
	const computeNextRefillAt = useCallback(
		(current: number, lastRefillMs: number | null, cap: number): number | null => {
			if (current >= cap) return null
			const base = lastRefillMs ?? Date.now()
			return base + REFILL_INTERVAL_MS
		},
		[]
	)

	// Initial fetch and whenever auth state changes, load state from Supabase
    useEffect(() => {
		let cancelled = false
		;(async () => {
			try {
                if (!hasCookieConsent()) return
				const state = await starGetOrCreate(user ?? null)
				if (cancelled) return
				setStars(state.currentStars)
				setNextRefillAt(computeNextRefillAt(state.currentStars, state.lastRefillAt, refillCap))
			} finally {
				if (!cancelled) setInitialized(true)
			}
		})()
		return () => {
			cancelled = true
		}
    }, [user, refillCap, computeNextRefillAt])

	// Periodic refresh to apply server-side refills
    useEffect(() => {
		if (!initialized) return
        if (!hasCookieConsent()) return
		let mounted = true
		const tick = async () => {
			try {
				const state = await starRefresh(user ?? null)
				if (!mounted) return
				setStars(state.currentStars)
				setNextRefillAt(computeNextRefillAt(state.currentStars, state.lastRefillAt, refillCap))
			} catch {}
		}
		// immediate then interval
		tick()
		const id = window.setInterval(tick, 30 * 1000)
		return () => {
			mounted = false
			window.clearInterval(id)
		}
	}, [initialized, user, refillCap, computeNextRefillAt])

	const addStars = useCallback((amount: number) => {
		if (!Number.isFinite(amount) || amount <= 0) return
		// Optimistic update
    setStars((prev: number) => Math.max(0, prev + amount))
		;(async () => {
			try {
				const state = await starAdd(user ?? null, amount)
				setStars(state.currentStars)
				setNextRefillAt(computeNextRefillAt(state.currentStars, state.lastRefillAt, refillCap))
			} catch {
				// On failure, trigger a refresh to reconcile
				try {
					const state = await starRefresh(user ?? null)
					setStars(state.currentStars)
					setNextRefillAt(computeNextRefillAt(state.currentStars, state.lastRefillAt, refillCap))
				} catch {}
			}
		})()
	}, [user, computeNextRefillAt, refillCap])

	const spendStars = useCallback((amount: number) => {
		if (!Number.isFinite(amount) || amount <= 0) return false
		if (!initialized) return false
		let success = false
    setStars((prev: number) => {
			if (prev >= amount) {
				success = true
				const next = prev - amount
				// If dropping below cap, next refill starts 1 hour from now
				const nextRefill = next < refillCap && prev >= refillCap ? Date.now() + REFILL_INTERVAL_MS : nextRefillAt
				if (nextRefill !== nextRefillAt) setNextRefillAt(nextRefill ?? null)
				return next
			}
			return prev
		})
		if (!success) return false
		// Commit in background; reconcile with server state
		;(async () => {
			try {
				const { ok, state } = await starSpend(user ?? null, amount)
				if (!ok) {
					// revert by refreshing from server
					const refreshed = await starGetOrCreate(user ?? null)
					setStars(refreshed.currentStars)
					setNextRefillAt(computeNextRefillAt(refreshed.currentStars, refreshed.lastRefillAt, refillCap))
					return
				}
				setStars(state.currentStars)
				setNextRefillAt(computeNextRefillAt(state.currentStars, state.lastRefillAt, refillCap))
			} catch {
				try {
					const refreshed = await starGetOrCreate(user ?? null)
					setStars(refreshed.currentStars)
					setNextRefillAt(computeNextRefillAt(refreshed.currentStars, refreshed.lastRefillAt, refillCap))
				} catch {}
			}
		})()
		return true
	}, [initialized, user, refillCap, computeNextRefillAt, nextRefillAt])

	const resetStars = useCallback((value?: number) => {
		const next = Number.isFinite(value as number) ? Math.max(0, Number(value)) : DEFAULT_STARS
		// Compute delta and use add
    setStars((prev: number) => {
			const delta = next - prev
			if (delta !== 0) addStars(delta)
			return next
		})
	}, [addStars])

    const value = useMemo<StarsContextType>(
        () => ({ stars, initialized, addStars, spendStars, resetStars, nextRefillAt, refillCap }),
        [stars, initialized, addStars, spendStars, resetStars, nextRefillAt, refillCap]
    )

	return <StarsContext.Provider value={value}>{children}</StarsContext.Provider>
}

export function useStars() {
	const ctx = useContext(StarsContext)
	if (!ctx) throw new Error("useStars must be used within a StarsProvider")
	return ctx
}

