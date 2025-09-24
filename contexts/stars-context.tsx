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
}

const StarsContext = createContext<StarsContextType | undefined>(undefined)

const STORAGE_KEY = "stars-balance-v1"
const DEFAULT_STARS = 5

export function StarsProvider({ children }: { children: ReactNode }) {
	const [stars, setStars] = useState<number>(DEFAULT_STARS)
	const [initialized, setInitialized] = useState(false)
	const isHydrating = useRef(false)

	// Hydrate from localStorage on mount
	useEffect(() => {
		if (typeof window === "undefined") return
		isHydrating.current = true
		try {
			const raw = localStorage.getItem(STORAGE_KEY)
			if (raw === null) {
				// First-time visitors: grant default stars
				setStars(DEFAULT_STARS)
				localStorage.setItem(STORAGE_KEY, String(DEFAULT_STARS))
			} else {
				const parsed = Number(raw)
				if (Number.isFinite(parsed) && parsed >= 0) {
					setStars(parsed)
				} else {
					setStars(DEFAULT_STARS)
					localStorage.setItem(STORAGE_KEY, String(DEFAULT_STARS))
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
		} catch {
			// ignore quota issues
		}
	}, [stars, initialized])

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
				return prev - amount
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
		() => ({ stars, initialized, addStars, spendStars, resetStars }),
		[stars, initialized, addStars, spendStars, resetStars]
	)

	return <StarsContext.Provider value={value}>{children}</StarsContext.Provider>
}

export function useStars() {
	const ctx = useContext(StarsContext)
	if (!ctx) throw new Error("useStars must be used within a StarsProvider")
	return ctx
}

