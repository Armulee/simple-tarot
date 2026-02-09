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
import { useActiveSubscription } from "@/hooks/use-active-subscription"
import { starAdd, starGetOrCreate, starSpend, starSet } from "@/lib/stars"
import {
    hasCookieConsent,
    StarConsentProvider,
} from "@/components/star-consent"
import { ReferralProvider } from "@/contexts/referral-context"

interface StarsContextType {
    stars: number | null
    initialized: boolean
    addStars: (amount: number) => void
    setStarsBalance: (balance: number) => void
    spendStars: (amount: number) => boolean
    resetStars: (value?: number) => void
    nextRefillAt?: number | null
    refillCap: number
    refillCycleMs?: number | null
    firstLoginBonusGranted?: boolean
    firstTimeLoginGrant?: boolean
    subscription?: {
        planKey: string
        tier: "basic" | "pro"
        cycle: "monthly" | "annual"
        baseStars: number
        addonStars: number
        totalStars: number
        currentPeriodStart: number | null
        currentPeriodEnd: number | null
        cancelAtPeriodEnd: boolean
    } | null
}

const StarsContext = createContext<StarsContextType | undefined>(undefined)
const DEFAULT_STARS = 5
const REFILL_INTERVAL_MS_AUTH = 2 * 60 * 60 * 1000 // 2 hours for logged-in users

