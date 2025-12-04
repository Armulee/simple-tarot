"use client"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { FaGoogle } from "react-icons/fa6"

interface GoogleSignInButtonProps {
    className?: string
    children?: React.ReactNode
}

export function GoogleSignInButton({
    className,
    children,
}: GoogleSignInButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const { signInWithGoogle } = useAuth()
    const params = useSearchParams()

    const handleGoogleSignIn = async () => {
        setIsLoading(true)
        try {
            const callbackUrl = params.get("callbackUrl")
            const { error } = await signInWithGoogle(callbackUrl)
            if (error) {
                console.error("Google sign in error:", error)
            }
        } catch (error) {
            console.error("Google sign in error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className='relative'>
            {/* Aura/Glow effect behind button */}
            <div className='absolute inset-0 rounded-lg bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 blur-xl opacity-50 hover:opacity-70 transition-opacity duration-300 -z-10' />
            <Button
                type='button'
                variant='outline'
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className={`relative w-full py-6 px-6 text-sm font-semibold transition-all duration-300 border bg-card/40 backdrop-blur-md border-border/30 hover:bg-card/50 text-foreground hover:text-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 ${className}`}
            >
                {isLoading ? (
                    <div className='flex items-center space-x-2'>
                        <div className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin' />
                        <span>Continuing...</span>
                    </div>
                ) : (
                    <div className='flex items-center space-x-2'>
                        <FaGoogle />
                        <span>{children || "Continue with Google"}</span>
                    </div>
                )}
            </Button>
        </div>
    )
}
