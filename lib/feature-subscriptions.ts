"use client"

import { supabase } from "@/lib/supabase"

export type SubscribeResult =
    | { status: "subscribed"; email?: string }
    | { status: "needs-login" }
    | { status: "error" }

async function authHeader(): Promise<string | null> {
    const {
        data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token ? `Bearer ${session.access_token}` : null
}

/**
 * Subscribe the current user to a feature waitlist. Returns "needs-login" when
 * there's no session, so the caller can send the user to sign in (and
 * auto-subscribe on the way back via /subscribe).
 */
export async function subscribeToFeature(
    feature: string,
): Promise<SubscribeResult> {
    const auth = await authHeader()
    if (!auth) return { status: "needs-login" }
    try {
        const res = await fetch("/api/feature-subscriptions", {
            method: "POST",
            headers: { "content-type": "application/json", Authorization: auth },
            body: JSON.stringify({ feature }),
        })
        if (res.status === 401) return { status: "needs-login" }
        if (!res.ok) return { status: "error" }
        const data = await res.json().catch(() => ({}))
        return { status: "subscribed", email: data?.email }
    } catch {
        return { status: "error" }
    }
}

/** Whether the current user is already subscribed (false when logged out). */
export async function isSubscribedToFeature(feature: string): Promise<boolean> {
    const auth = await authHeader()
    if (!auth) return false
    try {
        const res = await fetch(
            `/api/feature-subscriptions?feature=${encodeURIComponent(feature)}`,
            { headers: { Authorization: auth } },
        )
        if (!res.ok) return false
        const data = await res.json().catch(() => ({}))
        return Boolean(data?.subscribed)
    } catch {
        return false
    }
}
