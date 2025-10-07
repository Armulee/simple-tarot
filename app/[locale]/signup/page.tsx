"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { UserPlus, Mail, Key, Lock } from "lucide-react"

export default function SignUpPage() {
    const t = useTranslations("Auth.SignUp")
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        agreeToTerms: false,
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const router = useRouter()
    const params = useSearchParams()
    const { signUp, user } = useAuth()
    // Guard: if already authenticated and visiting sign-up, redirect back with toast
    useEffect(() => {
        if (!user) return
        const callbackUrl = params.get("callbackUrl") || document.referrer || "/"
        toast.info("You are already signed in. Please sign out before accessing this page.")
        router.replace(callbackUrl)
    }, [user, router, params])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess(false)

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match")
            return
        }

        if (!formData.agreeToTerms) {
            setError("Please agree to the terms and conditions")
            return
        }

        setIsLoading(true)

        try {
            const { error } = await signUp(formData.email, formData.password, {
                name: formData.name,
            })

            if (error) {
                setError(error.message)
            } else {
                setSuccess(true)
                const callbackUrl = params.get("callbackUrl") || "/"
                // After signup, route user to sign-in to complete login flow
                router.push(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
            }
        } catch {
            setError("An error occurred. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const updateFormData = (field: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    return (
        <div className='relative min-h-screen flex items-center justify-center px-4 sm:px-6'>
            {/* Background decorative elements */}
            <div className='absolute inset-0 overflow-hidden'>
                <div className='absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse'></div>
                <div className='absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000'></div>
                <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-fuchsia-500/10 to-violet-500/10 rounded-full blur-3xl animate-pulse delay-500'></div>
            </div>

            <div className='w-full max-w-md space-y-8 relative z-10'>
                {/* Header with enhanced styling */}
                <div className='text-center space-y-6'>
                    <div className='inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 rounded-3xl shadow-2xl shadow-pink-500/25 mb-6 transform hover:scale-105 transition-transform duration-300'>
                        <UserPlus className='w-10 h-10 text-white' />
                    </div>
                    <div className='space-y-3'>
                        <h1 className='text-5xl font-bold bg-gradient-to-r from-white via-pink-200 to-purple-200 bg-clip-text text-transparent sm:text-6xl'>
                            {t("title")}
                        </h1>
                        <p className='text-xl text-gray-300 max-w-sm mx-auto leading-relaxed font-light'>{t("subtitle")}</p>
                    </div>
                </div>

                {/* Sign Up Form */}
                <Card className='p-8 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/20 rounded-2xl'>
                    {error && (
                        <div className='mb-6 p-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm'>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className='mb-6 p-4 text-sm text-green-300 bg-green-500/10 border border-green-500/20 rounded-xl backdrop-blur-sm'>
                            {t("success")}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className='space-y-8'>
                        <div className='space-y-6'>
                            <div className='space-y-4'>
                                <Label
                                    htmlFor='name'
                                    className='text-sm font-semibold text-white/90 flex items-center'
                                >
                                    <UserPlus className='w-4 h-4 mr-2 text-pink-400' />
                                    {t("nameLabel")}
                                </Label>
                                <div className='relative group'>
                                    <Input
                                        id='name'
                                        type='text'
                                        placeholder={t("namePlaceholder")}
                                        value={formData.name}
                                        onChange={(e) =>
                                            updateFormData("name", e.target.value)
                                        }
                                        className='peer h-14 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-gray-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/30 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 group-hover:bg-white/10'
                                        required
                                    />
                                    <div className='absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 pointer-events-none opacity-0 transition-opacity duration-300 peer-focus:opacity-100'></div>
                                </div>
                            </div>

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
                                        value={formData.email}
                                        onChange={(e) =>
                                            updateFormData("email", e.target.value)
                                        }
                                        className='peer h-14 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 group-hover:bg-white/10'
                                        required
                                    />
                                    <div className='absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 pointer-events-none opacity-0 transition-opacity duration-300 peer-focus:opacity-100'></div>
                                </div>
                            </div>

                            <div className='space-y-4'>
                                <Label
                                    htmlFor='password'
                                    className='text-sm font-semibold text-white/90 flex items-center'
                                >
                                    <Key className='w-4 h-4 mr-2 text-cyan-400' />
                                    {t("passwordLabel")}
                                </Label>
                                <div className='relative group'>
                                    <Input
                                        id='password'
                                        type='password'
                                        placeholder={t("passwordPlaceholder")}
                                        value={formData.password}
                                        onChange={(e) =>
                                            updateFormData(
                                                "password",
                                                e.target.value
                                            )
                                        }
                                        className='peer h-14 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 group-hover:bg-white/10'
                                        required
                                    />
                                    <div className='absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 pointer-events-none opacity-0 transition-opacity duration-300 peer-focus:opacity-100'></div>
                                </div>
                            </div>

                            <div className='space-y-4'>
                                <Label
                                    htmlFor='confirmPassword'
                                    className='text-sm font-semibold text-white/90 flex items-center'
                                >
                                    <Lock className='w-4 h-4 mr-2 text-blue-400' />
                                    {t("confirmPasswordLabel")}
                                </Label>
                                <div className='relative group'>
                                    <Input
                                        id='confirmPassword'
                                        type='password'
                                        placeholder={t(
                                            "confirmPasswordPlaceholder"
                                        )}
                                        value={formData.confirmPassword}
                                        onChange={(e) =>
                                            updateFormData(
                                                "confirmPassword",
                                                e.target.value
                                            )
                                        }
                                        className='peer h-14 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 group-hover:bg-white/10'
                                        required
                                    />
                                    <div className='absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 pointer-events-none opacity-0 transition-opacity duration-300 peer-focus:opacity-100'></div>
                                </div>
                            </div>
                        </div>

                        <div className='flex items-start space-x-3'>
                            <Checkbox
                                id='terms'
                                checked={formData.agreeToTerms}
                                onCheckedChange={(checked) =>
                                    updateFormData(
                                        "agreeToTerms",
                                        checked as boolean
                                    )
                                }
                                className='mt-1 border-white/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-pink-500 data-[state=checked]:to-purple-500 data-[state=checked]:border-pink-400 flex-shrink-0'
                            />
                            <Label
                                htmlFor='terms'
                                className='text-sm text-gray-300 leading-relaxed'
                            >
                                <span className='whitespace-nowrap'>
                                    {t("agreePrefix")}{" "}
                                    <Link
                                        href='/terms-of-service'
                                        className='text-transparent bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text hover:from-pink-300 hover:to-purple-300 transition-all duration-300 whitespace-normal font-medium'
                                    >
                                        {t("terms")}
                                    </Link>{" "}
                                    {t("and")}{" "}
                                    <Link
                                        href='/privacy-policy'
                                        className='text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text hover:from-purple-300 hover:to-cyan-300 transition-all duration-300 whitespace-normal font-medium'
                                    >
                                        {t("privacy")}
                                    </Link>
                                </span>
                            </Label>
                        </div>

                        <Button
                            type='submit'
                            disabled={isLoading}
                            className='w-full h-14 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl rounded-xl'
                        >
                            {isLoading ? (
                                <>
                                    <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2' />
                                    {t("buttonLoading")}
                                </>
                            ) : (
                                <>
                                    <UserPlus className='w-5 h-5 mr-2' />
                                    {t("button")}
                                </>
                            )}
                        </Button>
                    </form>
                </Card>

                {/* Sign In Link */}
                <div className='text-center'>
                    <p className='text-gray-300 text-lg'>
                        {t("signinPrompt")}{" "}
                        <Link
                            href={`/signin?callbackUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`}
                            className='text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text hover:from-purple-300 hover:to-pink-300 transition-all duration-300 font-semibold'
                        >
                            {t("signinLink")}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
