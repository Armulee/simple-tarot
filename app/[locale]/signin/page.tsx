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
import { supabase } from "@/lib/supabase"
import { externalCallbackWithToken } from "@/lib/external-auth-callback"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Mail, Lock, Sparkles, ArrowRight, Star } from "lucide-react"

export default function SignInPage() {
    const t = useTranslations("Auth.SignIn")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const router = useRouter()
    const params = useSearchParams()
    const { signIn, user, session } = useAuth()


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
        const external = externalCallbackWithToken(callbackUrl, session?.access_token)
        if (external) {
            window.location.replace(external)
            return
        }
        toast.info("You are already signed in. Please sign out before accessing this page.")
        router.replace(callbackUrl)
    }, [user, session, router, params])



    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const { error } = await signIn(email, password)

            if (error) {
                toast.error(error.message || "Authentication error", { duration: Infinity, closeButton: true })
            } else {
                const callbackUrl = params.get("callbackUrl") || "/"
                const { data } = await supabase.auth.getSession()
                const external = externalCallbackWithToken(
                    callbackUrl,
                    data.session?.access_token
                )
                if (external) {
                    window.location.replace(external)
                    return
                }
                router.push(callbackUrl)
                router.refresh()
            }
        } catch {
            toast.error("An error occurred. Please try again.", { duration: Infinity, closeButton: true })
        }
    }


    return (
        <div className='relative min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden'>
            <div className='absolute inset-0 pointer-events-none overflow-hidden'>
                <div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse' />
                <div className='absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] animate-pulse delay-700' />
                <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url("/assets/stars-bg.png")] opacity-20 mix-blend-overlay' />
            </div>

            <div className='w-full max-w-[440px] relative z-10'>
                <div className='text-center mb-10 space-y-4'>
                    <div className='relative inline-block'>
                        <div className='w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500'>
                            <Sparkles className='w-10 h-10 text-primary animate-pulse' />
                        </div>
                        <div className='absolute -top-2 -right-2 p-2 rounded-xl bg-accent/20 border border-accent/30 backdrop-blur-md animate-bounce'>
                            <Star className='w-4 h-4 text-accent' fill='currentColor' />
                        </div>
                    </div>
                    <div className='space-y-2'>
                        <h1 className='font-playfair font-bold text-4xl text-white tracking-tight'>
                            {t("title")}
                        </h1>
                        <p className='text-gray-400 text-lg max-w-[300px] mx-auto leading-relaxed'>
                            {t("subtitle")}
                        </p>
                    </div>
                </div>

                <div className='relative group'>
                    <div className='absolute -inset-1 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 rounded-[2.5rem] blur-xl opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200' />

                    <Card className='relative overflow-hidden p-8 sm:p-10 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl'>
                        <div className='space-y-6'>
                            <GoogleSignInButton>
                                <span className='font-medium'>
                                    {t("google")}
                                </span>
                            </GoogleSignInButton>

                            <div className='relative'>
                                <AuthDivider />
                            </div>

                            <form
                                onSubmit={handlePasswordSubmit}
                                className='space-y-5'
                            >
                                <div className='space-y-2'>
                                    <Label
                                        htmlFor='email'
                                        className='text-xs font-semibold uppercase tracking-widest text-gray-500 ml-1'
                                    >
                                        {t("emailLabel")}
                                    </Label>
                                    <div className='relative group/input'>
                                        <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within/input:text-primary transition-colors'>
                                            <Mail className='h-5 w-5' />
                                        </div>
                                        <Input
                                            id='email'
                                            type='email'
                                            placeholder={t("emailPlaceholder")}
                                            value={email}
                                            onChange={(e) =>
                                                setEmail(e.target.value)
                                            }
                                            className='h-14 pl-12 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-2xl transition-all duration-300 placeholder:text-gray-600'
                                            required
                                        />
                                    </div>
                                </div>

                                <div className='space-y-2'>
                                    <div className='flex items-center justify-between ml-1'>
                                        <Label
                                            htmlFor='password'
                                            className='text-xs font-semibold uppercase tracking-widest text-gray-500'
                                        >
                                            {t("passwordLabel")}
                                        </Label>
                                        <Link
                                            href='/forgot-password'
                                            className='text-xs font-medium text-primary hover:text-primary/80 transition-colors'
                                        >
                                            {t("forgot")}
                                        </Link>
                                    </div>
                                    <div className='relative group/input'>
                                        <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within/input:text-primary transition-colors'>
                                            <Lock className='h-5 w-5' />
                                        </div>
                                        <Input
                                            id='password'
                                            type='password'
                                            placeholder={t("passwordPlaceholder")}
                                            value={password}
                                            onChange={(e) =>
                                                setPassword(e.target.value)
                                            }
                                            className='h-14 pl-12 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-2xl transition-all duration-300 placeholder:text-gray-600'
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type='submit'
                                    disabled={!email || !password}
                                    className='w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all duration-300 group/btn'
                                >
                                    <span className='flex items-center justify-center gap-2'>
                                        {t("button")}
                                        <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
                                    </span>
                                </Button>
                            </form>
                        </div>
                    </Card>
                </div>

                <div className='mt-8 text-center'>
                    <p className='text-gray-400 font-medium'>
                        {t("signupPrompt")}{" "}
                        <Link
                            href='/signup'
                            className='text-white hover:text-primary transition-colors underline underline-offset-4 decoration-primary/30 hover:decoration-primary'
                        >
                            {t("signupLink")}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
