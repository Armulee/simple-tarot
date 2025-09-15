"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/signin?error=auth_callback_error')
        } else if (data.session) {
          router.push('/')
        } else {
          router.push('/signin')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
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
  }, [router])

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