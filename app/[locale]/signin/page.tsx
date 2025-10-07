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
import { useAuth } from "@/hooks/use-auth"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Key, ArrowLeft, Wand2, Mail } from "lucide-react"

export default function SignInPage() {
    const t = useTranslations("Auth.SignIn")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false)
    const [showPasswordInput, setShowPasswordInput] = useState(false)
    const [isCheckingEmail, setIsCheckingEmail] = useState(false)
    const [isEmailValid, setIsEmailValid] = useState(false)
    const router = useRouter()
    const params = useSearchParams()
    const { signIn, user } = useAuth()

    // Email validation function
    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    // Update email validation when email changes
    useEffect(() => {
        setIsEmailValid(validateEmail(email))
    }, [email])

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
        if (!isEmailValid) {
            toast.error("Please enter a valid email address")
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
        if (!isEmailValid) {
            toast.error("Please enter a valid email address")
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
        }
    }

    const handleBackToEmail = () => {
        setShowPasswordInput(false)
        setPassword("")
    }

    return (
        <div className='relative min-h-screen flex items-center justify-center px-4 sm:px-6'>
            {/* Background decorative elements */}
            <div className='absolute inset-0 overflow-hidden'>
                <div className='absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse'></div>
                <div className='absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000'></div>
                <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-full blur-3xl animate-pulse delay-500'></div>
            </div>

            <div className='w-full max-w-md space-y-8 relative z-10'>
                {/* Header with enhanced styling */}
                <div className='text-center space-y-6'>
                    <div className='inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-3xl shadow-2xl shadow-purple-500/25 mb-6 transform hover:scale-105 transition-transform duration-300'>
                        <Key className='w-10 h-10 text-white' />
                    </div>
                    <div className='space-y-3'>
                        <h1 className='text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent sm:text-6xl'>
                            {t("title")}
                        </h1>
                        <p className='text-xl text-gray-300 max-w-sm mx-auto leading-relaxed font-light'>{t("subtitle")}</p>
                    </div>
                </div>

                {/* Google Sign In */}
                <GoogleSignInButton>{t("google")}</GoogleSignInButton>

                <div className='relative'>
                    <div className='absolute inset-0 flex items-center'>
                        <div className='w-full border-t border-white/20'></div>
                    </div>
                    <div className='relative flex justify-center text-sm'>
                        <span className='px-6 bg-gradient-to-r from-purple-900/50 to-pink-900/50 text-gray-300 rounded-full backdrop-blur-sm font-medium'>
                            Or continue with
                        </span>
                    </div>
                </div>

                {/* Email Input Form */}
                {!showPasswordInput ? (
                    <Card className='p-8 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/20 rounded-2xl'>
                        <div className='space-y-8'>
                            <div className='space-y-4'>
                                <Label
                                    htmlFor='email'
                                    className='text-sm font-semibold text-white/90 flex items-center'
                                >
                                    <Mail className='w-4 h-4 mr-2 text-purple-400' />
                                    {t("emailLabel")}
                                </Label>
                                <div className='relative group'>
                                    <Input
                                        id='email'
                                        type='email'
                                        placeholder={t("emailPlaceholder")}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className='peer h-14 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 group-hover:bg-white/10'
                                        required
                                    />
                                    <div className='absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 pointer-events-none opacity-0 transition-opacity duration-300 peer-focus:opacity-100'></div>
                                </div>
                            </div>

                            <div className='space-y-4'>
                                <Button
                                    type='button'
                                    onClick={handleMagicLink}
                                    disabled={!isEmailValid || isMagicLinkLoading}
                                    className={`w-full h-14 text-sm font-semibold transition-all duration-300 rounded-xl border ${
                                        isEmailValid && !isMagicLinkLoading
                                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:shadow-xl border-purple-400/30 hover:border-purple-400/50 transform hover:scale-[1.02]'
                                            : 'bg-gray-500/20 text-gray-400 border-gray-500/30 cursor-not-allowed'
                                    }`}
                                >
                                    {isMagicLinkLoading ? (
                                        <>
                                            <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2' />
                                            <span>Sending Magic Link...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className='w-5 h-5 mr-2' />
                                            <span>Continue with Magic Link</span>
                                        </>
                                    )}
                                </Button>

                                <Button
                                    type='button'
                                    onClick={handleContinue}
                                    disabled={!isEmailValid || isCheckingEmail}
                                    className={`w-full h-14 text-sm font-semibold transition-all duration-300 rounded-xl border ${
                                        isEmailValid && !isCheckingEmail
                                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:shadow-xl border-blue-400/30 hover:border-blue-400/50 transform hover:scale-[1.02]'
                                            : 'bg-gray-500/20 text-gray-400 border-gray-500/30 cursor-not-allowed'
                                    }`}
                                >
                                    {isCheckingEmail ? (
                                        <>
                                            <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2' />
                                            <span>Checking Email...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Key className='w-5 h-5 mr-2' />
                                            <span>Continue with Password</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </Card>
                ) : (
                    /* Password Input Form */
                    <Card className='p-8 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/20 rounded-2xl'>
                        <div className='space-y-8'>
                            <div className='flex items-center justify-between'>
                                <h2 className='text-2xl font-bold text-white'>Enter your password</h2>
                                <Button
                                    type='button'
                                    variant='ghost'
                                    size='sm'
                                    onClick={handleBackToEmail}
                                    className='text-gray-400 hover:text-white transition-colors duration-200 group'
                                >
                                    <ArrowLeft className='w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform duration-200' />
                                    Back
                                </Button>
                            </div>

                            <div className='space-y-2'>
                                <Label className='text-sm font-medium text-gray-300 bg-white/5 px-3 py-2 rounded-lg border border-white/10'>
                                    {email}
                                </Label>
                            </div>

                            <form onSubmit={handlePasswordSubmit} className='space-y-8'>
                                <div className='space-y-4'>
                                    <Label
                                        htmlFor='password'
                                        className='text-sm font-semibold text-white/90 flex items-center'
                                    >
                                        <Key className='w-4 h-4 mr-2 text-blue-400' />
                                        {t("passwordLabel")}
                                    </Label>
                                    <div className='relative group'>
                                        <Input
                                            id='password'
                                            type='password'
                                            placeholder={t("passwordPlaceholder")}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className='peer h-14 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 group-hover:bg-white/10'
                                            required
                                        />
                                        <div className='absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 pointer-events-none opacity-0 transition-opacity duration-300 peer-focus:opacity-100'></div>
                                    </div>
                                </div>

                                <div className='flex items-center justify-between text-sm'>
                                    <Link
                                        href='/forgot-password'
                                        className='text-blue-400 hover:text-blue-300 transition-colors font-medium'
                                    >
                                        {t("forgot")}
                                    </Link>
                                </div>

                                <Button
                                    type='submit'
                                    disabled={!password}
                                    className='w-full h-14 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl rounded-xl'
                                >
                                    {t("button")}
                                </Button>
                            </form>
                        </div>
                    </Card>
                )}

                {/* Sign Up Link */}
                <div className='text-center'>
                    <p className='text-gray-300 text-lg'>
                        {t("signupPrompt")}{" "}
                        <Link
                            href='/signup'
                            className='text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text hover:from-purple-300 hover:to-pink-300 transition-all duration-300 font-semibold'
                        >
                            {t("signupLink")}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