export function StarsProvider({ children }: { children: ReactNode }) {
    const [stars, setStars] = useState<number | null>(null)
    const [initialized, setInitialized] = useState(false)
    const [nextRefillAt, setNextRefillAt] = useState<number | null>(null)
    const [lastRefillAt, setLastRefillAt] = useState<number | null>(null)
    const [firstLoginBonusGranted, setFirstLoginBonusGranted] = useState<
        boolean | undefined
    >(undefined)
    const [firstTimeLoginGrant, setFirstTimeLoginGrant] = useState<
        boolean | undefined
    >(undefined)
    const { user } = useAuth()
    const { subscription, refresh: refreshSubscription } =
        useActiveSubscription()

    const refillCap = subscription
        ? subscription.totalStars
        : user
          ? 12
          : 5

    // Track previous user ID to detect login/logout and reset state
    const prevUserIdRef = useRef<string | undefined>(user?.id)

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

    const refillCycleMs = useMemo(() => {
        if (subscription?.currentPeriodStart && subscription?.currentPeriodEnd) {
            return Math.max(
                0,
                subscription.currentPeriodEnd - subscription.currentPeriodStart
            )
        }
        if (user) return REFILL_INTERVAL_MS_AUTH
        const offsetMs = 7 * 60 * 60 * 1000
        const bkkNow = new Date(Date.now() + offsetMs)
        const bkkMidnight = new Date(bkkNow)
        bkkMidnight.setUTCHours(0, 0, 0, 0)
        const bkkNextMidnight = new Date(bkkNow)
        bkkNextMidnight.setUTCHours(24, 0, 0, 0)
        return Math.max(1, bkkNextMidnight.getTime() - bkkMidnight.getTime())
    }, [subscription, user])

    useEffect(() => {
        if (subscription?.currentPeriodEnd) {
            setNextRefillAt(subscription.currentPeriodEnd)
            return
        }
        if (!initialized) return
        setNextRefillAt(
            computeNextRefillAt(
                stars ?? 0,
                lastRefillAt,
                refillCap,
                Boolean(user)
            )
        )
    }, [
        subscription?.currentPeriodEnd,
        initialized,
        stars,
        lastRefillAt,
        refillCap,
        user,
        computeNextRefillAt,
    ])

    // Initial fetch and whenever auth state changes, load state from Supabase
    useEffect(() => {
        let cancelled = false

        // Check if user changed (login/logout)
        if (user?.id !== prevUserIdRef.current) {
            prevUserIdRef.current = user?.id
            setInitialized(false)
            setStars(null)
            setNextRefillAt(null)
            setLastRefillAt(null)
            // The state updates above will trigger a re-render,
            // but we can also proceed if !initialized is checked below
        }

        if (!hasCookieConsent()) {
            setInitialized(false)
            return
        }

        // Skip API call if already initialized to prevent duplicate calls
        if (!initialized) {
            ;(async () => {
                try {
                    void refreshSubscription()
                    const state = await starGetOrCreate(user ?? null)
                    if (cancelled) return
                    setStars(state.currentStars)
                    setLastRefillAt(state.lastRefillAt)
                    setNextRefillAt(
                        subscription?.currentPeriodEnd ??
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
    }, [
        refillCap,
        computeNextRefillAt,
        initialized,
        user,
        subscription?.currentPeriodEnd,
        refreshSubscription,
    ]) // Only depend on user.id, not the whole user object

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
                        void refreshSubscription()
                        const state = await starGetOrCreate(user ?? null)
                        if (cancelled) return
                        setStars(state.currentStars)
                        setLastRefillAt(state.lastRefillAt)
                        setNextRefillAt(
                            subscription?.currentPeriodEnd ??
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
    }, [
        user,
        refillCap,
        computeNextRefillAt,
        subscription?.currentPeriodEnd,
        refreshSubscription,
    ])

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
        // if (!initialized) return
        if (!hasCookieConsent()) return
        let cancelled = false
        const reconcile = async () => {
            try {
                if (document.visibilityState !== "visible") return
                void refreshSubscription()
                const state = await starGetOrCreate(user ?? null)
                if (cancelled) return
                setStars(state.currentStars)
                setLastRefillAt(state.lastRefillAt)
                setNextRefillAt(
                    subscription?.currentPeriodEnd ??
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

        return () => {
            cancelled = true
            if (typeof window !== "undefined") {
                window.removeEventListener(
                    "stars-balance-updated",
                    onCustomUpdate as EventListener
                )
                document.removeEventListener("visibilitychange", onVisibility)
                if (bc) {
                    bc.close()
                }
            }
        }
    }, [
        initialized,
        user,
        refillCap,
        computeNextRefillAt,
        subscription?.currentPeriodEnd,
        refreshSubscription,
    ])

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
                    void refreshSubscription()
                    const state = await starAdd(user ?? null, amount)
                    setStars(state.currentStars)
                    setLastRefillAt(state.lastRefillAt)
                    setNextRefillAt(
                        subscription?.currentPeriodEnd ??
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
                        void refreshSubscription()
                        const state = await starGetOrCreate(user ?? null)
                        setStars(state.currentStars)
                        setLastRefillAt(state.lastRefillAt)
                        setNextRefillAt(
                            subscription?.currentPeriodEnd ??
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
        [
            user,
            computeNextRefillAt,
            refillCap,
            broadcastStarsUpdate,
            subscription?.currentPeriodEnd,
            refreshSubscription,
        ]
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
                    void refreshSubscription()
                    if (!user) return
                    const state = await starSet(user, target)
                    setStars(state.currentStars)
                    setLastRefillAt(state.lastRefillAt)
                    setNextRefillAt(
                        subscription?.currentPeriodEnd ??
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
                        void refreshSubscription()
                        const state = await starGetOrCreate(user ?? null)
                        setStars(state.currentStars)
                        setLastRefillAt(state.lastRefillAt)
                        setNextRefillAt(
                            subscription?.currentPeriodEnd ??
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
        [
            user,
            computeNextRefillAt,
            refillCap,
            broadcastStarsUpdate,
            subscription?.currentPeriodEnd,
            refreshSubscription,
        ]
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
                    void refreshSubscription()
                    const { ok, state } = await starSpend(user ?? null, amount)
                    if (!ok) {
                        // revert by refreshing from server
                        const refreshed = await starGetOrCreate(user ?? null)
                        setStars(refreshed.currentStars)
                        setLastRefillAt(refreshed.lastRefillAt)
                        setNextRefillAt(
                            subscription?.currentPeriodEnd ??
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
                    setLastRefillAt(state.lastRefillAt)
                    setNextRefillAt(
                        subscription?.currentPeriodEnd ??
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
                        void refreshSubscription()
                        const refreshed = await starGetOrCreate(user ?? null)
                        setStars(refreshed.currentStars)
                        setLastRefillAt(refreshed.lastRefillAt)
                        setNextRefillAt(
                            subscription?.currentPeriodEnd ??
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
        [
            initialized,
            user,
            refillCap,
            computeNextRefillAt,
            nextRefillAt,
            broadcastStarsUpdate,
            subscription?.currentPeriodEnd,
            refreshSubscription,
        ]
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
            refillCycleMs,
            firstLoginBonusGranted,
            firstTimeLoginGrant,
            subscription,
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
            refillCycleMs,
            firstLoginBonusGranted,
            firstTimeLoginGrant,
            subscription,
        ]
    )

    return (
        <StarConsentProvider>
            <StarsContext.Provider value={value}>
                <ReferralProvider>{children}</ReferralProvider>
            </StarsContext.Provider>
        </StarConsentProvider>
    )
}

export function useStars() {
    const ctx = useContext(StarsContext)
    if (!ctx) throw new Error("useStars must be used within a StarsProvider")
    return ctx
}
