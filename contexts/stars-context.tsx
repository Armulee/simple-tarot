"use client"

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
    type Dispatch,
    type SetStateAction,
} from "react"
import { useAuth } from "./auth-context"

export interface StarTransaction {
    id: string
    transaction_type: string
    amount: number
    description: string | null
    created_at: string
}

export interface DailyClaim {
    id: string
    claim_date: string
    stars_claimed: number
    created_at: string
}

export interface AdWatch {
    id: string
    watch_date: string
    ad_count: number
    stars_earned: number
    created_at: string
}

export interface SocialShare {
    id: string
    platform: string
    share_url: string | null
    stars_earned: number
    created_at: string
}

export interface Referral {
    id: string
    referrer_id: string
    referee_id: string
    referral_code: string
    created_at: string
}

export interface StarsContextType {
    // Current stars balance
    stars: number
    setStars: Dispatch<SetStateAction<number>>

    // Daily claim status
    canClaimDaily: boolean
    dailyStarsClaimed: number

    // Ad watch status
    dailyAdWatches: number
    maxDailyAds: number
    canWatchAd: boolean

    // Loading states
    loading: boolean
    claimingDaily: boolean
    watchingAd: boolean
    sharingSocial: boolean

    // Actions
    claimDailyStars: () => Promise<{ success: boolean; message: string; stars?: number }>
    watchAd: () => Promise<{ success: boolean; message: string; stars?: number }>
    shareOnSocial: (platform: string, shareUrl?: string) => Promise<{ success: boolean; message: string; stars?: number }>
    useStarsForReading: (amount: number) => Promise<{ success: boolean; message: string; stars?: number }>
    getReferralCode: () => Promise<{ success: boolean; code?: string; message: string }>
    useReferralCode: (code: string) => Promise<{ success: boolean; message: string; stars?: number }>

    // Transaction history
    transactions: StarTransaction[]
    loadTransactions: () => Promise<void>

    // Refresh stars balance
    refreshStars: () => Promise<void>
}

const StarsContext = createContext<StarsContextType | undefined>(undefined)

