"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function AuthCallback() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      // If Supabase redirected back with error params, surface them and bounce to sign-in
      const urlError = params.get("error")
      const urlDesc = params.get("error_description")
      if (urlError || urlDesc) {
        const message = decodeURIComponent(urlDesc || urlError || "Authentication error")
        toast.error(message)
        const qs = new URLSearchParams()
        if (urlError) qs.set("error", urlError)
        if (urlDesc) qs.set("error_description", urlDesc)
        router.push(`/signin?${qs.toString()}`)
        return
      }
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          toast.error(error.message || 'Authentication error')
          const qs = new URLSearchParams({ error: 'auth_callback_error', error_description: encodeURIComponent(error.message || '') })
          router.push(`/signin?${qs.toString()}`)
        } else if (data.session) {
          router.push('/')
        } else {
          router.push('/signin')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        toast.error('Authentication error')
        router.push('/signin?error=auth_callback_error')
      }
    }

    // Only run callback if we're in the browser and have proper Supabase config
    if (typeof window !== 'undefined') {
      handleAuthCallback()
    } else {
      // Fallback for SSR
      router.push('/signin')
    }
  }, [router, params])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center float-animation">
          <span className="text-primary font-serif font-bold text-2xl">✦</span>
        </div>
        <h1 className="font-serif font-bold text-2xl">Completing sign in...</h1>
        <p className="text-muted-foreground">Please wait while we complete your authentication.</p>
      </div>
    </div>
  )
}