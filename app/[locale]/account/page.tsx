"use client"

import { useLocale } from "next-intl"
import {
    EmailSettings,
    PhoneSettings,
    PasswordSettings,
    LoginMethods,
    AccountDeletion,
    useLoginMethod,
} from "@/components/account"

export default function AccountPage() {
    const locale = useLocale()
    const loginMethod = useLoginMethod()

    return (
        <div className='min-h-screen relative overflow-x-hidden'>
            {/* Main Content */}
            <div className='max-w-lg mx-auto px-4 sm:px-6 py-8 relative z-10 w-full'>
                {/* Header */}
                <div className='text-center space-y-6 mb-12'>
                    <div className='flex items-center justify-center space-x-3 mb-4'>
                        <div className='p-3 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm border border-primary/30'>
                            <svg
                                className='w-8 h-8 text-primary'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                                />
                            </svg>
                        </div>
                        <h1 className='text-3xl sm:text-4xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                            Account Settings
                        </h1>
                    </div>
                    <p className='text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed px-2'>
                        Manage your account information, security settings, and
                        preferences
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
