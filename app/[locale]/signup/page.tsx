"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Link } from "@/i18n/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useTranslations } from "next-intl"

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
    const { signUp } = useAuth()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess(false)

        if (formData.password !== formData.confirmPassword) {
            setError(t("errorPasswordMismatch"))
            return
        }

        if (!formData.agreeToTerms) {
            setError(t("errorTermsRequired"))
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
                // Redirect to sign-in page after successful registration
                setTimeout(() => {
                    router.push("/signin")
                }, 2000)
            }
        } catch {
            setError(t("errorGeneric"))
        } finally {
            setIsLoading(false)
        }
    }

    const updateFormData = (field: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    return (
        <div className='w-full mx-auto max-w-md space-y-8'>
            {/* Header */}
            <div className='text-center space-y-4'>
                <div className='w-16 h-16 mx-auto rounded-full bg-secondary/20 flex items-center justify-center float-animation'>
                    <span className='text-secondary font-serif font-bold text-2xl'>
                        ✨
                    </span>
                </div>
                <div className='space-y-2'>
                    <h1 className='font-serif font-bold text-3xl text-balance'>
                        {t("title")}
                    </h1>
                    <p className='text-muted-foreground'>{t("subtitle")}</p>
                </div>
            </div>

            {/* Sign Up Form */}
            <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20 card-glow'>
                {error && (
                    <div className='mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md'>
                        {error}
                    </div>
                )}
                {success && (
                    <div className='mb-4 p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md'>
                        {t("success")}
                    </div>
                )}
                <form onSubmit={handleSubmit} className='space-y-6'>
                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <Label
                                htmlFor='name'
                                className='text-sm font-medium'
                            >
                                {t("nameLabel")}
                            </Label>
                            <div className='relative'>
                                <Input
                                    id='name'
                                    type='text'
                                    placeholder={t("namePlaceholder")}
                                    value={formData.name}
                                    onChange={(e) =>
                                        updateFormData("name", e.target.value)
                                    }
                                    className='bg-input/20 backdrop-blur-sm border-border/30 focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 transition-all duration-300 floating-input'
                                    required
                                />
                            </div>
                        </div>

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
                                    value={formData.email}
                                    onChange={(e) =>
                                        updateFormData("email", e.target.value)
                                    }
                                    className='bg-input/20 backdrop-blur-sm border-border/30 focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 transition-all duration-300 floating-input'
                                    required
                                />
                            </div>
                        </div>

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
                                    value={formData.password}
                                    onChange={(e) =>
                                        updateFormData(
                                            "password",
                                            e.target.value
                                        )
                                    }
                                    className='bg-input/20 backdrop-blur-sm border-border/30 focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 transition-all duration-300 floating-input'
                                    required
                                />
                            </div>
                        </div>

                        <div className='space-y-2'>
                            <Label
                                htmlFor='confirmPassword'
                                className='text-sm font-medium'
                            >
                                {t("confirmPasswordLabel")}
                            </Label>
                            <div className='relative'>
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
                                    className='bg-input/20 backdrop-blur-sm border-border/30 focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 transition-all duration-300 floating-input'
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className='flex items-start space-x-2'>
                        <Checkbox
                            id='terms'
                            checked={formData.agreeToTerms}
                            onCheckedChange={(checked) =>
                                updateFormData(
                                    "agreeToTerms",
                                    checked as boolean
                                )
                            }
                            className='mt-0.5 border-border data-[state=checked]:bg-secondary data-[state=checked]:border-secondary flex-shrink-0'
                        />
                        <Label
                            htmlFor='terms'
                            className='text-sm text-muted-foreground leading-relaxed'
                        >
                            <span className='whitespace-nowrap'>
                                {t("agreePrefix")}{" "}
                                <Link
                                    href='/terms-of-service'
                                    className='text-secondary hover:text-secondary/80 transition-colors whitespace-normal'
                                >
                                    {t("terms")}
                                </Link>{" "}
                                {t("and")}{" "}
                                <Link
                                    href='/privacy-policy'
                                    className='text-secondary hover:text-secondary/80 transition-colors whitespace-normal'
                                >
                                    {t("privacy")}
                                </Link>
                            </span>
                        </Label>
                    </div>

                    <Button
                        type='submit'
                        disabled={isLoading}
                        className='w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground py-6 text-lg card-glow'
                    >
                        {isLoading ? t("buttonLoading") : t("button")}
                    </Button>
                </form>
            </Card>

            {/* Sign In Link */}
            <div className='text-center'>
                <p className='text-muted-foreground'>
                    {t("signinPrompt")}{" "}
                    <Link
                        href='/signin'
                        className='text-secondary hover:text-secondary/80 transition-colors font-medium'
                    >
                        {t("signinLink")}
                    </Link>
                </p>
            </div>
        </div>
    )
}
