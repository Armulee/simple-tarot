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
	const { user } = useAuth()

    // Refill cap: anonymous 5, signed-in 24
    const refillCap = user ? 24 : 5

	// Hydrate from localStorage on mount
	useEffect(() => {
		if (typeof window === "undefined") return
		isHydrating.current = true
		try {
			const raw = localStorage.getItem(STORAGE_KEY)
			const lastRefillRaw = localStorage.getItem(STORAGE_KEY_LAST_REFILL)
			if (raw === null) {
				// First-time visitors: grant default stars
				setStars(DEFAULT_STARS)
				localStorage.setItem(STORAGE_KEY, String(DEFAULT_STARS))
				const now = Date.now()
				localStorage.setItem(STORAGE_KEY_LAST_REFILL, String(now))
				setNextRefillAt(now + REFILL_INTERVAL_MS)
			} else {
				const parsed = Number(raw)
				if (Number.isFinite(parsed) && parsed >= 0) {
					// Apply any pending refills since lastRefill (only up to refillCap)
					let current = parsed
					const now = Date.now()
					let lastRefill = Number(lastRefillRaw || now)
					if (!Number.isFinite(lastRefill) || lastRefill <= 0) {
						lastRefill = now
						// Persist missing lastRefill so subsequent reloads don't reset
						localStorage.setItem(STORAGE_KEY_LAST_REFILL, String(lastRefill))
					}
					if (current < refillCap) {
						const hoursPassed = Math.floor((now - lastRefill) / REFILL_INTERVAL_MS)
						if (hoursPassed > 0) {
							current = Math.min(refillCap, current + hoursPassed)
							const newLast = lastRefill + hoursPassed * REFILL_INTERVAL_MS
							localStorage.setItem(STORAGE_KEY_LAST_REFILL, String(newLast))
							setNextRefillAt(newLast + REFILL_INTERVAL_MS)
						} else {
							setNextRefillAt(lastRefill + REFILL_INTERVAL_MS)
						}
					} else {
						setNextRefillAt(null)
					}
					setStars(current)
				} else {
					setStars(DEFAULT_STARS)
					localStorage.setItem(STORAGE_KEY, String(DEFAULT_STARS))
					const now = Date.now()
					localStorage.setItem(STORAGE_KEY_LAST_REFILL, String(now))
					setNextRefillAt(now + REFILL_INTERVAL_MS)
				}
			}
		} finally {
			isHydrating.current = false
			setInitialized(true)
		}
	}, [])

    // One-time registration bonus and increased refill cap handling
	useEffect(() => {
		if (!initialized) return
		if (!user) return
		try {
			const key = `stars-register-bonus:${user.id}`
			const granted = localStorage.getItem(key) === "true"
			if (!granted) {
                setStars((prev) => prev + 20)
				localStorage.setItem(key, "true")
				// If currently above or equal to new cap, no next refill
				setNextRefillAt((prevNext) => {
                    const current = stars + 20
					return current >= refillCap ? null : prevNext
				})
			}
		} catch {}
	}, [user, initialized])

	// Persist to localStorage when stars change (skip during initial hydration)
	useEffect(() => {
		if (typeof window === "undefined") return
		if (!initialized) return
		if (isHydrating.current) return
		try {
			localStorage.setItem(STORAGE_KEY, String(stars))
			// When reaching refill cap or above, clear next refill; when below, ensure nextRefill is set
			if (stars >= refillCap) {
				setNextRefillAt(null)
			} else {
				const lastRefillRaw = localStorage.getItem(STORAGE_KEY_LAST_REFILL)
				const lastRefill = Number(lastRefillRaw || Date.now())
				setNextRefillAt(lastRefill + REFILL_INTERVAL_MS)
			}
		} catch {
			// ignore quota issues
		}
	}, [stars, initialized, refillCap])

	// Interval to handle auto-refill
	useEffect(() => {
		if (typeof window === "undefined") return
		if (!initialized) return
		const id = window.setInterval(() => {
			try {
				setStars((prev) => {
					if (prev >= refillCap) return prev
					const lastRefillRaw = localStorage.getItem(STORAGE_KEY_LAST_REFILL)
					const now = Date.now()
					let lastRefill = Number(lastRefillRaw || now)
					if (!Number.isFinite(lastRefill) || lastRefill <= 0) lastRefill = now
					const hoursPassed = Math.floor((now - lastRefill) / REFILL_INTERVAL_MS)
					if (hoursPassed <= 0) return prev
					const nextWithinCap = Math.min(refillCap, prev + hoursPassed)
					const newLast = lastRefill + hoursPassed * REFILL_INTERVAL_MS
					localStorage.setItem(STORAGE_KEY_LAST_REFILL, String(newLast))
					setNextRefillAt(nextWithinCap >= refillCap ? null : newLast + REFILL_INTERVAL_MS)
					return nextWithinCap
				})
			} catch {}
		}, 30 * 1000) // check every 30s for accuracy without heavy load
		return () => window.clearInterval(id)
	}, [initialized, refillCap])

	const addStars = useCallback((amount: number) => {
		if (!Number.isFinite(amount) || amount <= 0) return
		setStars((prev: number) => Math.max(0, prev + amount))
	}, [])

	const spendStars = useCallback((amount: number) => {
		if (!Number.isFinite(amount) || amount <= 0) return false
		let success = false
		setStars((prev: number) => {
			if (prev >= amount) {
				success = true
				const next = prev - amount
				// If spending from refill cap or above down to below cap, start the refill timer now
				if (prev >= refillCap && next < refillCap) {
					const now = Date.now()
					try {
						localStorage.setItem(STORAGE_KEY_LAST_REFILL, String(now))
					} catch {}
					setNextRefillAt(now + REFILL_INTERVAL_MS)
				}
				return next
			}
			return prev
		})
		return success
	}, [refillCap])

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

