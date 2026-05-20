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
import {
    starAdd,
    starGetOrCreate,
    starSpend,
    starSet,
    type StarState,
} from "@/lib/stars"
import { StarConsentProvider } from "@/components/star-consent"
import { ReferralProvider } from "@/contexts/referral-context"

interface StarsContextType {
    stars: number | null
    dailyStars: number | null
    planStars: number | null
    addonStars: number | null
    engagementStarsCurrent: number | null
    engagementStarsTotal: number | null
    initialized: boolean
    addStars: (amount: number) => void
    setStarsBalance: (balance: number) => void
    spendStars: (amount: number) => boolean
    resetStars: (value?: number) => void
    nextRefillAt?: number | null
    refillCap: number
    refillCycleMs?: number | null
    spendTrigger: number
    lastSpendAmount: number
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
const DEFAULT_STARS = 3
const REFILL_INTERVAL_MS_AUTH = 2 * 60 * 60 * 1000 // 2 hours for logged-in users

export function StarsProvider({ children }: { children: ReactNode }) {
    const [dailyStars, setDailyStars] = useState<number | null>(null)
    const [planStars, setPlanStars] = useState<number | null>(null)
    const [addonStars, setAddonStars] = useState<number | null>(null)
    const [engagementStarsCurrent, setEngagementStarsCurrent] = useState<
        number | null
    >(null)
    const [engagementStarsTotal, setEngagementStarsTotal] = useState<
        number | null
    >(null)
    const [initialized, setInitialized] = useState(false)
    const [nextRefillAt, setNextRefillAt] = useState<number | null>(null)
    const [dailyLastRefillAt, setDailyLastRefillAt] = useState<number | null>(
        null,
    )
    const [firstLoginBonusGranted, setFirstLoginBonusGranted] = useState<
        boolean | undefined
    >(undefined)
    const [firstTimeLoginGrant, setFirstTimeLoginGrant] = useState<
        boolean | undefined
    >(undefined)
    const [spendTrigger, setSpendTrigger] = useState(0)
    const [lastSpendAmount, setLastSpendAmount] = useState(0)
    const { user } = useAuth()
    const { subscription, refresh: refreshSubscription } =
        useActiveSubscription()

    const refillCap = user ? 6 : 3

    const stars = useMemo(() => {
        if (dailyStars === null && planStars === null && addonStars === null) {
            return null
        }
        return (dailyStars ?? 0) + (planStars ?? 0) + (addonStars ?? 0)
    }, [dailyStars, planStars, addonStars])

    const applyStarState = useCallback((state: StarState) => {
        setDailyStars(state.dailyStars)
        setPlanStars(state.planStars)
        setAddonStars(state.addonStars)
        setEngagementStarsCurrent(state.engagementStarsCurrent)
        setEngagementStarsTotal(state.engagementStarsTotal)
        setDailyLastRefillAt(state.dailyLastRefillAt)
    }, [])

    // Track previous user ID to detect login/logout and reset state
    const prevUserIdRef = useRef<string | undefined>(user?.id)

    // Tracks the most recent spendStars server commit so that addStars (used
    // for refunds) can serialize after it. Without this, /api/stars/add can
    // read the pre-spend balance (e.g. daily already at cap), clamp the
    // refund to a no-op, and then /api/stars/spend lands on top — leaving
    // the user at the spent balance even though the UI flashed the refund.
    const pendingSpendCommitRef = useRef<Promise<void> | null>(null)

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
            isLoggedIn: boolean,
        ): number | null => {
            if (!isLoggedIn) {
                // Anonymous: next refill at next Bangkok midnight
                return getNextBangkokMidnightMs()
            }
            if (current >= cap) return null
            const base = lastRefillMs ?? Date.now()
            return base + REFILL_INTERVAL_MS_AUTH
        },
        [getNextBangkokMidnightMs],
    )

    const refillCycleMs = useMemo(() => {
        if (user) return REFILL_INTERVAL_MS_AUTH
        const offsetMs = 7 * 60 * 60 * 1000
        const bkkNow = new Date(Date.now() + offsetMs)
        const bkkMidnight = new Date(bkkNow)
        bkkMidnight.setUTCHours(0, 0, 0, 0)
        const bkkNextMidnight = new Date(bkkNow)
        bkkNextMidnight.setUTCHours(24, 0, 0, 0)
        return Math.max(1, bkkNextMidnight.getTime() - bkkMidnight.getTime())
    }, [user])

    useEffect(() => {
        if (!initialized) return
        setNextRefillAt(
            computeNextRefillAt(
                dailyStars ?? 0,
                dailyLastRefillAt,
                refillCap,
                Boolean(user),
            ),
        )
    }, [
        initialized,
        dailyStars,
        dailyLastRefillAt,
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
            setDailyStars(null)
            setPlanStars(null)
            setAddonStars(null)
            setEngagementStarsCurrent(null)
            setEngagementStarsTotal(null)
            setNextRefillAt(null)
            setDailyLastRefillAt(null)
            // The state updates above will trigger a re-render,
            // but we can also proceed if !initialized is checked below
        }

        // Skip API call if already initialized to prevent duplicate calls
        if (!initialized) {
            ;(async () => {
                try {
                    void refreshSubscription()
                    const state = await starGetOrCreate(user ?? null)
                    if (cancelled) return
                    applyStarState(state)
                    setNextRefillAt(
                        computeNextRefillAt(
                            state.dailyStars,
                            state.dailyLastRefillAt,
                            refillCap,
                            Boolean(user),
                        ),
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
        refreshSubscription,
        applyStarState,
    ]) // Only depend on user.id, not the whole user object

    // Re-fetch when notice consent is acknowledged (e.g. from settings)
    type NoticeConsentChangedDetail = { acknowledged: boolean }
    useEffect(() => {
        let cancelled = false
        const onConsent = (e: Event) => {
            const detail = (e as CustomEvent<NoticeConsentChangedDetail>)
                ?.detail
            if (detail?.acknowledged) {
                // Immediately show 3 locally, then reconcile from server
                setDailyStars(3)
                setPlanStars(0)
                setAddonStars(0)
                setEngagementStarsCurrent(0)
                setEngagementStarsTotal(0)
                setInitialized(true)
                ;(async () => {
                    try {
                        void refreshSubscription()
                        const state = await starGetOrCreate(user ?? null)
                        if (cancelled) return
                        applyStarState(state)
                        setNextRefillAt(
                            computeNextRefillAt(
                                state.dailyStars,
                                state.dailyLastRefillAt,
                                refillCap,
                                Boolean(user),
                            ),
                        )
                        setFirstLoginBonusGranted(state.firstLoginBonusGranted)
                        setFirstTimeLoginGrant(state.firstTimeLoginGrant)
                    } catch {}
                })()
            }
        }
        if (typeof window !== "undefined") {
            window.addEventListener(
                "notice-consent-changed",
                onConsent as EventListener,
            )
        }
        return () => {
            cancelled = true
            if (typeof window !== "undefined") {
                window.removeEventListener(
                    "notice-consent-changed",
                    onConsent as EventListener,
                )
            }
        }
    }, [
        user,
        refillCap,
        computeNextRefillAt,
        refreshSubscription,
        applyStarState,
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
        let cancelled = false
        const reconcile = async () => {
            try {
                if (document.visibilityState !== "visible") return
                void refreshSubscription()
                const state = await starGetOrCreate(user ?? null)
                if (cancelled) return
                applyStarState(state)
                setNextRefillAt(
                    computeNextRefillAt(
                        state.dailyStars,
                        state.dailyLastRefillAt,
                        refillCap,
                        Boolean(user),
                    ),
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
                onCustomUpdate as EventListener,
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
                    onCustomUpdate as EventListener,
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
        refreshSubscription,
        applyStarState,
    ])

    const addStars = useCallback(
        (amount: number) => {
            if (!Number.isFinite(amount) || amount <= 0) return
            // Optimistic update
            setDailyStars((prev: number | null) => {
                const current = prev ?? 0
                const next = user
                    ? Math.min(current + amount, refillCap)
                    : current + amount
                return Math.max(0, next)
            })
            setEngagementStarsCurrent((prev: number | null) =>
                Math.max(0, (prev ?? 0) + amount),
            )
            setEngagementStarsTotal((prev: number | null) =>
                Math.max(0, (prev ?? 0) + amount),
            )
            ;(async () => {
                // Wait for any in-flight spend to commit first so refunds
                // don't race the spend at /api/stars/add (which reads-then-
                // writes and would clamp the refund to a no-op).
                const pendingSpend = pendingSpendCommitRef.current
                if (pendingSpend) {
                    try {
                        await pendingSpend
                    } catch {}
                }
                try {
                    void refreshSubscription()
                    const state = await starAdd(user ?? null, amount)
                    applyStarState(state)
                    setNextRefillAt(
                        computeNextRefillAt(
                            state.dailyStars,
                            state.dailyLastRefillAt,
                            refillCap,
                            Boolean(user),
                        ),
                    )
                    broadcastStarsUpdate()
                } catch {
                    // On failure, trigger a refresh to reconcile
                    try {
                        void refreshSubscription()
                        const state = await starGetOrCreate(user ?? null)
                        applyStarState(state)
                        setNextRefillAt(
                            computeNextRefillAt(
                                state.dailyStars,
                                state.dailyLastRefillAt,
                                refillCap,
                                Boolean(user),
                            ),
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
            refreshSubscription,
            applyStarState,
        ],
    )

    // For purchases: explicitly set absolute balance. Requires logged-in user.
    const setStarsBalance = useCallback(
        (balance: number) => {
            if (!Number.isFinite(balance as number)) return
            const target = Math.max(0, Math.floor(Number(balance)))
            // Optimistic set
            const nextDaily = Math.min(refillCap, target)
            const nextPlan = Math.max(0, target - nextDaily)
            setDailyStars(nextDaily)
            setPlanStars(nextPlan)
            setAddonStars(0)
            ;(async () => {
                try {
                    void refreshSubscription()
                    if (!user) return
                    const state = await starSet(user, target)
                    applyStarState(state)
                    setNextRefillAt(
                        computeNextRefillAt(
                            state.dailyStars,
                            state.dailyLastRefillAt,
                            refillCap,
                            Boolean(user),
                        ),
                    )
                    broadcastStarsUpdate()
                } catch {
                    try {
                        void refreshSubscription()
                        const state = await starGetOrCreate(user ?? null)
                        applyStarState(state)
                        setNextRefillAt(
                            computeNextRefillAt(
                                state.dailyStars,
                                state.dailyLastRefillAt,
                                refillCap,
                                Boolean(user),
                            ),
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
            refreshSubscription,
            applyStarState,
        ],
    )

    const spendStars = useCallback(
        (amount: number) => {
            if (!Number.isFinite(amount) || amount <= 0) return false
            if (!initialized) return false

            let success = false
            const currentDaily = dailyStars ?? 0
            const currentPlan = planStars ?? 0
            const currentAddon = addonStars ?? 0
            let remaining = amount
            let nextDaily = currentDaily
            let nextPlan = currentPlan
            let nextAddon = currentAddon

            if (nextDaily >= remaining) {
                nextDaily -= remaining
                remaining = 0
            } else {
                remaining -= nextDaily
                nextDaily = 0
            }

            if (remaining > 0) {
                if (nextPlan >= remaining) {
                    nextPlan -= remaining
                    remaining = 0
                } else {
                    remaining -= nextPlan
                    nextPlan = 0
                }
            }

            if (remaining > 0) {
                if (nextAddon >= remaining) {
                    nextAddon -= remaining
                    remaining = 0
                } else {
                    remaining -= nextAddon
                    nextAddon = 0
                }
            }

            if (remaining === 0) {
                success = true
                setDailyStars(nextDaily)
                setPlanStars(nextPlan)
                setAddonStars(nextAddon)
                setEngagementStarsCurrent((prev: number | null) =>
                    Math.max(0, (prev ?? 0) - amount),
                )
                setLastSpendAmount(amount)
                setSpendTrigger((prev) => prev + 1)
                if (
                    user &&
                    currentDaily >= refillCap &&
                    nextDaily < refillCap
                ) {
                    setDailyLastRefillAt(Date.now())
                    setNextRefillAt(Date.now() + REFILL_INTERVAL_MS_AUTH)
                }
            }
            if (!success)
                return false
                // Commit in background; reconcile with server state.
                // Capture the promise so refunds (addStars after spendStars)
                // can serialize after the spend has hit the database.
            const commitPromise = (async () => {
                try {
                    void refreshSubscription()
                    const { ok, state } = await starSpend(user ?? null, amount)
                    if (!ok) {
                        // revert by refreshing from server
                        const refreshed = await starGetOrCreate(user ?? null)
                        applyStarState(refreshed)
                        setNextRefillAt(
                            computeNextRefillAt(
                                refreshed.dailyStars,
                                refreshed.dailyLastRefillAt,
                                refillCap,
                                Boolean(user),
                            ),
                        )
                        broadcastStarsUpdate()
                        return
                    }
                    applyStarState(state)
                    setNextRefillAt(
                        computeNextRefillAt(
                            state.dailyStars,
                            state.dailyLastRefillAt,
                            refillCap,
                            Boolean(user),
                        ),
                    )
                    broadcastStarsUpdate()
                } catch {
                    try {
                        void refreshSubscription()
                        const refreshed = await starGetOrCreate(user ?? null)
                        applyStarState(refreshed)
                        setNextRefillAt(
                            computeNextRefillAt(
                                refreshed.dailyStars,
                                refreshed.dailyLastRefillAt,
                                refillCap,
                                Boolean(user),
                            ),
                        )
                        broadcastStarsUpdate()
                    } catch {}
                }
            })()
            pendingSpendCommitRef.current = commitPromise
            void commitPromise.finally(() => {
                if (pendingSpendCommitRef.current === commitPromise) {
                    pendingSpendCommitRef.current = null
                }
            })
            return true
        },
        [
            initialized,
            user,
            refillCap,
            computeNextRefillAt,
            broadcastStarsUpdate,
            refreshSubscription,
            dailyStars,
            planStars,
            addonStars,
            applyStarState,
        ],
    )

    const resetStars = useCallback(
        (value?: number) => {
            const next = Number.isFinite(value as number)
                ? Math.max(0, Number(value))
                : DEFAULT_STARS
            // Compute delta and use add
            setDailyStars((prev: number | null) => {
                const current = prev ?? 0
                const delta = next - current
                if (delta !== 0) addStars(delta)
                return next
            })
        },
        [addStars],
    )

    const value = useMemo<StarsContextType>(
        () => ({
            stars,
            dailyStars,
            planStars,
            addonStars,
            engagementStarsCurrent,
            engagementStarsTotal,
            initialized,
            addStars,
            setStarsBalance,
            spendStars,
            resetStars,
            spendTrigger,
            lastSpendAmount,
            nextRefillAt,
            refillCap,
            refillCycleMs,
            firstLoginBonusGranted,
            firstTimeLoginGrant,
            subscription,
        }),
        [
            stars,
            dailyStars,
            planStars,
            addonStars,
            engagementStarsCurrent,
            engagementStarsTotal,
            initialized,
            addStars,
            setStarsBalance,
            spendStars,
            resetStars,
            spendTrigger,
            lastSpendAmount,
            nextRefillAt,
            refillCap,
            refillCycleMs,
            firstLoginBonusGranted,
            firstTimeLoginGrant,
            subscription,
        ],
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
