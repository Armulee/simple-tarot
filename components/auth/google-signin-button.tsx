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
        <Button
            type='button'
            variant='outline'
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className={`w-full py-4 text-sm font-semibold transition-all duration-300 border bg-card/10 backdrop-blur-sm border-border/20 hover:bg-card/20 text-foreground hover:text-foreground ${className}`}
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
    )
}
