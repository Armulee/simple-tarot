"use client"

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useRef,
    ReactNode,
} from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { fetchGoogleGender } from "@/lib/google/people"

interface ProfileData {
    id: string
    name: string
    bio: string | null
    birth_date: string | null
    birth_time: string | null
    birth_place: string | null
    job: string | null
    gender: string | null
    consented_at: string | null
    created_at: string
    updated_at: string
}

export interface PersonalBirthChart {
    id: string
    day: number
    month: number
    year: number
    hour: number
    minute: number
    timezone: number
    lat: number
    lng: number
    country: string | null
    state_province: string | null
    houses: Record<string, unknown> | null
    planets: Record<string, unknown> | null
    created_at: string
}

interface ProfileContextType {
    profile: ProfileData | null
    loading: boolean
    refreshProfile: () => Promise<void>
    updateProfile: (updates: Partial<ProfileData>) => void
    birthChart: PersonalBirthChart | null
    refreshBirthChart: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [loading, setLoading] = useState(false)
    const [birthChart, setBirthChart] = useState<PersonalBirthChart | null>(
        null,
    )

    const loadProfile = async () => {
        if (!user) {
            setProfile(null)
            return
        }

        setLoading(true)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) return

            const response = await fetch("/api/profile", {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
            })

            if (response.ok) {
                const { profile: profileData } = await response.json()
                setProfile(profileData)
            }
        } catch (error) {
            console.error("Failed to load profile:", error)
        } finally {
            setLoading(false)
        }
    }

    const loadBirthChart = async () => {
        if (!user) {
            setBirthChart(null)
            return
        }
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) return

            const response = await fetch("/api/birth-chart/me", {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
            })

            if (response.ok) {
                const { chart } = (await response.json()) as {
                    chart: PersonalBirthChart | null
                }
                setBirthChart(chart ?? null)
            }
        } catch (error) {
            console.error("Failed to load birth chart:", error)
        }
    }

    const refreshProfile = async () => {
        await loadProfile()
    }

    const refreshBirthChart = async () => {
        await loadBirthChart()
    }

    const updateProfile = (updates: Partial<ProfileData>) => {
        setProfile((prev) => (prev ? { ...prev, ...updates } : null))
    }

    useEffect(() => {
        loadProfile()
        loadBirthChart()
    }, [user])

    const enrichmentAttemptedRef = useRef(false)

    useEffect(() => {
        // Pull gender from Google People API on the SIGNED_IN window. The
        // OAuth `provider_token` only exists in the session right after the
        // redirect, so this is our single chance per sign-in.
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event !== "SIGNED_IN" || !session) return
            if (enrichmentAttemptedRef.current) return
            enrichmentAttemptedRef.current = true

            try {
                const provider = session.user?.app_metadata?.provider
                const providerToken = session.provider_token
                if (provider !== "google" || !providerToken) return

                const gender = await fetchGoogleGender(providerToken)
                if (!gender) return

                const response = await fetch("/api/profile/oauth-enrich", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ gender }),
                })
                if (!response.ok) return
                const result = (await response.json()) as { updated?: boolean }
                if (result.updated) {
                    await loadProfile()
                }
            } catch (error) {
                console.error("Google gender enrichment failed:", error)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    return (
        <ProfileContext.Provider
            value={{
                profile,
                loading,
                refreshProfile,
                updateProfile,
                birthChart,
                refreshBirthChart,
            }}
        >
            {children}
        </ProfileContext.Provider>
    )
}

export function useProfile() {
    const context = useContext(ProfileContext)
    if (context === undefined) {
        throw new Error("useProfile must be used within a ProfileProvider")
    }
    return context
}
