"use client"

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react"
import { useAuth } from "@/hooks/use-auth"
import { starAdd, starGetOrCreate, starSpend, starSet } from "@/lib/stars"
import { hasCookieConsent } from "@/components/star-consent"

interface StarsContextType {
    stars: number | null
    initialized: boolean
    addStars: (amount: number) => void
    setStarsBalance: (balance: number) => void
    spendStars: (amount: number) => boolean
    resetStars: (value?: number) => void
    nextRefillAt?: number | null
    refillCap: number
    firstLoginBonusGranted?: boolean
    firstTimeLoginGrant?: boolean
}

const StarsContext = createContext<StarsContextType | undefined>(undefined)
const DEFAULT_STARS = 5
const REFILL_INTERVAL_MS_AUTH = 2 * 60 * 60 * 1000 // 2 hours for logged-in users

export function StarsProvider({ children }: { children: ReactNode }) {
    const [stars, setStars] = useState<number | null>(null)
    const [initialized, setInitialized] = useState(false)
    const [nextRefillAt, setNextRefillAt] = useState<number | null>(null)
    const [firstLoginBonusGranted, setFirstLoginBonusGranted] = useState<
        boolean | undefined
    >(undefined)
    const [firstTimeLoginGrant, setFirstTimeLoginGrant] = useState<
        boolean | undefined
    >(undefined)
    const { user } = useAuth()

    // Refill cap: anonymous 5 (no hourly refill), signed-in 12 (refill every 2 hours)
    const refillCap = user ? 12 : 5

    // Compute next Bangkok midnight (UTC+7) as an absolute timestamp in ms
    const getNextBangkokMidnightMs = useCallback((baseMs?: number): number => {
        const nowMs = Number.isFinite(baseMs as number)
            ? Number(baseMs)
            : Date.now()
        const offsetMs = 7 * 60 * 60 * 1000
        const bkkNow = new Date(nowMs + offsetMs)
        const bkkNextMidnight = new Date(bkkNow)
        bkkNextMidnight.setUTCHours(24, 0, 0, 0)
        return bkkNextMidnight.getTime() - offsetMs
    }, [])

    // Helper to compute next refill timestamp
    const computeNextRefillAt = useCallback(
        (
            current: number,
            lastRefillMs: number | null,
            cap: number,
            isLoggedIn: boolean
        ): number | null => {
            if (!isLoggedIn) {
                // Anonymous: next refill at next Bangkok midnight
                return getNextBangkokMidnightMs()
            }
            if (current >= cap) return null
            const base = lastRefillMs ?? Date.now()
            return base + REFILL_INTERVAL_MS_AUTH
        },
        [getNextBangkokMidnightMs]
    )

    // Initial fetch and whenever auth state changes, load state from Supabase
    useEffect(() => {
        let cancelled = false
        if (!hasCookieConsent()) {
            setInitialized(false)
            return
        }
        // Skip API call if already initialized to prevent duplicate calls
        if (!initialized) {
            ;(async () => {
                try {
                    const state = await starGetOrCreate(user ?? null)
                    if (cancelled) return
                    setStars(state.currentStars)
                    setNextRefillAt(
                        computeNextRefillAt(
                            state.currentStars,
                            state.lastRefillAt,
                            refillCap,
                            Boolean(user)
                        )
                    )
                    setFirstLoginBonusGranted(state.firstLoginBonusGranted)
                    setFirstTimeLoginGrant(state.firstTimeLoginGrant)
                    setInitialized(true)
                } catch {}
            })()
        }
        return () => {
            cancelled = true
        }
    }, [user?.id, refillCap, computeNextRefillAt]) // Only depend on user.id, not the whole user object

    // Initialize stars after consent is accepted
    type CookieConsentChangedDetail = { choice: "accepted" | "declined" }
    useEffect(() => {
        let cancelled = false
        const onConsent = (e: Event) => {
            const detail = (e as CustomEvent<CookieConsentChangedDetail>)
                ?.detail
            if (detail?.choice === "accepted") {
                // Immediately show 5 locally, then reconcile from server
                setStars(5)
                setInitialized(true)
                ;(async () => {
                    try {
                        const state = await starGetOrCreate(user ?? null)
                        if (cancelled) return
                        setStars(state.currentStars)
                        setNextRefillAt(
                            computeNextRefillAt(
                                state.currentStars,
                                state.lastRefillAt,
                                refillCap,
                                Boolean(user)
                            )
                        )
                        setFirstLoginBonusGranted(state.firstLoginBonusGranted)
                        setFirstTimeLoginGrant(state.firstTimeLoginGrant)
                    } catch {}
                })()
            }
        }
        if (typeof window !== "undefined") {
            window.addEventListener(
                "cookie-consent-changed",
                onConsent as EventListener
            )
        }
        return () => {
            cancelled = true
            if (typeof window !== "undefined") {
                window.removeEventListener(
                    "cookie-consent-changed",
                    onConsent as EventListener
                )
            }
        }
    }, [user, refillCap, computeNextRefillAt])

    // Periodic refresh to apply server-side refills
    useEffect(() => {
        if (!initialized) return
        if (!hasCookieConsent()) return
        let mounted = true
        const checkRefill = async () => {
            try {
                if (stars === null) return
                const now = Date.now()
                if (nextRefillAt && now >= nextRefillAt) {
                    // Ask server to apply refill/reset and return new state
                    const state = await starGetOrCreate(user ?? null)
                    if (!mounted) return
                    setStars(state.currentStars)
                    setNextRefillAt(
                        computeNextRefillAt(
                            state.currentStars,
                            state.lastRefillAt,
                            refillCap,
                            Boolean(user)
                        )
                    )
                    return
                }
                // For logged-in users, proactively avoid calling server until below cap
                if (user) {
                    if (stars >= refillCap) return
                }
            } catch {}
        }
        const id = window.setInterval(checkRefill, 30 * 1000)
        return () => {
            mounted = false
            window.clearInterval(id)
        }
    }, [initialized, user, refillCap, computeNextRefillAt, stars, nextRefillAt])

    // Broadcast helper to notify other tabs/components to refresh
    const broadcastStarsUpdate = useCallback(() => {
        try {
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("stars-balance-updated"))
                if ("BroadcastChannel" in window) {
                    const bc = new BroadcastChannel("stars-balance")
                    bc.postMessage({ ts: Date.now() })
                    bc.close()
                }
            }
        } catch {}
    }, [])

    // Reconcile periodically and on visibility change / cross-tab events
    useEffect(() => {
        if (!initialized) return
        if (!hasCookieConsent()) return
        let cancelled = false
        const reconcile = async () => {
            try {
                if (document.visibilityState !== "visible") return
                const state = await starGetOrCreate(user ?? null)
                if (cancelled) return
                setStars(state.currentStars)
                setNextRefillAt(
                    computeNextRefillAt(
                        state.currentStars,
                        state.lastRefillAt,
                        refillCap,
                        Boolean(user)
                    )
                )
            } catch {}
        }

        const onVisibility = () => {
            if (document.visibilityState === "visible") {
                void reconcile()
            }
        }

        let bc: BroadcastChannel | null = null
        const onCustomUpdate = () => void reconcile()
        if (typeof window !== "undefined") {
            window.addEventListener(
                "stars-balance-updated",
                onCustomUpdate as EventListener
            )
            document.addEventListener("visibilitychange", onVisibility)
            if ("BroadcastChannel" in window) {
                bc = new BroadcastChannel("stars-balance")
                const onMessage = () => void reconcile()
                bc.addEventListener("message", onMessage as EventListener)
            }
        }

        const id = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                void reconcile()
            }
        }, 5000)

        return () => {
            cancelled = true
            window.clearInterval(id)
            if (typeof window !== "undefined") {
                window.removeEventListener(
                    "stars-balance-updated",
                    onCustomUpdate as EventListener
                )
                document.removeEventListener(
                    "visibilitychange",
                    onVisibility
                )
                if (bc) {
                    bc.close()
                }
            }
        }
    }, [initialized, user, refillCap, computeNextRefillAt])

    const addStars = useCallback(
        (amount: number) => {
            if (!Number.isFinite(amount) || amount <= 0) return
            // Optimistic update
            setStars((prev: number | null) => {
                const current = prev ?? 0
                // For logged-in non-purchase flows, cap at 12
                const next = user
                    ? Math.min(current + amount, refillCap)
                    : current + amount
                return Math.max(0, next)
            })
            ;(async () => {
                try {
                    const state = await starAdd(user ?? null, amount)
                    setStars(state.currentStars)
                    setNextRefillAt(
                        computeNextRefillAt(
                            state.currentStars,
                            state.lastRefillAt,
                            refillCap,
                            Boolean(user)
                        )
                    )
                    broadcastStarsUpdate()
                } catch {
                    // On failure, trigger a refresh to reconcile
                    try {
                        const state = await starGetOrCreate(user ?? null)
                        setStars(state.currentStars)
                        setNextRefillAt(
                            computeNextRefillAt(
                                state.currentStars,
                                state.lastRefillAt,
                                refillCap,
                                Boolean(user)
                            )
                        )
                        broadcastStarsUpdate()
                    } catch {}
                }
            })()
        },
        [user, computeNextRefillAt, refillCap, broadcastStarsUpdate]
    )

    // For purchases: explicitly set absolute balance. Requires logged-in user.
    const setStarsBalance = useCallback(
        (balance: number) => {
            if (!Number.isFinite(balance as number)) return
            const target = Math.max(0, Math.floor(Number(balance)))
            // Optimistic set
            setStars(target)
            ;(async () => {
                try {
                    if (!user) return
                    const state = await starSet(user, target)
                    setStars(state.currentStars)
                    setNextRefillAt(
                        computeNextRefillAt(
                            state.currentStars,
                            state.lastRefillAt,
                            refillCap,
                            Boolean(user)
                        )
                    )
                    broadcastStarsUpdate()
                } catch {
                    try {
                        const state = await starGetOrCreate(user ?? null)
                        setStars(state.currentStars)
                        setNextRefillAt(
                            computeNextRefillAt(
                                state.currentStars,
                                state.lastRefillAt,
                                refillCap,
                                Boolean(user)
                            )
                        )
                        broadcastStarsUpdate()
                    } catch {}
                }
            })()
        },
        [user, computeNextRefillAt, refillCap, broadcastStarsUpdate]
    )

    const spendStars = useCallback(
        (amount: number) => {
            if (!Number.isFinite(amount) || amount <= 0) return false
            if (!initialized) return false
            let success = false
            setStars((prev: number | null) => {
                const current = prev ?? 0
                if (current >= amount) {
                    success = true
                    const next = current - amount
                    // If dropping below cap and logged-in, next refill starts 2 hours from now
                    const nextRefill =
                        user && next < refillCap && current >= refillCap
                            ? Date.now() + REFILL_INTERVAL_MS_AUTH
                            : nextRefillAt
                    if (nextRefill !== nextRefillAt)
                        setNextRefillAt(nextRefill ?? null)
                    return next
                }
                return current
            })
            if (!success)
                return false
                // Commit in background; reconcile with server state
            ;(async () => {
                try {
                    const { ok, state } = await starSpend(user ?? null, amount)
                    if (!ok) {
                        // revert by refreshing from server
                        const refreshed = await starGetOrCreate(user ?? null)
                        setStars(refreshed.currentStars)
                        setNextRefillAt(
                            computeNextRefillAt(
                                refreshed.currentStars,
                                refreshed.lastRefillAt,
                                refillCap,
                                Boolean(user)
                            )
                        )
                        broadcastStarsUpdate()
                        return
                    }
                    setStars(state.currentStars)
                    setNextRefillAt(
                        computeNextRefillAt(
                            state.currentStars,
                            state.lastRefillAt,
                            refillCap,
                            Boolean(user)
                        )
                    )
                    broadcastStarsUpdate()
                } catch {
                    try {
                        const refreshed = await starGetOrCreate(user ?? null)
                        setStars(refreshed.currentStars)
                        setNextRefillAt(
                            computeNextRefillAt(
                                refreshed.currentStars,
                                refreshed.lastRefillAt,
                                refillCap,
                                Boolean(user)
                            )
                        )
                        broadcastStarsUpdate()
                    } catch {}
                }
            })()
            return true
        },
        [initialized, user, refillCap, computeNextRefillAt, nextRefillAt, broadcastStarsUpdate]
    )

    const resetStars = useCallback(
        (value?: number) => {
            const next = Number.isFinite(value as number)
                ? Math.max(0, Number(value))
                : DEFAULT_STARS
            // Compute delta and use add
            setStars((prev: number | null) => {
                const current = prev ?? 0
                const delta = next - current
                if (delta !== 0) addStars(delta)
                return next
            })
        },
        [addStars]
    )

    const value = useMemo<StarsContextType>(
        () => ({
            stars,
            initialized,
            addStars,
            setStarsBalance,
            spendStars,
            resetStars,
            nextRefillAt,
            refillCap,
            firstLoginBonusGranted,
            firstTimeLoginGrant,
        }),
        [
            stars,
            initialized,
            addStars,
            setStarsBalance,
            spendStars,
            resetStars,
            nextRefillAt,
            refillCap,
            firstLoginBonusGranted,
            firstTimeLoginGrant,
        ]
    )

    return (
        <StarsContext.Provider value={value}>{children}</StarsContext.Provider>
    )
}

export function useStars() {
    const ctx = useContext(StarsContext)
    if (!ctx) throw new Error("useStars must be used within a StarsProvider")
    return ctx
}
