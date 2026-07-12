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
// v2 economy: anonymous users hold 1 lifetime star (no refill), so the
// fallback for resetStars matches that.
const DEFAULT_STARS = 1
// v2 free refill: +1 star at 09:00 local time, only when the TOTAL balance
// is 0 (see database-star-v2-economy.sql). The countdown spans at most a
// day, so the progress gauges use a 24h cycle.
const REFILL_CYCLE_MS_V2 = 24 * 60 * 60 * 1000
const FREE_REFILL_LOCAL_HOUR = 9

/**
 * Next 09:00 in the browser's local timezone. Matches the server-side grant
 * time, which uses the timezone captured from this same browser
 * (star_set_timezone), so the countdown and the actual grant agree.
 */
function getNext9amLocalMs(baseMs: number = Date.now()): number {
    const next = new Date(baseMs)
    next.setHours(FREE_REFILL_LOCAL_HOUR, 0, 0, 0)
    if (next.getTime() <= baseMs) {
        next.setDate(next.getDate() + 1)
    }
    return next.getTime()
}

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

    // v2: signup grant is 5 (the display cap for the free pool); anon holds
    // a single lifetime star.
    const refillCap = user ? 5 : 1

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
    }, [])

    // Track previous user ID to detect login/logout and reset state
    const prevUserIdRef = useRef<string | undefined>(user?.id)

    /**
     * v2 refill countdown. A free star arrives at 09:00 local time ONLY when
     * the TOTAL balance (daily + plan + addon) is 0:
     *   - anonymous: never refills → no countdown.
     *   - balance > 0: nothing is coming → no countdown.
     *   - balance == 0: count down to the next local 09:00.
     * Note: the actual grant is applied lazily server-side; the countdown is
     * a best-effort display and reconciles on the next balance fetch.
     */
    const computeNextRefillAt = useCallback(
        (totalStars: number, isLoggedIn: boolean): number | null => {
            if (!isLoggedIn) return null
            if (totalStars > 0) return null
            return getNext9amLocalMs()
        },
        [],
    )

    const refillCycleMs = REFILL_CYCLE_MS_V2

    useEffect(() => {
        if (!initialized) return
        setNextRefillAt(computeNextRefillAt(stars ?? 0, Boolean(user)))
    }, [initialized, stars, user, computeNextRefillAt])

    // When a logged-in balance hits 0, refetch once shortly after: if the
    // server's lazy 09:00 grant is already due (e.g. purchased stars blocked
    // the morning grant and were spent later), it lands on that read instead
    // of the user waiting for a reload. Re-arms only after the balance has
    // been above 0 again.
    const zeroRefetchDoneRef = useRef(false)
    useEffect(() => {
        if (!initialized || !user) return
        if ((stars ?? 0) > 0) {
            zeroRefetchDoneRef.current = false
            return
        }
        if (zeroRefetchDoneRef.current) return
        zeroRefetchDoneRef.current = true
        const timer = window.setTimeout(async () => {
            try {
                const refreshed = await starGetOrCreate(user)
                applyStarState(refreshed)
            } catch {}
        }, 1500)
        return () => window.clearTimeout(timer)
    }, [initialized, user, stars, applyStarState])

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
                        computeNextRefillAt(state.currentStars, Boolean(user)),
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
                            computeNextRefillAt(state.currentStars, Boolean(user)),
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
                    computeNextRefillAt(state.currentStars, Boolean(user)),
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
                try {
                    void refreshSubscription()
                    const state = await starAdd(user ?? null, amount)
                    applyStarState(state)
                    setNextRefillAt(
                        computeNextRefillAt(state.currentStars, Boolean(user)),
                    )
                    broadcastStarsUpdate()
                } catch {
                    // On failure, trigger a refresh to reconcile
                    try {
                        void refreshSubscription()
                        const state = await starGetOrCreate(user ?? null)
                        applyStarState(state)
                        setNextRefillAt(
                            computeNextRefillAt(state.currentStars, Boolean(user)),
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
                        computeNextRefillAt(state.currentStars, Boolean(user)),
                    )
                    broadcastStarsUpdate()
                } catch {
                    try {
                        void refreshSubscription()
                        const state = await starGetOrCreate(user ?? null)
                        applyStarState(state)
                        setNextRefillAt(
                            computeNextRefillAt(state.currentStars, Boolean(user)),
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
                // v2: no spend-time timer bookkeeping — the nextRefillAt
                // effect recomputes from the total balance (countdown only
                // appears once it reaches 0).
            }
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
                        applyStarState(refreshed)
                        setNextRefillAt(
                            computeNextRefillAt(refreshed.currentStars, Boolean(user)),
                        )
                        broadcastStarsUpdate()
                        return
                    }
                    applyStarState(state)
                    setNextRefillAt(
                        computeNextRefillAt(state.currentStars, Boolean(user)),
                    )
                    broadcastStarsUpdate()
                } catch {
                    try {
                        void refreshSubscription()
                        const refreshed = await starGetOrCreate(user ?? null)
                        applyStarState(refreshed)
                        setNextRefillAt(
                            computeNextRefillAt(refreshed.currentStars, Boolean(user)),
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
