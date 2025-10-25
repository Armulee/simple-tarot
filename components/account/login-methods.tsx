"use client"

import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Shield, Mail, Link, Unlink, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { FaGoogle } from "react-icons/fa6"

export function LoginMethods() {
    const { user } = useAuth()
    const t = useTranslations("Account.loginMethods")
    const [isLinking, setIsLinking] = useState(false)
    const [linkingProvider, setLinkingProvider] = useState<string | null>(null)

    const getCurrentProvider = () => {
        if (!user) return null
        return user.app_metadata?.provider || "email"
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
            if (provider === "email") {
                // For email, redirect to password settings or show message
                toast.info(t("emailPasswordSetup"), {
                    description: t("emailPasswordDescription"),
                })
                return
            }

            const { error } = await supabase.auth.linkIdentity({
                provider: provider as "google",
                options: {
                    redirectTo: `${window.location.origin}/account`,
                },
            })

            if (error) {
                throw error
            }

            toast.success(
                `${getProviderName(provider)} account linked successfully!`
            )

            // Refresh the page to update the user data
            window.location.reload()
        } catch (error: unknown) {
            console.error("Error linking provider:", error)
            const errorMessage =
                error instanceof Error ? error.message : "Please try again"
            toast.error(`Failed to link ${getProviderName(provider)} account`, {
                description: errorMessage,
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
                (identity: { provider: string; id: string }) =>
                    identity.provider === provider
            )

            if (!identity) {
                throw new Error("Provider not found")
            }

            const { error } = await supabase.auth.unlinkIdentity(identity)

            if (error) {
                throw error
            }

            toast.success(
                `${getProviderName(provider)} account unlinked successfully!`
            )

            // Refresh the page to update the user data
            window.location.reload()
        } catch (error: unknown) {
            console.error("Error unlinking provider:", error)
            const errorMessage =
                error instanceof Error ? error.message : "Please try again"
            toast.error(
                `Failed to unlink ${getProviderName(provider)} account`,
                {
                    description: errorMessage,
                }
            )
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
            case "google":
                return <FaGoogle className='w-5 h-5 text-blue-500' />
            case "email":
            default:
                return <Mail className='w-5 h-5 text-blue-500' />
        }
    }

    const getProviderName = (provider: string) => {
        switch (provider) {
            case "google":
                return t("google")
            case "email":
            default:
                return t("emailPassword")
        }
    }

    const getProviderColor = (provider: string) => {
        switch (provider) {
            case "google":
                return "bg-blue-50 border-blue-200 text-blue-700"
            case "email":
            default:
                return "bg-blue-50 border-blue-200 text-blue-700"
        }
    }

    return (
        <Card className='w-full bg-card/50 border-border/30 p-6 shadow-xl shadow-black/20 backdrop-blur-sm hover:border-primary/40 transition-all duration-300'>
            <div className='space-y-6'>
                <div className='flex items-center space-x-3'>
                    <div className='p-2 rounded-lg bg-primary/20'>
                        <Shield className='w-5 h-5 text-primary' />
                    </div>
                    <h2 className='text-2xl font-bold text-white'>
                        {t("title")}
                    </h2>
                </div>

                <div className='space-y-4'>
                    <div>
                        <Label className='text-white font-medium'>
                            {t("activeProvider")}
                        </Label>
                        <div className='mt-3'>
                            <div
                                className={`flex items-center space-x-3 p-4 rounded-xl border-2 ${getProviderColor(getCurrentProvider() || "email")} bg-gradient-to-r from-white/10 to-white/5`}
                            >
                                <div className='p-2 rounded-lg bg-white/20 flex-shrink-0'>
                                    {getProviderIcon(
                                        getCurrentProvider() || "email"
                                    )}
                                </div>
                                <div className='flex-1 min-w-0'>
                                    <h3 className='font-semibold text-lg'>
                                        {getProviderName(
                                            getCurrentProvider() || "email"
                                        )}
                                    </h3>
                                    <p className='text-sm opacity-80'>
                                        {user?.email || "No email found"}
                                    </p>
                                </div>
                                <div className='flex items-center space-x-2 flex-shrink-0'>
                                    <div className='w-3 h-3 rounded-full bg-blue-500 animate-pulse'></div>
                                    <span className='text-sm font-medium'>
                                        Active
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='space-y-4'>
                    <Label className='text-white font-medium'>
                        {t("availableMethods")}
                    </Label>
                    <div className='grid grid-cols-1 gap-3 mt-3'>
                        {/* Email & Password */}
                        <div
                            className={`w-full flex items-center space-x-3 p-4 rounded-xl border ${isProviderLinked("email") ? "border-green-400 bg-green-500/10" : "border-border/50 bg-background/30"} transition-all duration-200`}
                        >
                            <div className='p-2 rounded-lg bg-blue-500/20 flex-shrink-0'>
                                <Mail className='w-5 h-5 text-blue-400' />
                            </div>
                            <div className='flex-1 min-w-0'>
                                <h3 className='font-medium text-white'>
                                    {t("emailPassword")}
                                </h3>
                                <p className='text-sm text-gray-300'>
                                    {t("emailPasswordDescription")}
                                </p>
                            </div>
                            <div className='flex items-center space-x-2 flex-shrink-0'>
                                {isProviderLinked("email") ? (
                                    <>
                                        <div className='flex items-center space-x-2 text-green-400'>
                                            <div className='w-2 h-2 rounded-full bg-green-400'></div>
                                            <span className='text-xs font-medium'>
                                                Linked
                                            </span>
                                        </div>
                                        {canUnlinkProvider("email") && (
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                onClick={() =>
                                                    handleUnlinkProvider(
                                                        "email"
                                                    )
                                                }
                                                disabled={isLinking}
                                                className='text-red-400 hover:text-red-300 hover:bg-red-500/20 border-red-400/50'
                                            >
                                                {linkingProvider === "email" ? (
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
                                        onClick={() =>
                                            handleLinkProvider("email")
                                        }
                                        disabled={isLinking}
                                        className='text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 border-blue-400/50'
                                    >
                                        {linkingProvider === "email" ? (
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
                        <div
                            className={`flex items-center space-x-3 p-4 rounded-xl border ${isProviderLinked("google") ? "border-green-400 bg-green-500/10" : "border-border/50 bg-background/30"} transition-all duration-200`}
                        >
                            <div className='p-2 rounded-lg bg-blue-500/20 flex-shrink-0'>
                                <FaGoogle className='w-5 h-5 text-white' />
                            </div>
                            <div className='flex-1 min-w-0'>
                                <h3 className='font-medium text-white'>
                                    {t("google")}
                                </h3>
                                <p className='text-sm text-gray-300'>
                                    {t("googleSignInDescription")}
                                </p>
                            </div>
                            <div className='flex items-center space-x-2 flex-shrink-0'>
                                {isProviderLinked("google") ? (
                                    <>
                                        <div className='flex items-center space-x-2 text-green-400'>
                                            <div className='w-2 h-2 rounded-full bg-green-400'></div>
                                            <span className='text-xs font-medium'>
                                                Linked
                                            </span>
                                        </div>
                                        {canUnlinkProvider("google") && (
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                onClick={() =>
                                                    handleUnlinkProvider(
                                                        "google"
                                                    )
                                                }
                                                disabled={isLinking}
                                                className='text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 border-blue-400/50'
                                            >
                                                {linkingProvider ===
                                                "google" ? (
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
                                        onClick={() =>
                                            handleLinkProvider("google")
                                        }
                                        disabled={isLinking}
                                        className='text-blue-400 hover:text-red-300 hover:bg-red-500/20 border-red-400/50'
                                    >
                                        {linkingProvider === "google" ? (
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

                <div className='p-4 rounded-lg bg-background/30 border border-border/50'>
                    <p className='text-xs text-gray-400'>
                        <strong>{t("noteLabel")}</strong> {t("note")}
                    </p>
                </div>
            </div>
        </Card>
    )
}
