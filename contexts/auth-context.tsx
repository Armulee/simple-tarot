"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"
import { User, AuthError } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { starSyncUserToDevice } from "@/lib/stars"
import { ProfileProvider } from "@/contexts/profile-context"

interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    signUp: (
        email: string,
        password: string,
        metadata?: { name?: string }
    ) => Promise<{ error: AuthError | null }>
    signIn: (
        email: string,
        password: string
    ) => Promise<{ error: AuthError | null }>
    signInWithGoogle: (
        callbackUrl?: string | null
    ) => Promise<{ error: AuthError | null }>
    signOut: () => Promise<{ error: AuthError | null }>
    resetPassword: (email: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Get initial session
        const getInitialSession = async () => {
            const {
                data: { session },
                error,
            } = await supabase.auth.getSession()
            if (error) {
                console.error("Error getting session:", error)
            } else {
                setSession(session)
                setUser(session?.user ?? null)
            }
            setLoading(false)
        }

        getInitialSession()

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            async (_event: AuthChangeEvent, session: Session | null) => {
                setSession(session)
                setUser(session?.user ?? null)
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const signUp = async (
        email: string,
        password: string,
        metadata?: { name?: string }
    ) => {
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata,
                },
            })
            return { error }
        } catch {
            return {
                error: {
                    name: "AuthError",
                    message: "Authentication service not available",
                } as AuthError,
            }
        }
    }

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            return { error }
        } catch {
            return {
                error: {
                    name: "AuthError",
                    message: "Authentication service not available",
                } as AuthError,
            }
        }
    }

    const signInWithGoogle = async (callbackUrl?: string | null) => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`,
                },
            })
            return { error }
        } catch {
            return {
                error: {
                    name: "AuthError",
                    message: "Authentication service not available",
                } as AuthError,
            }
        }
    }

    const signOut = async () => {
        try {
            // Before logging out, sync current user balance to device row
            try {
                if (user) {
                    await starSyncUserToDevice()
                }
            } catch {}
            const { error } = await supabase.auth.signOut()
            return { error }
        } catch {
            return {
                error: {
                    name: "AuthError",
                    message: "Authentication service not available",
                } as AuthError,
            }
        }
    }

    const resetPassword = async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            })
            return { error }
        } catch {
            return {
                error: {
                    name: "AuthError",
                    message: "Authentication service not available",
                } as AuthError,
            }
        }
    }

    const value = {
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
    }

    return (
        <AuthContext.Provider value={value}>
            <ProfileProvider>{children}</ProfileProvider>
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
