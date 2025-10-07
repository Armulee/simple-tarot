"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { GoogleSignInButton } from "@/components/auth/google-signin-button"
import { AuthDivider } from "@/components/auth/auth-divider"
import { useAuth } from "@/hooks/use-auth"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Mail, Key, ArrowLeft } from "lucide-react"

export default function SignInPage() {
    const t = useTranslations("Auth.SignIn")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false)
    const [showPasswordInput, setShowPasswordInput] = useState(false)
    const [isCheckingEmail, setIsCheckingEmail] = useState(false)
    const router = useRouter()
    const params = useSearchParams()
    const { signIn, user } = useAuth()

    useEffect(() => {
        const err = params.get("error")
        const desc = params.get("error_description")
        if (err || desc) {
            const msg = desc || err || "Authentication error"
            toast.error(msg, { duration: Infinity, closeButton: true })
        }
    }, [params])

    // Guard: if already authenticated and visiting sign-in, redirect back with toast
    useEffect(() => {
        if (!user) return
        const callbackUrl = params.get("callbackUrl") || document.referrer || "/"
        toast.info("You are already signed in. Please sign out before accessing this page.")
        router.replace(callbackUrl)
    }, [user, router, params])

    const checkEmailExists = async (email: string) => {
        setIsCheckingEmail(true)
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password: 'dummy-password-to-check-email'
            })
            
            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    // Email exists but password is wrong
                    return true
                } else if (error.message.includes('Email not confirmed')) {
                    // Email exists but not confirmed
                    return true
                } else {
                    // Email doesn't exist
                    return false
                }
            } else {
                // This shouldn't happen with dummy password, but if it does, email exists
                return true
            }
        } catch (error) {
            console.error('Error checking email:', error)
            return false
        } finally {
            setIsCheckingEmail(false)
        }
    }

    const handleContinue = async () => {
        if (!email) {
            toast.error("Please enter your email address")
            return
        }

        const emailExists = await checkEmailExists(email)
        
        if (emailExists) {
            setShowPasswordInput(true)
        } else {
            toast.error("No account found with this email address. Please sign up first.")
        }
    }

    const handleMagicLink = async () => {
        if (!email) {
            toast.error("Please enter your email address")
            return
        }

        setIsMagicLinkLoading(true)
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`
                }
            })

            if (error) {
                toast.error(error.message || "Failed to send magic link")
            } else {
                toast.success("Magic link sent! Check your email to sign in.")
            }
        } catch (error) {
            console.error('Magic link error:', error)
            toast.error("Failed to send magic link. Please try again.")
        } finally {
            setIsMagicLinkLoading(false)
        }
    }

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const { error } = await signIn(email, password)

            if (error) {
                toast.error(error.message || "Authentication error", { duration: Infinity, closeButton: true })
            } else {
                const callbackUrl = params.get("callbackUrl") || "/"
                router.push(callbackUrl)
                router.refresh()
            }
        } catch {
            toast.error("An error occurred. Please try again.", { duration: Infinity, closeButton: true })
        } finally {
            setIsLoading(false)
        }
    }

    const handleBackToEmail = () => {
        setShowPasswordInput(false)
        setPassword("")
    }

    return (
        <div className='w-full mx-auto max-w-md space-y-8 pt-6 pb-16 relative z-10 px-4 sm:px-6'>
            {/* Header */}
            <div className='text-center space-y-4'>
                <div className='w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center float-animation'>
                    <span className='text-primary font-serif font-bold text-2xl'>
                        ✦
                    </span>
                </div>
                <div className='space-y-2'>
                    <h1 className='font-serif font-bold text-3xl text-balance'>
                        {t("title")}
                    </h1>
                    <p className='text-muted-foreground'>{t("subtitle")}</p>
                </div>
            </div>

            {/* Google Sign In */}
            <GoogleSignInButton>{t("google")}</GoogleSignInButton>

            <AuthDivider />

            {/* Email Input Form */}
            {!showPasswordInput ? (
                <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20 card-glow'>
                    <div className='space-y-6'>
                        <div className='space-y-2'>
                            <Label
                                htmlFor='email'
                                className='text-sm font-medium'
                            >
                                {t("emailLabel")}
                            </Label>
                            <div className='relative'>
                                <Input
                                    id='email'
                                    type='email'
                                    placeholder={t("emailPlaceholder")}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className='bg-input/20 backdrop-blur-sm border-border/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300 floating-input'
                                    required
                                />
                                <div className='absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 to-secondary/5 pointer-events-none opacity-0 transition-opacity duration-300 peer-focus:opacity-100'></div>
                            </div>
                        </div>

                        <div className='space-y-3'>
                            <Button
                                type='button'
                                onClick={handleContinue}
                                disabled={!email || isCheckingEmail}
                                className='w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground py-6 text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 border border-primary/20'
                            >
                                {isCheckingEmail ? (
                                    <>
                                        <div className='w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2' />
                                        Checking Email...
                                    </>
                                ) : (
                                    <>
                                        <Key className='w-5 h-5 mr-2' />
                                        Continue with Password
                                    </>
                                )}
                            </Button>

                            <Button
                                type='button'
                                onClick={handleMagicLink}
                                disabled={!email || isMagicLinkLoading}
                                className='w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 text-purple-300 hover:from-purple-500/30 hover:to-pink-500/30 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/25 py-6 text-lg font-medium transition-all duration-300 backdrop-blur-sm'
                            >
                                {isMagicLinkLoading ? (
                                    <>
                                        <div className='w-4 h-4 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin mr-2' />
                                        Sending Magic Link...
                                    </>
                                ) : (
                                    <>
                                        <Mail className='w-5 h-5 mr-2 text-purple-300' />
                                        ✨ Continue with Magic Link
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </Card>
            ) : (
                /* Password Input Form */
                <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20 card-glow'>
                    <div className='space-y-6'>
                        <div className='flex items-center justify-between'>
                            <h2 className='text-lg font-semibold'>Enter your password</h2>
                            <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                onClick={handleBackToEmail}
                                className='text-muted-foreground hover:text-foreground'
                            >
                                <ArrowLeft className='w-4 h-4 mr-1' />
                                Back
                            </Button>
                        </div>

                        <div className='space-y-2'>
                            <Label className='text-sm font-medium text-muted-foreground'>
                                {email}
                            </Label>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className='space-y-6'>
                            <div className='space-y-2'>
                                <Label
                                    htmlFor='password'
                                    className='text-sm font-medium'
                                >
                                    {t("passwordLabel")}
                                </Label>
                                <div className='relative'>
                                    <Input
                                        id='password'
                                        type='password'
                                        placeholder={t("passwordPlaceholder")}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className='bg-input/20 backdrop-blur-sm border-border/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300 floating-input'
                                        required
                                    />
                                    <div className='absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 to-secondary/5 pointer-events-none opacity-0 transition-opacity duration-300 peer-focus:opacity-100'></div>
                                </div>
                            </div>

                            <div className='flex items-center justify-between text-sm'>
                                <Link
                                    href='/forgot-password'
                                    className='text-primary hover:text-primary/80 transition-colors'
                                >
                                    {t("forgot")}
                                </Link>
                            </div>

                            <Button
                                type='submit'
                                disabled={isLoading}
                                className='w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg card-glow'
                            >
                                {isLoading ? t("buttonLoading") : t("button")}
                            </Button>
                        </form>
                    </div>
                </Card>
            )}

            {/* Sign Up Link */}
            <div className='text-center'>
                <p className='text-muted-foreground'>
                    {t("signupPrompt")}{" "}
                    <Link
                        href='/signup'
                        className='text-primary hover:text-primary/80 transition-colors font-medium'
                    >
                        {t("signupLink")}
                    </Link>
                </p>
            </div>
        </div>
    )
}
