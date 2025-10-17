"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Star,
    Users,
    Share2,
    Copy,
    Check,
    Gift,
    Crown,
    Sparkles,
    Zap,
    Heart,
    ArrowLeft,
    ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useStars } from "@/contexts/stars-context"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function ReferralPage() {
    const { user, loading: authLoading } = useAuth()
    const { stars } = useStars()
    const router = useRouter()
    const [referralLink, setReferralLink] = useState<string>("")
    const [copied, setCopied] = useState(false)
    const [referralStats, setReferralStats] = useState({
        totalReferrals: 0,
        weeklyReferrals: 0,
        totalEarned: 0,
    })

    // Generate referral link when user is available
    useEffect(() => {
        if (user?.id) {
            const baseUrl = window.location.origin
            const link = `${baseUrl}?ref=${user.id}`
            setReferralLink(link)
        }
    }, [user?.id])

    // Handle unauthenticated users
    useEffect(() => {
        if (!authLoading && !user) {
            toast.info("Please sign in to access your referral program", {
                duration: 4000,
            })
            // Redirect to signin with callback URL
            const callbackUrl = encodeURIComponent(window.location.pathname)
            router.push(`/signin?callbackUrl=${callbackUrl}`)
        }
    }, [authLoading, user, router])

    const copyToClipboard = async () => {
        if (!referralLink) return
        
        try {
            await navigator.clipboard.writeText(referralLink)
            setCopied(true)
            toast.success("Referral link copied to clipboard!")
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            toast.error("Failed to copy link")
        }
    }

    const shareReferral = async () => {
        if (!referralLink) return

        const shareData = {
            title: "Join me on Asking Fate!",
            text: "Discover your destiny with mystical tarot readings and cosmic insights. Use my referral link to get started!",
            url: referralLink,
        }

        if (navigator.share) {
            try {
                await navigator.share(shareData)
            } catch (err) {
                // User cancelled or error occurred
            }
        } else {
            // Fallback to copying
            copyToClipboard()
        }
    }

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                    <p className="text-gray-400">Redirecting to sign in...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative min-h-screen">
            {/* Hero Section */}
            <section className="relative overflow-hidden px-4 py-8 md:py-12">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-green-400/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute top-40 right-16 w-24 h-24 bg-gradient-to-r from-purple-400/15 to-pink-500/15 rounded-full blur-2xl animate-pulse delay-1000" />
                    <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-gradient-to-r from-blue-400/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
                </div>

                <div className="relative z-10 max-w-4xl mx-auto">
                    {/* Back Button */}
                    <div className="mb-6">
                        <Link href="/stars">
                            <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Stars
                            </Button>
                        </Link>
                    </div>

                    {/* Hero Content */}
                    <div className="text-center space-y-6 mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-400/20 to-emerald-500/20 border border-green-500/30 text-green-200 text-sm font-medium">
                            <Users className="w-4 h-4 animate-pulse" />
                            <span>Referral Program</span>
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">
                            Invite Friends, Earn Together
                        </h1>
                        
                        <p className="text-gray-300 max-w-2xl mx-auto text-lg">
                            Share the mystical experience with friends and earn stars together. 
                            Both you and your friends get rewarded when they join!
                        </p>
                    </div>

                    {/* Current Balance */}
                    <div className="mb-8">
                        <Card className="bg-gradient-to-r from-yellow-400/10 via-amber-500/10 to-yellow-600/10 border border-yellow-500/30">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-300 text-sm">Your Current Stars</p>
                                        <p className="text-3xl font-bold text-yellow-400 flex items-center gap-2">
                                            <Star className="w-8 h-8" fill="currentColor" />
                                            {stars ?? 0}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-300 text-sm">Referral Earnings</p>
                                        <p className="text-2xl font-bold text-green-400 flex items-center gap-2">
                                            <Gift className="w-6 h-6" />
                                            {referralStats.totalEarned}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Referral Link Section */}
            <section className="relative px-4 pb-8">
                <div className="max-w-2xl mx-auto">
                    <Card className="bg-gradient-to-r from-green-400/10 via-emerald-500/10 to-green-600/10 border border-green-500/30">
                        <CardHeader>
                            <CardTitle className="text-2xl font-serif text-white flex items-center gap-3">
                                <Share2 className="w-6 h-6 text-green-400" />
                                Your Referral Link
                            </CardTitle>
                            <CardDescription className="text-gray-300">
                                Share this link with friends to earn stars together
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <div className="flex-1 p-3 rounded-lg bg-white/5 border border-white/10 font-mono text-sm text-gray-300 overflow-x-auto whitespace-nowrap">
                                    {referralLink || "Generating..."}
                                </div>
                                <Button
                                    onClick={copyToClipboard}
                                    variant="outline"
                                    size="sm"
                                    className="border-green-500/40 text-green-300 hover:bg-green-500/10 hover:border-green-400/60 flex-shrink-0"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                            
                            <Button
                                onClick={shareReferral}
                                className="w-full rounded-full bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 text-white hover:from-green-300 hover:via-emerald-400 hover:to-green-500 transition-all duration-300"
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                Share Link
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="relative px-4 pb-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-serif font-bold text-white mb-4">
                            How It Works
                        </h2>
                        <p className="text-gray-300 max-w-2xl mx-auto">
                            Simple steps to start earning with your referrals
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="bg-gradient-to-br from-blue-400/10 via-cyan-500/10 to-blue-600/10 border border-blue-500/30">
                            <CardContent className="p-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400/30 to-cyan-500/30 border border-blue-500/40 text-blue-300 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-xl font-bold">1</span>
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">Share Your Link</h3>
                                <p className="text-gray-300 text-sm">
                                    Copy and share your unique referral link with friends through social media, messages, or email.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-400/10 via-pink-500/10 to-purple-600/10 border border-purple-500/30">
                            <CardContent className="p-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400/30 to-pink-500/30 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-xl font-bold">2</span>
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">Friend Signs Up</h3>
                                <p className="text-gray-300 text-sm">
                                    Your friend clicks your link and creates an account on Asking Fate to start their mystical journey.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-400/10 via-emerald-500/10 to-green-600/10 border border-green-500/30">
                            <CardContent className="p-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-400/30 to-emerald-500/30 border border-green-500/40 text-green-300 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-xl font-bold">3</span>
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">Earn Together</h3>
                                <p className="text-gray-300 text-sm">
                                    Both you and your friend receive 5 stars each when they complete registration. Win-win!
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Rewards Section */}
            <section className="relative px-4 pb-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-serif font-bold text-white mb-4">
                            Referral Rewards
                        </h2>
                        <p className="text-gray-300 max-w-2xl mx-auto">
                            Earn stars for every friend you bring to Asking Fate
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="bg-gradient-to-br from-yellow-400/10 via-amber-500/10 to-yellow-600/10 border border-yellow-500/30">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400/30 to-amber-500/30 border border-yellow-500/40 text-yellow-300 flex items-center justify-center">
                                        <Star className="w-6 h-6" fill="currentColor" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">Per Referral</h3>
                                        <p className="text-gray-300">You and your friend each earn</p>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-yellow-400 mb-2">5 Stars</div>
                                    <p className="text-gray-300 text-sm">Instantly credited when friend signs up</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-400/10 via-pink-500/10 to-purple-600/10 border border-purple-500/30">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400/30 to-pink-500/30 border border-purple-500/40 text-purple-300 flex items-center justify-center">
                                        <Crown className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">Weekly Bonus</h3>
                                        <p className="text-gray-300">Extra reward for active referrers</p>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-purple-400 mb-2">10 Stars</div>
                                    <p className="text-gray-300 text-sm">When 10 friends register in a week</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="mt-6">
                        <Card className="bg-gradient-to-r from-green-400/10 via-emerald-500/10 to-green-600/10 border border-green-500/30">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-400/30 to-emerald-500/30 border border-green-500/40 text-green-300 flex items-center justify-center">
                                        <Zap className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-white mb-1">Referral Limits</h3>
                                        <p className="text-gray-300 text-sm">
                                            You can refer up to 10 friends per week. Stars are granted immediately when your friends complete registration.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="relative px-4 pb-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-serif font-bold text-white mb-4">
                            Your Referral Stats
                        </h2>
                        <p className="text-gray-300 max-w-2xl mx-auto">
                            Track your referral performance and earnings
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="bg-gradient-to-br from-blue-400/10 via-cyan-500/10 to-blue-600/10 border border-blue-500/30">
                            <CardContent className="p-6 text-center">
                                <div className="text-3xl font-bold text-blue-400 mb-2">{referralStats.totalReferrals}</div>
                                <p className="text-gray-300">Total Referrals</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-400/10 via-pink-500/10 to-purple-600/10 border border-purple-500/30">
                            <CardContent className="p-6 text-center">
                                <div className="text-3xl font-bold text-purple-400 mb-2">{referralStats.weeklyReferrals}</div>
                                <p className="text-gray-300">This Week</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-400/10 via-emerald-500/10 to-green-600/10 border border-green-500/30">
                            <CardContent className="p-6 text-center">
                                <div className="text-3xl font-bold text-green-400 mb-2">{referralStats.totalEarned}</div>
                                <p className="text-gray-300">Stars Earned</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative px-4 pb-12">
                <div className="max-w-2xl mx-auto text-center">
                    <Card className="bg-gradient-to-r from-yellow-400/10 via-amber-500/10 to-yellow-600/10 border border-yellow-500/30">
                        <CardContent className="p-8">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400/30 to-amber-500/30 border border-yellow-500/40 text-yellow-300 flex items-center justify-center mx-auto mb-4">
                                <Heart className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-serif font-bold text-white mb-4">
                                Ready to Share the Magic?
                            </h2>
                            <p className="text-gray-300 mb-6">
                                Start referring friends today and watch your stars grow. 
                                The more you share, the more you earn!
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    onClick={shareReferral}
                                    className="rounded-full bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black hover:from-yellow-300 hover:via-amber-400 hover:to-orange-400 transition-all duration-300"
                                >
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Share Now
                                </Button>
                                <Link href="/stars">
                                    <Button
                                        variant="outline"
                                        className="rounded-full border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 hover:border-yellow-400/60"
                                    >
                                        <Star className="w-4 h-4 mr-2" fill="currentColor" />
                                        View Stars
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    )
}