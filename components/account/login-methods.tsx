"use client"

import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { 
    Shield, 
    Mail,
    Chrome,
    Link,
    Unlink,
    Loader2
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useState } from "react"

export function LoginMethods() {
    const { user } = useAuth()
    const [isLinking, setIsLinking] = useState(false)
    const [linkingProvider, setLinkingProvider] = useState<string | null>(null)

    const getCurrentProvider = () => {
        if (!user) return null
        return user.app_metadata?.provider || 'email'
    }

    const getLinkedProviders = () => {
        if (!user) return []
        return user.app_metadata?.providers || []
    }

    const isProviderLinked = (provider: string) => {
        const linkedProviders = getLinkedProviders()
        return linkedProviders.includes(provider)
    }

    const handleLinkProvider = async (provider: string) => {
        if (isLinking) return

        setLinkingProvider(provider)
        setIsLinking(true)

        try {
            if (provider === 'email') {
                // For email, redirect to password settings or show message
                toast.info("Email & Password Setup", {
                    description: "Please use the Password Settings section below to set up your email and password."
                })
                return
            }

            const { error } = await supabase.auth.linkIdentity({
                provider: provider as 'google',
                options: {
                    redirectTo: `${window.location.origin}/account`
                }
            })

            if (error) {
                throw error
            }

            toast.success(`${getProviderName(provider)} account linked successfully!`)
            
            // Refresh the page to update the user data
            window.location.reload()
        } catch (error: unknown) {
            console.error('Error linking provider:', error)
            const errorMessage = error instanceof Error ? error.message : 'Please try again'
            toast.error(`Failed to link ${getProviderName(provider)} account`, {
                description: errorMessage
            })
        } finally {
            setLinkingProvider(null)
            setIsLinking(false)
        }
    }

    const handleUnlinkProvider = async (provider: string) => {
        if (isLinking) return

        setLinkingProvider(provider)
        setIsLinking(true)

        try {
            // Get the identity to unlink
            const { data: identities } = await supabase.auth.getUser()
            const identity = identities.user?.identities?.find(
                (identity: { provider: string; id: string }) => identity.provider === provider
            )

            if (!identity) {
                throw new Error('Provider not found')
            }

            const { error } = await supabase.auth.unlinkIdentity(identity)

            if (error) {
                throw error
            }

            toast.success(`${getProviderName(provider)} account unlinked successfully!`)
            
            // Refresh the page to update the user data
            window.location.reload()
        } catch (error: unknown) {
            console.error('Error unlinking provider:', error)
            const errorMessage = error instanceof Error ? error.message : 'Please try again'
            toast.error(`Failed to unlink ${getProviderName(provider)} account`, {
                description: errorMessage
            })
        } finally {
            setLinkingProvider(null)
            setIsLinking(false)
        }
    }

    const canUnlinkProvider = (provider: string) => {
        const currentProvider = getCurrentProvider()
        const linkedProviders = getLinkedProviders()
        // Can't unlink the current login method if it's the only one
        return currentProvider !== provider || linkedProviders.length > 1
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
                            {/* Email & Password */}
                            <div className={`flex items-center space-x-4 p-4 rounded-xl border ${isProviderLinked('email') ? 'border-green-400 bg-green-500/10' : 'border-border/50 bg-background/30'} transition-all duration-200`}>
                                <div className='p-2 rounded-lg bg-blue-500/20'>
                                    <Mail className='w-5 h-5 text-blue-400' />
                                </div>
                                <div className='flex-1'>
                                    <h3 className='font-medium text-white'>Email & Password</h3>
                                    <p className='text-sm text-muted-foreground'>Secure email-based authentication</p>
                                </div>
                                <div className='flex items-center space-x-2'>
                                    {isProviderLinked('email') ? (
                                        <>
                                            <div className='flex items-center space-x-2 text-green-400'>
                                                <div className='w-2 h-2 rounded-full bg-green-400'></div>
                                                <span className='text-xs font-medium'>Linked</span>
                                            </div>
                                            {canUnlinkProvider('email') && (
                                                <Button
                                                    variant='outline'
                                                    size='sm'
                                                    onClick={() => handleUnlinkProvider('email')}
                                                    disabled={isLinking}
                                                    className='text-red-400 hover:text-red-300 hover:bg-red-500/20 border-red-400/50'
                                                >
                                                    {linkingProvider === 'email' ? (
                                                        <Loader2 className='w-4 h-4 animate-spin' />
                                                    ) : (
                                                        <Unlink className='w-4 h-4' />
                                                    )}
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() => handleLinkProvider('email')}
                                            disabled={isLinking}
                                            className='text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 border-blue-400/50'
                                        >
                                            {linkingProvider === 'email' ? (
                                                <Loader2 className='w-4 h-4 animate-spin' />
                                            ) : (
                                                <Link className='w-4 h-4' />
                                            )}
                                            Link
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Google */}
                            <div className={`flex items-center space-x-4 p-4 rounded-xl border ${isProviderLinked('google') ? 'border-green-400 bg-green-500/10' : 'border-border/50 bg-background/30'} transition-all duration-200`}>
                                <div className='p-2 rounded-lg bg-red-500/20'>
                                    <Chrome className='w-5 h-5 text-red-400' />
                                </div>
                                <div className='flex-1'>
                                    <h3 className='font-medium text-white'>Google</h3>
                                    <p className='text-sm text-muted-foreground'>Sign in with Google account</p>
                                </div>
                                <div className='flex items-center space-x-2'>
                                    {isProviderLinked('google') ? (
                                        <>
                                            <div className='flex items-center space-x-2 text-green-400'>
                                                <div className='w-2 h-2 rounded-full bg-green-400'></div>
                                                <span className='text-xs font-medium'>Linked</span>
                                            </div>
                                            {canUnlinkProvider('google') && (
                                                <Button
                                                    variant='outline'
                                                    size='sm'
                                                    onClick={() => handleUnlinkProvider('google')}
                                                    disabled={isLinking}
                                                    className='text-red-400 hover:text-red-300 hover:bg-red-500/20 border-red-400/50'
                                                >
                                                    {linkingProvider === 'google' ? (
                                                        <Loader2 className='w-4 h-4 animate-spin' />
                                                    ) : (
                                                        <Unlink className='w-4 h-4' />
                                                    )}
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() => handleLinkProvider('google')}
                                            disabled={isLinking}
                                            className='text-red-400 hover:text-red-300 hover:bg-red-500/20 border-red-400/50'
                                        >
                                            {linkingProvider === 'google' ? (
                                                <Loader2 className='w-4 h-4 animate-spin' />
                                            ) : (
                                                <Link className='w-4 h-4' />
                                            )}
                                            Link
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='p-4 rounded-lg bg-background/30 border border-border/50'>
                    <p className='text-xs text-muted-foreground'>
                        <strong>Note:</strong> You can link multiple authentication methods to your account. 
                        You must keep at least one method active. Use the Password Settings section below 
                        to manage your email and password credentials.
                    </p>
                </div>
            </div>
        </Card>
    )
}