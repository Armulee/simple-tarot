"use client"

import {
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
import { supabase } from "@/lib/supabase"

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
	const isHydrating = useRef(false)
	const [nextRefillAt, setNextRefillAt] = useState<number | null>(null)
	const [lastRefillAt, setLastRefillAt] = useState<number | null>(null)
	const { user } = useAuth()

    // Refill cap: anonymous 5, signed-in 15
    const refillCap = user ? 15 : 5

	// Hydrate from Supabase (for both anonymous and signed-in) when user changes
	useEffect(() => {
		if (typeof window === "undefined") return
		isHydrating.current = true
		const hydrate = async () => {
			// Use RPC to apply refill and fetch current state
			const { data, error } = await supabase.rpc("apply_refill_and_get")
			if (error || !data) {
				console.error("Failed to hydrate stars:", error)
				setStars(DEFAULT_STARS)
				setLastRefillAt(Date.now())
				setNextRefillAt(Date.now() + REFILL_INTERVAL_MS)
			} else {
				const row = Array.isArray(data) ? data[0] : data
				const current = Number(row.balance) || 0
				const last = row.last_refill_at ? new Date(row.last_refill_at as string).getTime() : Date.now()
				const next = row.next_refill_at ? new Date(row.next_refill_at as string).getTime() : null
				setStars(current)
				setLastRefillAt(last)
				setNextRefillAt(next)
			}
		}

		Promise.resolve()
			.then(() => hydrate())
			.finally(() => {
				isHydrating.current = false
				setInitialized(true)
			})
	}, [user, refillCap])

	// Registration bonus handled in Supabase during hydration for authenticated users

	// No localStorage persistence; DB is source of truth

	// Interval to handle auto-refill (client-side prediction, but also persists via RPC)
	useEffect(() => {
		if (typeof window === "undefined") return
		if (!initialized) return
		const id = window.setInterval(() => {
			try {
				setStars((prev: number) => {
					if (prev >= refillCap) return prev
					const now = Date.now()
					let last = lastRefillAt ?? now
					if (!Number.isFinite(last) || last <= 0) last = now
					const hoursPassed = Math.floor((now - last) / REFILL_INTERVAL_MS)
					if (hoursPassed <= 0) return prev
					const nextWithinCap = Math.min(refillCap, prev + hoursPassed)
					const newLast = last + hoursPassed * REFILL_INTERVAL_MS
					setLastRefillAt(newLast)
					setNextRefillAt(nextWithinCap >= refillCap ? null : newLast + REFILL_INTERVAL_MS)
					// Persist server-side using RPC to avoid client tampering
					void supabase.rpc("apply_refill_and_get")
					return nextWithinCap
				})
			} catch {}
		}, 30 * 1000) // check every 30s for accuracy without heavy load
		return () => window.clearInterval(id)
	}, [initialized, refillCap, user, lastRefillAt])

	const addStars = useCallback((amount: number) => {
		if (!Number.isFinite(amount) || amount <= 0) return
		let nextComputed = 0
		setStars((prev: number) => {
			nextComputed = Math.max(0, prev + amount)
			return nextComputed
		})
		void supabase.rpc("add_stars", { p_amount: amount })
	}, [user])

	const spendStars = useCallback((amount: number) => {
		if (!Number.isFinite(amount) || amount <= 0) return false
		let success = false
		let nextComputed = 0
		let shouldStartRefill = false
		setStars((prev: number) => {
			if (prev >= amount) {
				success = true
				nextComputed = prev - amount
				if (prev >= refillCap && nextComputed < refillCap) {
					shouldStartRefill = true
				}
				return nextComputed
			}
			return prev
		})
		if (success) {
			const now = Date.now()
			if (shouldStartRefill) {
				setLastRefillAt(now)
				setNextRefillAt(now + REFILL_INTERVAL_MS)
			}
			void supabase.rpc("spend_stars", { p_amount: amount })
		}
		return success
	}, [refillCap, user])

	const resetStars = useCallback((value?: number) => {
		const next = Number.isFinite(value as number)
			? Math.max(0, Number(value))
			: DEFAULT_STARS
		setStars(next)
	}, [])

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

