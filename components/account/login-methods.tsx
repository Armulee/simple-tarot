"use client"

import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { 
    Shield, 
    Mail,
    Chrome
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export function LoginMethods() {
    const { user } = useAuth()

    const getCurrentProvider = () => {
        if (!user) return null
        return user.app_metadata?.provider || 'email'
    }

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case 'google':
                return <Chrome className='w-5 h-5 text-red-500' />
            case 'email':
            default:
                return <Mail className='w-5 h-5 text-blue-500' />
        }
    }

    const getProviderName = (provider: string) => {
        switch (provider) {
            case 'google':
                return 'Google'
            case 'email':
            default:
                return 'Email & Password'
        }
    }

    const getProviderColor = (provider: string) => {
        switch (provider) {
            case 'google':
                return 'bg-red-50 border-red-200 text-red-700'
            case 'email':
            default:
                return 'bg-blue-50 border-blue-200 text-blue-700'
        }
    }

    return (
        <Card className='bg-background/20 backdrop-blur-sm border border-border/30 hover:bg-background/30 transition-all duration-300'>
            <div className='p-6 space-y-6'>
                <div className='flex items-center space-x-3'>
                    <div className='p-2 rounded-lg bg-primary/20'>
                        <Shield className='w-5 h-5 text-primary' />
                    </div>
                    <h2 className='text-2xl font-bold text-white'>Authentication</h2>
                </div>

                <div className='space-y-4'>
                    <div>
                        <Label className='text-white font-medium'>
                            Active Authentication Provider
                        </Label>
                        <div className='mt-3'>
                            <div className={`flex items-center space-x-4 p-4 rounded-xl border-2 ${getProviderColor(getCurrentProvider() || 'email')} bg-gradient-to-r from-white/10 to-white/5`}>
                                <div className='p-2 rounded-lg bg-white/20'>
                                    {getProviderIcon(getCurrentProvider() || 'email')}
                                </div>
                                <div className='flex-1'>
                                    <h3 className='font-semibold text-lg'>
                                        {getProviderName(getCurrentProvider() || 'email')}
                                    </h3>
                                    <p className='text-sm opacity-80'>
                                        {user?.email || 'No email found'}
                                    </p>
                                </div>
                                <div className='flex items-center space-x-2'>
                                    <div className='w-3 h-3 rounded-full bg-green-500 animate-pulse'></div>
                                    <span className='text-sm font-medium'>Active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='space-y-4'>
                    <div>
                        <Label className='text-white font-medium'>
                            Available Authentication Methods
                        </Label>
                        <div className='grid gap-3 mt-3'>
                            {/* Email & Password - Always Available */}
                            <div className={`flex items-center space-x-4 p-4 rounded-xl border ${getCurrentProvider() === 'email' ? 'border-green-400 bg-green-500/10' : 'border-border/50 bg-background/30'} transition-all duration-200`}>
                                <div className='p-2 rounded-lg bg-blue-500/20'>
                                    <Mail className='w-5 h-5 text-blue-400' />
                                </div>
                                <div className='flex-1'>
                                    <h3 className='font-medium text-white'>Email & Password</h3>
                                    <p className='text-sm text-muted-foreground'>Secure email-based authentication</p>
                                </div>
                                {getCurrentProvider() === 'email' && (
                                    <div className='flex items-center space-x-2 text-green-400'>
                                        <div className='w-2 h-2 rounded-full bg-green-400'></div>
                                        <span className='text-xs font-medium'>Current</span>
                                    </div>
                                )}
                            </div>

                            {/* Google - Coming Soon */}
                            <div className='flex items-center space-x-4 p-4 rounded-xl border border-border/30 bg-background/20 opacity-60'>
                                <div className='p-2 rounded-lg bg-red-500/20'>
                                    <Chrome className='w-5 h-5 text-red-400' />
                                </div>
                                <div className='flex-1'>
                                    <h3 className='font-medium text-white'>Google</h3>
                                    <p className='text-sm text-muted-foreground'>Sign in with Google account</p>
                                </div>
                                <div className='px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30'>
                                    <span className='text-xs font-medium text-yellow-300'>Coming Soon</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    )
}