export function StarsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const [stars, setStars] = useState(0)
    const [canClaimDaily, setCanClaimDaily] = useState(false)
    const [dailyStarsClaimed, setDailyStarsClaimed] = useState(0)
    const [dailyAdWatches, setDailyAdWatches] = useState(0)
    const [maxDailyAds] = useState(10)
    const [loading, setLoading] = useState(true)
    const [claimingDaily, setClaimingDaily] = useState(false)
    const [watchingAd, setWatchingAd] = useState(false)
    const [sharingSocial, setSharingSocial] = useState(false)
    const [transactions, setTransactions] = useState<StarTransaction[]>([])

    const canWatchAd = dailyAdWatches < maxDailyAds

    // Load initial stars data
    useEffect(() => {
        if (loading) {
            loadStarsData()
        }
    }, [user, loading])

    const loadStarsData = async () => {
        try {
            setLoading(true)
            const url = user ? `/api/stars/balance?userId=${user.id}` : '/api/stars/balance'
            const response = await fetch(url)
            if (response.ok) {
                const data = await response.json()
                setStars(data.stars || 0)
                setCanClaimDaily(data.canClaimDaily || false)
                setDailyStarsClaimed(data.dailyStarsClaimed || 0)
                setDailyAdWatches(data.dailyAdWatches || 0)
            }
        } catch (error) {
            console.error('Failed to load stars data:', error)
        } finally {
            setLoading(false)
        }
    }

    const claimDailyStars = async (): Promise<{ success: boolean; message: string; stars?: number }> => {
        if (claimingDaily) {
            return { success: false, message: "Already processing..." }
        }

        try {
            setClaimingDaily(true)
            const response = await fetch('/api/stars/claim-daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id || null }),
            })

            const data = await response.json()
            
            if (data.success) {
                setStars(data.stars)
                setCanClaimDaily(false)
                setDailyStarsClaimed(data.dailyStarsClaimed)
                return { success: true, message: data.message, stars: data.stars }
            } else {
                return { success: false, message: data.message }
            }
        } catch (error) {
            console.error('Failed to claim daily stars:', error)
            return { success: false, message: "Failed to claim daily stars. Please try again." }
        } finally {
            setClaimingDaily(false)
        }
    }

    const watchAd = async (): Promise<{ success: boolean; message: string; stars?: number }> => {
        if (watchingAd) {
            return { success: false, message: "Already processing..." }
        }

        if (!canWatchAd) {
            return { success: false, message: "Daily ad limit reached" }
        }

        try {
            setWatchingAd(true)
            const response = await fetch('/api/stars/watch-ad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id || null }),
            })

            const data = await response.json()
            
            if (data.success) {
                setStars(data.stars)
                setDailyAdWatches(data.dailyAdWatches)
                return { success: true, message: data.message, stars: data.stars }
            } else {
                return { success: false, message: data.message }
            }
        } catch (error) {
            console.error('Failed to watch ad:', error)
            return { success: false, message: "Failed to watch ad. Please try again." }
        } finally {
            setWatchingAd(false)
        }
    }

    const shareOnSocial = async (platform: string, shareUrl?: string): Promise<{ success: boolean; message: string; stars?: number }> => {
        if (sharingSocial) {
            return { success: false, message: "Already processing..." }
        }

        try {
            setSharingSocial(true)
            const response = await fetch('/api/stars/social-share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id || null, platform, shareUrl }),
            })

            const data = await response.json()
            
            if (data.success) {
                setStars(data.stars)
                return { success: true, message: data.message, stars: data.stars }
            } else {
                return { success: false, message: data.message }
            }
        } catch (error) {
            console.error('Failed to record social share:', error)
            return { success: false, message: "Failed to record social share. Please try again." }
        } finally {
            setSharingSocial(false)
        }
    }

    const useStarsForReading = async (amount: number): Promise<{ success: boolean; message: string; stars?: number }> => {
        if (stars < amount) {
            return { success: false, message: "Not enough stars for this reading" }
        }

        try {
            const response = await fetch('/api/stars/use-stars', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id || null, amount, transaction_type: 'reading_cost' }),
            })

            const data = await response.json()
            
            if (data.success) {
                setStars(data.stars)
                return { success: true, message: data.message, stars: data.stars }
            } else {
                return { success: false, message: data.message }
            }
        } catch (error) {
            console.error('Failed to use stars:', error)
            return { success: false, message: "Failed to use stars. Please try again." }
        }
    }

    const getReferralCode = async (): Promise<{ success: boolean; code?: string; message: string }> => {
        if (!user) {
            return { success: false, message: "Please log in to get a referral code" }
        }

        try {
            const response = await fetch('/api/stars/referral-code')
            const data = await response.json()
            
            if (data.success) {
                return { success: true, code: data.code, message: data.message }
            } else {
                return { success: false, message: data.message }
            }
        } catch (error) {
            console.error('Failed to get referral code:', error)
            return { success: false, message: "Failed to get referral code. Please try again." }
        }
    }

    const useReferralCode = async (code: string): Promise<{ success: boolean; message: string; stars?: number }> => {
        if (!user) {
            return { success: false, message: "Please log in to use a referral code" }
        }

        try {
            const response = await fetch('/api/stars/use-referral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id || null, code }),
            })

            const data = await response.json()
            
            if (data.success) {
                setStars(data.stars)
                return { success: true, message: data.message, stars: data.stars }
            } else {
                return { success: false, message: data.message }
            }
        } catch (error) {
            console.error('Failed to use referral code:', error)
            return { success: false, message: "Failed to use referral code. Please try again." }
        }
    }

    const loadTransactions = async () => {
        try {
            const url = user ? `/api/stars/transactions?userId=${user.id}` : '/api/stars/transactions'
            const response = await fetch(url)
            if (response.ok) {
                const data = await response.json()
                setTransactions(data.transactions || [])
            }
        } catch (error) {
            console.error('Failed to load transactions:', error)
        }
    }

    const refreshStars = async () => {
        await loadStarsData()
    }

    const value: StarsContextType = {
        stars,
        setStars,
        canClaimDaily,
        dailyStarsClaimed,
        dailyAdWatches,
        maxDailyAds,
        canWatchAd,
        loading,
        claimingDaily,
        watchingAd,
        sharingSocial,
        claimDailyStars,
        watchAd,
        shareOnSocial,
        useStarsForReading,
        getReferralCode,
        useReferralCode,
        transactions,
        loadTransactions,
        refreshStars,
    }

    return (
        <StarsContext.Provider value={value}>
            {children}
        </StarsContext.Provider>
    )
}

export function useStars() {
    const context = useContext(StarsContext)
    if (context === undefined) {
        throw new Error("useStars must be used within a StarsProvider")
    }
    return context
}