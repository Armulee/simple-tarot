"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { GoogleSignInButton } from "@/components/auth/google-signin-button"
import { AuthDivider } from "@/components/auth/auth-divider"
import { useAuth } from "@/hooks/use-auth"

export default function SignUpForm() {
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
                // Redirect to sign-in page after successful registration
                setTimeout(() => {
                    router.push("/signin")
                }, 2000)
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
        <div className='w-full max-w-md space-y-8'>
            {/* Header */}
            <div className='text-center space-y-4'>
                <div className='w-16 h-16 mx-auto rounded-full bg-secondary/20 flex items-center justify-center float-animation'>
                    <span className='text-secondary font-serif font-bold text-2xl'>
                        ✨
                    </span>
                </div>
                <div className='space-y-2'>
                    <h1 className='font-serif font-bold text-3xl text-balance'>
                        Join the Cosmos
                    </h1>
                    <p className='text-muted-foreground'>
                        Create your account and begin your mystical journey
                    </p>
                </div>
            </div>

            {/* Google Sign Up */}
            <GoogleSignInButton>Sign up with Google</GoogleSignInButton>

            <AuthDivider />

            {/* Sign Up Form */}
            <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20 card-glow'>
                {error && (
                    <div className='mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md'>
                        {error}
                    </div>
                )}
                {success && (
                    <div className='mb-4 p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md'>
                        Account created successfully! Please check your email to
                        verify your account. Redirecting to sign-in...
                    </div>
                )}
                <form onSubmit={handleSubmit} className='space-y-6'>
                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <Label
                                htmlFor='name'
                                className='text-sm font-medium'
                            >
                                Full Name
                            </Label>
                            <div className='relative'>
                                <Input
                                    id='name'
                                    type='text'
                                    placeholder='Enter your full name'
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
                                Email Address
                            </Label>
                            <div className='relative'>
                                <Input
                                    id='email'
                                    type='email'
                                    placeholder='Enter your email'
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
                                Password
                            </Label>
                            <div className='relative'>
                                <Input
                                    id='password'
                                    type='password'
                                    placeholder='Create a password'
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
                                Confirm Password
                            </Label>
                            <div className='relative'>
                                <Input
                                    id='confirmPassword'
                                    type='password'
                                    placeholder='Confirm your password'
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

                    <div className='flex items-center space-x-2'>
                        <Checkbox
                            id='terms'
                            checked={formData.agreeToTerms}
                            onCheckedChange={(checked) =>
                                updateFormData(
                                    "agreeToTerms",
                                    checked as boolean
                                )
                            }
                            className='border-border/30 data-[state=checked]:bg-secondary data-[state=checked]:border-secondary'
                        />
                        <Label
                            htmlFor='terms'
                            className='text-sm text-muted-foreground'
                        >
                            I agree to the{" "}
                            <Link
                                href='/terms'
                                className='text-secondary hover:text-secondary/80 transition-colors'
                            >
                                Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link
                                href='/privacy'
                                className='text-secondary hover:text-secondary/80 transition-colors'
                            >
                                Privacy Policy
                            </Link>
                        </Label>
                    </div>

                    <Button
                        type='submit'
                        disabled={isLoading}
                        className='w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground py-6 text-lg card-glow'
                    >
                        {isLoading ? "Creating Account..." : "Create Account"}
                    </Button>
                </form>
            </Card>

            {/* Sign In Link */}
            <div className='text-center'>
                <p className='text-muted-foreground'>
                    Already have an account?{" "}
                    <Link
                        href='/signin'
                        className='text-secondary hover:text-secondary/80 transition-colors font-medium'
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}