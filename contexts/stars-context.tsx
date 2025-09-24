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

interface StarsContextType {
	stars: number
	initialized: boolean
	addStars: (amount: number) => void
	spendStars: (amount: number) => boolean
	resetStars: (value?: number) => void
	nextRefillAt?: number | null
}

const StarsContext = createContext<StarsContextType | undefined>(undefined)

const STORAGE_KEY = "stars-balance-v1"
const STORAGE_KEY_LAST_REFILL = "stars-last-refill"
const DEFAULT_STARS = 5
const MAX_STARS = 5
const REFILL_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

export function StarsProvider({ children }: { children: ReactNode }) {
	const [stars, setStars] = useState<number>(DEFAULT_STARS)
	const [initialized, setInitialized] = useState(false)
	const isHydrating = useRef(false)
	const [nextRefillAt, setNextRefillAt] = useState<number | null>(null)

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
					// Apply any pending refills since lastRefill
					let current = Math.min(parsed, MAX_STARS)
					const now = Date.now()
					let lastRefill = Number(lastRefillRaw || now)
					if (!Number.isFinite(lastRefill) || lastRefill <= 0) {
						lastRefill = now
						// Persist missing lastRefill so subsequent reloads don't reset
						localStorage.setItem(STORAGE_KEY_LAST_REFILL, String(lastRefill))
					}
					if (current < MAX_STARS) {
						const hoursPassed = Math.floor((now - lastRefill) / REFILL_INTERVAL_MS)
						if (hoursPassed > 0) {
							current = Math.min(MAX_STARS, current + hoursPassed)
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

	// Persist to localStorage when stars change (skip during initial hydration)
	useEffect(() => {
		if (typeof window === "undefined") return
		if (!initialized) return
		if (isHydrating.current) return
		try {
			localStorage.setItem(STORAGE_KEY, String(stars))
			// When reaching max, clear next refill; when below, ensure nextRefill is set
			if (stars >= MAX_STARS) {
				setNextRefillAt(null)
			} else {
				const lastRefillRaw = localStorage.getItem(STORAGE_KEY_LAST_REFILL)
				const lastRefill = Number(lastRefillRaw || Date.now())
				setNextRefillAt(lastRefill + REFILL_INTERVAL_MS)
			}
		} catch {
			// ignore quota issues
		}
	}, [stars, initialized])

	// Interval to handle auto-refill
	useEffect(() => {
		if (typeof window === "undefined") return
		if (!initialized) return
		const id = window.setInterval(() => {
			try {
				setStars((prev) => {
					if (prev >= MAX_STARS) return prev
					const lastRefillRaw = localStorage.getItem(STORAGE_KEY_LAST_REFILL)
					const now = Date.now()
					let lastRefill = Number(lastRefillRaw || now)
					if (!Number.isFinite(lastRefill) || lastRefill <= 0) lastRefill = now
					const hoursPassed = Math.floor((now - lastRefill) / REFILL_INTERVAL_MS)
					if (hoursPassed <= 0) return prev
					const next = Math.min(MAX_STARS, prev + hoursPassed)
					const newLast = lastRefill + hoursPassed * REFILL_INTERVAL_MS
					localStorage.setItem(STORAGE_KEY_LAST_REFILL, String(newLast))
					setNextRefillAt(next >= MAX_STARS ? null : newLast + REFILL_INTERVAL_MS)
					return next
				})
			} catch {}
		}, 30 * 1000) // check every 30s for accuracy without heavy load
		return () => window.clearInterval(id)
	}, [initialized])

	const addStars = useCallback((amount: number) => {
		if (!Number.isFinite(amount) || amount <= 0) return
		setStars((prev: number) => Math.min(MAX_STARS, Math.max(0, prev + amount)))
	}, [])

	const spendStars = useCallback((amount: number) => {
		if (!Number.isFinite(amount) || amount <= 0) return false
		let success = false
		setStars((prev: number) => {
			if (prev >= amount) {
				success = true
				const next = prev - amount
				// If spending from full capacity, start the refill timer now
				if (prev === MAX_STARS && next < MAX_STARS) {
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
	}, [])

	const resetStars = useCallback((value?: number) => {
		const next = Number.isFinite(value as number)
			? Math.max(0, Number(value))
			: DEFAULT_STARS
		setStars(next)
	}, [])

	const value = useMemo<StarsContextType>(
		() => ({ stars, initialized, addStars, spendStars, resetStars, nextRefillAt }),
		[stars, initialized, addStars, spendStars, resetStars, nextRefillAt]
	)

	return <StarsContext.Provider value={value}>{children}</StarsContext.Provider>
}

export function useStars() {
	const ctx = useContext(StarsContext)
	if (!ctx) throw new Error("useStars must be used within a StarsProvider")
	return ctx
}

