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

const STORAGE_KEY = "stars-balance-v1"
const STORAGE_KEY_LAST_REFILL = "stars-last-refill"
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

	// Hydrate from Supabase (if signed-in) or localStorage (guest) when user changes
	useEffect(() => {
		if (typeof window === "undefined") return
		isHydrating.current = true
		const hydrateGuest = () => {
			const raw = localStorage.getItem(STORAGE_KEY)
			const lastRefillRaw = localStorage.getItem(STORAGE_KEY_LAST_REFILL)
			if (raw === null) {
				setStars(DEFAULT_STARS)
				localStorage.setItem(STORAGE_KEY, String(DEFAULT_STARS))
				const now = Date.now()
				localStorage.setItem(STORAGE_KEY_LAST_REFILL, String(now))
				setLastRefillAt(now)
				setNextRefillAt(now + REFILL_INTERVAL_MS)
			} else {
				const parsed = Number(raw)
				if (Number.isFinite(parsed) && parsed >= 0) {
					let current = parsed
					const now = Date.now()
					let lastRefill = Number(lastRefillRaw || now)
					if (!Number.isFinite(lastRefill) || lastRefill <= 0) {
						lastRefill = now
						localStorage.setItem(STORAGE_KEY_LAST_REFILL, String(lastRefill))
					}
					if (current < refillCap) {
						const hoursPassed = Math.floor((now - lastRefill) / REFILL_INTERVAL_MS)
						if (hoursPassed > 0) {
							current = Math.min(refillCap, current + hoursPassed)
							const newLast = lastRefill + hoursPassed * REFILL_INTERVAL_MS
							localStorage.setItem(STORAGE_KEY_LAST_REFILL, String(newLast))
							setLastRefillAt(newLast)
							setNextRefillAt(newLast + REFILL_INTERVAL_MS)
						} else {
							setLastRefillAt(lastRefill)
							setNextRefillAt(lastRefill + REFILL_INTERVAL_MS)
						}
					} else {
						setNextRefillAt(null)
						setLastRefillAt(lastRefill)
					}
					setStars(current)
				} else {
					setStars(DEFAULT_STARS)
					localStorage.setItem(STORAGE_KEY, String(DEFAULT_STARS))
					const now = Date.now()
					localStorage.setItem(STORAGE_KEY_LAST_REFILL, String(now))
					setLastRefillAt(now)
					setNextRefillAt(now + REFILL_INTERVAL_MS)
				}
			}
		}

		const hydrateAuthed = async () => {
			if (!user) return hydrateGuest()
			// Optional migration: seed row from guest localStorage if missing
			const computeGuestCurrent = () => {
				try {
					const raw = localStorage.getItem(STORAGE_KEY)
					const lastRefillRaw = localStorage.getItem(STORAGE_KEY_LAST_REFILL)
					const parsed = Number(raw)
					const now = Date.now()
					let lastRefill = Number(lastRefillRaw || now)
					if (!Number.isFinite(lastRefill) || lastRefill <= 0) lastRefill = now
					let current = Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_STARS
					const hoursPassed = Math.floor((now - lastRefill) / REFILL_INTERVAL_MS)
					if (current < 5 && hoursPassed > 0) {
						current = Math.min(5, current + hoursPassed)
					}
					return { current, lastRefill }
				} catch {
					const now = Date.now()
					return { current: DEFAULT_STARS, lastRefill: now }
				}
			}

			const { data, error } = await supabase
				.from("star_balances")
				.select("balance,last_refill_at,register_bonus_granted")
				.eq("user_id", user.id)
				.maybeSingle()
			if (error) {
				console.error("Failed to load star balance:", error)
				return hydrateGuest()
			}

			if (!data) {
				const guest = computeGuestCurrent()
				const now = Date.now()
				const insertRes = await supabase.from("star_balances").insert({
					user_id: user.id,
					balance: guest.current,
					last_refill_at: new Date(guest.lastRefill).toISOString(),
				})
				if (insertRes.error) {
					console.error("Failed to initialize star balance:", insertRes.error)
					return hydrateGuest()
				}
				// Apply refill relative to last_refill_at with signed-in cap
				let current = guest.current
				let last = guest.lastRefill
				const hours = Math.floor((now - last) / REFILL_INTERVAL_MS)
				if (current < refillCap && hours > 0) {
					current = Math.min(refillCap, current + hours)
					last = last + hours * REFILL_INTERVAL_MS
					await supabase
						.from("star_balances")
						.update({ balance: current, last_refill_at: new Date(last).toISOString() })
						.eq("user_id", user.id)
				}
				setStars(current)
				setLastRefillAt(last)
				setNextRefillAt(current >= refillCap ? null : last + REFILL_INTERVAL_MS)
			} else {
				// Apply refill on load
				const now = Date.now()
				let current = Number(data.balance) || 0
				let last = new Date(data.last_refill_at as string).getTime()
				if (!Number.isFinite(last) || last <= 0) last = now
				const hours = Math.floor((now - last) / REFILL_INTERVAL_MS)
				if (current < refillCap && hours > 0) {
					current = Math.min(refillCap, current + hours)
					last = last + hours * REFILL_INTERVAL_MS
					await supabase
						.from("star_balances")
						.update({ balance: current, last_refill_at: new Date(last).toISOString() })
						.eq("user_id", user.id)
				}
				// One-time registration bonus using server flag
				if ((data as any).register_bonus_granted === false) {
					const bonusNext = current + 10
					await supabase
						.from("star_balances")
						.update({ balance: bonusNext, register_bonus_granted: true })
						.eq("user_id", user.id)
					current = bonusNext
				}
				setStars(current)
				setLastRefillAt(last)
				setNextRefillAt(current >= refillCap ? null : last + REFILL_INTERVAL_MS)
			}
		}

		Promise.resolve()
			.then(() => (user ? hydrateAuthed() : hydrateGuest()))
			.finally(() => {
				isHydrating.current = false
				setInitialized(true)
			})
	}, [user, refillCap])

	// Registration bonus handled in Supabase during hydration for authenticated users

	// Persist to localStorage when stars change for guests (skip during initial hydration)
	useEffect(() => {
		if (typeof window === "undefined") return
		if (!initialized) return
		if (isHydrating.current) return
	if (!user) {
		try {
			localStorage.setItem(STORAGE_KEY, String(stars))
			if (stars >= refillCap) {
				setNextRefillAt(null)
			} else {
				const lastRefillRaw = localStorage.getItem(STORAGE_KEY_LAST_REFILL)
				const last = Number(lastRefillRaw || Date.now())
				setNextRefillAt(last + REFILL_INTERVAL_MS)
			}
		} catch {}
	}
	}, [stars, initialized, refillCap, user])

	// Interval to handle auto-refill
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
					if (user) {
						// Persist server-side
						supabase
							.from("star_balances")
							.update({ balance: nextWithinCap, last_refill_at: new Date(newLast).toISOString() })
							.eq("user_id", user.id)
					}
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
		if (user) {
			void supabase
				.from("star_balances")
				.update({ balance: nextComputed })
				.eq("user_id", user.id)
		}
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
		if (success && user) {
			const now = Date.now()
			if (shouldStartRefill) {
				setLastRefillAt(now)
				setNextRefillAt(now + REFILL_INTERVAL_MS)
				void supabase
					.from("star_balances")
					.update({ balance: nextComputed, last_refill_at: new Date(now).toISOString() })
					.eq("user_id", user.id)
			} else {
				void supabase
					.from("star_balances")
					.update({ balance: nextComputed })
					.eq("user_id", user.id)
			}
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

