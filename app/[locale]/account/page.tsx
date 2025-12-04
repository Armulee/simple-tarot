"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { useTranslations } from "next-intl"
import {
    EmailSettings,
    PhoneSettings,
    PasswordSettings,
    LoginMethods,
    AccountDeletion,
    useLoginMethod,
} from "@/components/account"
import { Shield } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

export default function AccountPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const locale = useLocale()
    const loginMethod = useLoginMethod()
    const t = useTranslations("Account")

    // Auth guard: redirect to signin if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            toast.error(
                t("authRequired") || "Please sign in to access account settings"
            )
            router.push("/signin?callbackUrl=/account")
        }
    }, [user, authLoading, router, t])

    // Show loading state
    if (authLoading) {
        return (
            <div className='min-h-screen flex items-center justify-center'>
                <div className='text-center'>
                    <Shield className='w-8 h-8 animate-spin mx-auto mb-4 text-primary' />
                    <p className='text-muted-foreground'>
                        {t("loading") || "Loading..."}
                    </p>
                </div>
            </div>
        )
    }

    // Don't render if not authenticated (redirect will happen)
    if (!user) {
        return null
    }

    return (
        <div className='min-h-screen relative overflow-x-hidden'>
            {/* Main Content */}
            <div className='max-w-lg mx-auto px-4 sm:px-6 py-8 relative z-10 w-full'>
                {/* Header */}
                <div className='text-center space-y-6 mb-12'>
                    <div className='flex items-center justify-center space-x-3 mb-4'>
                        <div className='p-3 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm border border-primary/30'>
                            <Shield className='w-8 h-8 text-accent' />
                        </div>
                        <h1 className='text-3xl sm:text-4xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                            {t("title")}
                        </h1>
                    </div>
                    <p className='text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed px-2'>
                        {t("subtitle")}
                    </p>
                </div>

                {/* Settings Grid */}
                <div className='grid gap-6 md:grid-cols-1 lg:grid-cols-2 relative z-10 max-w-full'>
                    {/* Email Settings */}
                    <div className='lg:col-span-1 min-w-0 overflow-hidden'>
                        <EmailSettings />
                    </div>

                    {/* Phone Settings */}
                    <div className='lg:col-span-1 min-w-0 overflow-hidden'>
                        <PhoneSettings locale={locale} />
                    </div>

                    {/* Login Methods */}
                    <div className='lg:col-span-2 min-w-0 overflow-hidden'>
                        <LoginMethods />
                    </div>

                    {/* Password Settings */}
                    <div className='lg:col-span-1 min-w-0 overflow-hidden'>
                        <PasswordSettings loginMethod={loginMethod} />
                    </div>

                    {/* Account Deletion */}
                    <div className='lg:col-span-1 min-w-0 overflow-hidden'>
                        <AccountDeletion />
                    </div>
                </div>
            </div>
        </div>
    )
}
