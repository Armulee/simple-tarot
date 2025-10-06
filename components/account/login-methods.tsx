"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
    Shield, 
    Mail, 
    Github, 
    Chrome, 
    Apple, 
    Facebook,
    Twitter,
    Linkedin,
    Check,
    Link,
    Unlink,
    Loader2
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"

interface SocialProvider {
    id: string
    name: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    bgColor: string
    available: boolean
}

const SOCIAL_PROVIDERS: SocialProvider[] = [
    {
        id: "google",
        name: "Google",
        icon: Chrome,
        color: "text-red-500",
        bgColor: "bg-red-50 hover:bg-red-100",
        available: true
    },
    {
        id: "github",
        name: "GitHub",
        icon: Github,
        color: "text-gray-800",
        bgColor: "bg-gray-50 hover:bg-gray-100",
        available: true
    },
    {
        id: "apple",
        name: "Apple",
        icon: Apple,
        color: "text-gray-800",
        bgColor: "bg-gray-50 hover:bg-gray-100",
        available: true
    },
    {
        id: "facebook",
        name: "Facebook",
        icon: Facebook,
        color: "text-blue-600",
        bgColor: "bg-blue-50 hover:bg-blue-100",
        available: true
    },
    {
        id: "twitter",
        name: "Twitter",
        icon: Twitter,
        color: "text-blue-400",
        bgColor: "bg-blue-50 hover:bg-blue-100",
        available: true
    },
    {
        id: "linkedin",
        name: "LinkedIn",
        icon: Linkedin,
        color: "text-blue-700",
        bgColor: "bg-blue-50 hover:bg-blue-100",
        available: true
    }
]

export function LoginMethods() {
    const { user } = useAuth()
    const [linkedProviders, setLinkedProviders] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [linkingProvider, setLinkingProvider] = useState<string | null>(null)

    useEffect(() => {
        if (user) {
            // Get currently linked providers from user metadata
            const providers = user.app_metadata?.providers || []
            setLinkedProviders(providers)
        }
    }, [user])

    const handleLinkProvider = async (providerId: string) => {
        if (linkingProvider) return

        setLinkingProvider(providerId)
        setIsLoading(true)

        try {
            const { error } = await supabase.auth.linkIdentity({
                provider: providerId as 'google' | 'github' | 'apple' | 'facebook' | 'twitter' | 'linkedin',
                options: {
                    redirectTo: `${window.location.origin}/account`
                }
            })

            if (error) {
                throw error
            }

            toast.success(`${SOCIAL_PROVIDERS.find(p => p.id === providerId)?.name} account linked successfully!`)
            
            // Refresh the page to update the user data
            window.location.reload()
        } catch (error: unknown) {
            console.error('Error linking provider:', error)
            const errorMessage = error instanceof Error ? error.message : 'Please try again'
            toast.error(`Failed to link ${SOCIAL_PROVIDERS.find(p => p.id === providerId)?.name} account`, {
                description: errorMessage
            })
        } finally {
            setLinkingProvider(null)
            setIsLoading(false)
        }
    }

    const handleUnlinkProvider = async (providerId: string) => {
        if (linkingProvider) return

        setLinkingProvider(providerId)
        setIsLoading(true)

        try {
            // Get the identity to unlink
            const { data: identities } = await supabase.auth.getUser()
            const identity = identities.user?.identities?.find(
                (identity: { provider: string; id: string }) => identity.provider === providerId
            )

            if (!identity) {
                throw new Error('Provider not found')
            }

            const { error } = await supabase.auth.unlinkIdentity(identity)

            if (error) {
                throw error
            }

            toast.success(`${SOCIAL_PROVIDERS.find(p => p.id === providerId)?.name} account unlinked successfully!`)
            
            // Update local state
            setLinkedProviders(prev => prev.filter(p => p !== providerId))
        } catch (error: unknown) {
            console.error('Error unlinking provider:', error)
            const errorMessage = error instanceof Error ? error.message : 'Please try again'
            toast.error(`Failed to unlink ${SOCIAL_PROVIDERS.find(p => p.id === providerId)?.name} account`, {
                description: errorMessage
            })
        } finally {
            setLinkingProvider(null)
            setIsLoading(false)
        }
    }

    const isProviderLinked = (providerId: string) => {
        return linkedProviders.includes(providerId)
    }

    const getCurrentProvider = () => {
        if (!user) return null
        return user.app_metadata?.provider || 'email'
    }

    const canUnlinkProvider = (providerId: string) => {
        const currentProvider = getCurrentProvider()
        // Can't unlink the current login method if it's the only one
        return currentProvider !== providerId || linkedProviders.length > 1
    }

    return (
        <Card className="p-6 space-y-6">
            <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                    <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-foreground">
                        Login Methods
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Manage how you sign in to your account
                    </p>
                </div>
            </div>

            {/* Current Login Method */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Current Login Method</h4>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <Mail className="w-5 h-5 text-accent" />
                    <span className="text-sm font-medium">
                        {user?.email || 'No email found'}
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                        {getCurrentProvider() === 'email' ? 'Email & Password' : getCurrentProvider()}
                    </Badge>
                </div>
            </div>

            {/* Social Login Methods */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Social Login Methods</h4>
                <div className="grid gap-3">
                    {SOCIAL_PROVIDERS.map((provider) => {
                        const isLinked = isProviderLinked(provider.id)
                        const isCurrent = getCurrentProvider() === provider.id
                        const canUnlink = canUnlinkProvider(provider.id)
                        const isLinking = linkingProvider === provider.id

                        return (
                            <div
                                key={provider.id}
                                className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                                    isLinked
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-background border-border hover:border-accent/50'
                                }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-lg ${provider.bgColor}`}>
                                        <provider.icon className={`w-5 h-5 ${provider.color}`} />
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium">
                                            {provider.name}
                                        </span>
                                        {isCurrent && (
                                            <Badge variant="secondary" className="ml-2 text-xs">
                                                Current
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {isLinked ? (
                                        <>
                                            <div className="flex items-center space-x-1 text-green-600">
                                                <Check className="w-4 h-4" />
                                                <span className="text-xs font-medium">Linked</span>
                                            </div>
                                            {canUnlink && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleUnlinkProvider(provider.id)}
                                                    disabled={isLoading}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    {isLinking ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Unlink className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleLinkProvider(provider.id)}
                                            disabled={isLoading || !provider.available}
                                            className="text-accent hover:text-accent-foreground hover:bg-accent"
                                        >
                                            {isLinking ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Link className="w-4 h-4" />
                                            )}
                                            Link
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Info */}
            <div className="p-4 rounded-lg bg-muted/50 border border-muted">
                <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> You can link multiple social accounts to your profile. 
                    You must keep at least one login method active. The current login method 
                    cannot be unlinked if it&apos;s the only one available.
                </p>
            </div>
        </Card>
    )
}