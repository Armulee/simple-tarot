"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import BrandLoader from "@/components/brand-loader"

export default function AuthCallback() {
    const router = useRouter()
    const params = useSearchParams()

    useEffect(() => {
        const handleAuthCallback = async () => {
            // If Supabase redirected back with error params, surface them and bounce to sign-in
            const urlError = params.get("error")
            const urlDesc = params.get("error_description")
            if (urlError || urlDesc) {
                const qs = new URLSearchParams()
                if (urlError) qs.set("error", urlError)
                if (urlDesc) qs.set("error_description", urlDesc)
                const callbackUrl = params.get("callbackUrl")
                if (callbackUrl) qs.set("callbackUrl", callbackUrl)
                router.push(`/signin?${qs.toString()}`)
                return
            }
            try {
                const { data, error } = await supabase.auth.getSession()

                if (error) {
                    console.error("Auth callback error:", error)
                    const qs = new URLSearchParams({
                        error: "auth_callback_error",
                        error_description: encodeURIComponent(
                            error.message || ""
                        ),
                    })
                    router.push(`/signin?${qs.toString()}`)
                } else if (data.session) {
                    const callbackUrl = params.get("callbackUrl") || "/"
                    router.push(callbackUrl)
                } else {
                    const callbackUrl = params.get("callbackUrl")
                    router.push(
                        callbackUrl
                            ? `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
                            : "/signin"
                    )
                }
            } catch (error) {
                console.error("Auth callback error:", error)
                router.push("/signin?error=auth_callback_error")
            }
        }

        // Only run callback if we're in the browser and have proper Supabase config
        if (typeof window !== "undefined") {
            handleAuthCallback()
        } else {
            // Fallback for SSR
            router.push("/signin")
        }
    }, [router, params])

    return <BrandLoader />
}
