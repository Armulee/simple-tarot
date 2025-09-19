"use client"

import { useStars } from "@/contexts/stars-context"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StarsDisplay } from "./stars-display"
import { SocialSharing } from "./social-sharing"
import { ReferralSystem } from "./referral-system"
import { Star, Share2, Play, Clock, Users, Calendar, Zap, ChevronDown, CreditCard } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"

export function StarsDashboard() {
    const { user } = useAuth()
    const { 
        stars, 
        canClaimDaily, 
        dailyAdWatches, 
        maxDailyAds,
        claimDailyStars,
        watchAd
    } = useStars()
    
    const [timeUntilNextClaim, setTimeUntilNextClaim] = useState("")
    const [isWatchingAd, setIsWatchingAd] = useState(false)
    const [activeAccordion, setActiveAccordion] = useState<string | null>(null)

    // Auto-claim daily stars when below 5 for logged-in users
    useEffect(() => {
        if (user && stars < 5 && canClaimDaily) {
            claimDailyStars().then((result) => {
                if (result.success) {
                    toast.success("Auto-claimed daily stars!")
                }
            })
        }
    }, [user, stars, canClaimDaily, claimDailyStars])

    // Calculate time until next claim
    useEffect(() => {
        const updateTime = () => {
            const now = new Date()
            const tomorrow = new Date(now)
            tomorrow.setDate(tomorrow.getDate() + 1)
            tomorrow.setHours(0, 0, 0, 0)
            
            const diff = tomorrow.getTime() - now.getTime()
            const hours = Math.floor(diff / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)
            
            setTimeUntilNextClaim(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
        }
        
        updateTime()
        const interval = setInterval(updateTime, 1000)
        return () => clearInterval(interval)
    }, [])

    const handleWatchAd = async () => {
        setIsWatchingAd(true)
        try {
            const result = await watchAd()
            if (result.success) {
                toast.success(result.message)
            } else {
                toast.error(result.message)
            }
        } finally {
            setIsWatchingAd(false)
        }
    }

    const canWatchAd = dailyAdWatches < maxDailyAds
    const showAdButton = stars < 2 && canWatchAd

    const toggleAccordion = (id: string) => {
        setActiveAccordion(activeAccordion === id ? null : id)
    }

    const handlePurchaseStars = () => {
        toast.info("Star purchasing feature coming soon! Stay tuned for updates.")
    }

    const earnStarsMethods = [
        {
            id: "daily-login",
            icon: Calendar,
            title: "Daily Login",
            description: "Claim your daily stars just by visiting!",
            rewards: [
                { type: "Anonymous", amount: "5 stars", color: "bg-blue-500/20 text-blue-200" },
                { type: "Logged in", amount: "10 stars", color: "bg-green-500/20 text-green-200" }
            ],
            details: "Simply visit the app daily to claim your free stars. Logged-in users get double the rewards!"
        },
        {
            id: "watch-ads",
            icon: Play,
            title: "Watch Ads",
            description: "Watch up to 10 ads per day for 2 stars each",
            rewards: [
                { type: "Per ad", amount: "2 stars", color: "bg-purple-500/20 text-purple-200" },
                { type: "Daily max", amount: "20 stars", color: "bg-purple-500/20 text-purple-200" }
            ],
            details: "Watch short video ads to earn stars. You can watch up to 10 ads per day, earning 2 stars per ad for a maximum of 20 stars daily."
        },
        {
            id: "social-sharing",
            icon: Share2,
            title: "Share Readings",
            description: "Share your tarot readings on social media",
            rewards: [
                { type: "Per share", amount: "2 stars", color: "bg-pink-500/20 text-pink-200" }
            ],
            details: "Share your tarot reading results on social media platforms like Facebook, Twitter, or Instagram to earn 2 stars per share."
        },
        {
            id: "referrals",
            icon: Users,
            title: "Invite Friends",
            description: "Both you and your friend get 5 stars when they sign up",
            rewards: [
                { type: "Both users", amount: "5 stars each", color: "bg-green-500/20 text-green-200" }
            ],
            details: "Invite friends to join the app using your referral code. When they sign up, both you and your friend will receive 5 stars as a welcome bonus."
        },
        {
            id: "reading-cost",
            icon: Zap,
            title: "Reading Cost",
            description: "Each tarot reading costs stars",
            rewards: [
                { type: "Per reading", amount: "2 stars", color: "bg-yellow-500/20 text-yellow-200" }
            ],
            details: "Each tarot reading costs 2 stars. This is a small investment to unlock the wisdom of the cards and receive personalized guidance."
        },
        {
            id: "purchase-stars",
            icon: CreditCard,
            title: "Purchase Stars",
            description: "Buy stars directly with real money",
            rewards: [
                { type: "Coming Soon", amount: "Various packages", color: "bg-gray-500/20 text-gray-200" }
            ],
            details: "Purchase stars directly using real money for instant access to unlimited tarot readings. Various packages will be available to suit different needs and budgets. This feature is coming soon!"
        }
    ]

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-white">
                    Stars Dashboard
                </h1>
                <p className="text-lg text-white/70">
                    Manage your stars and unlock more tarot readings
                </p>
            </div>

            {/* Stars Overview */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white text-xl">
                        <Star className="w-6 h-6 text-yellow-400" />
                        Your Stars
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="text-5xl font-bold text-yellow-400">
                            {stars}
                        </div>
                        <StarsDisplay showActions={false} />
                    </div>
                    
                    {/* Time until next claim */}
                    {user && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
                            <Clock className="w-4 h-4" />
                            <span>Next daily claim in: {timeUntilNextClaim}</span>
                        </div>
                    )}

                    {/* Purchase Stars Button */}
                    <div className="mt-6 flex justify-center">
                        <Button
                            onClick={handlePurchaseStars}
                            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold px-6 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Purchase Stars
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Ad Watch Button - Only show when stars < 2 */}
            {showAdButton && (
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Play className="w-6 h-6 text-blue-400" />
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Watch Ad for Stars</h3>
                                    <p className="text-sm text-white/70">
                                        Watch an ad to earn 2 stars ({dailyAdWatches}/{maxDailyAds} watched today)
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={handleWatchAd}
                                disabled={isWatchingAd || !canWatchAd}
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                            >
                                {isWatchingAd ? "Watching..." : `Watch Ad (${dailyAdWatches}/${maxDailyAds})`}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Star Gaining Details - Accordion */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white text-xl">How to Earn Stars</CardTitle>
                    <CardDescription className="text-white/70">
                        Multiple ways to earn stars and unlock unlimited tarot readings
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {earnStarsMethods.map((method) => {
                        const Icon = method.icon
                        const isActive = activeAccordion === method.id
                        
                        return (
                            <div key={method.id} className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                                <button
                                    onClick={() => toggleAccordion(method.id)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-5 h-5 text-blue-400" />
                                        <div className="text-left">
                                            <h3 className="font-semibold text-white">{method.title}</h3>
                                            <p className="text-sm text-white/70">{method.description}</p>
                                        </div>
                                    </div>
                                    <ChevronDown 
                                        className={`w-5 h-5 text-white/70 transition-transform duration-200 ${
                                            isActive ? 'rotate-180' : ''
                                        }`} 
                                    />
                                </button>
                                
                                {isActive && (
                                    <div className="px-4 pb-4 border-t border-white/10">
                                        <div className="pt-4 space-y-4">
                                            {/* Rewards */}
                                            <div className="flex flex-wrap gap-2">
                                                {method.rewards.map((reward, index) => (
                                                    <span 
                                                        key={index}
                                                        className={`text-xs px-2 py-1 rounded ${reward.color}`}
                                                    >
                                                        {reward.type}: {reward.amount}
                                                    </span>
                                                ))}
                                            </div>
                                            
                                            {/* Details */}
                                            <p className="text-sm text-white/70 leading-relaxed">
                                                {method.details}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </CardContent>
            </Card>

            {/* Action Sections */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Social Sharing */}
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-pink-400" />
                            Share & Earn
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SocialSharing />
                    </CardContent>
                </Card>

                {/* Referral System */}
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-green-400" />
                            Invite Friends
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ReferralSystem />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}