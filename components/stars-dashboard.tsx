"use client"

import { useStars } from "@/contexts/stars-context"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StarsDisplay } from "./stars-display"
import { SocialSharing } from "./social-sharing"
import { ReferralSystem } from "./referral-system"
import { Star, Share2, Play, Clock, Users, Calendar, Zap } from "lucide-react"
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

            {/* Star Gaining Details - Moved below dashboard */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white text-xl">How to Earn Stars</CardTitle>
                    <CardDescription className="text-white/70">
                        Multiple ways to earn stars and unlock unlimited tarot readings
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Daily Login */}
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <Calendar className="w-5 h-5 text-blue-400" />
                                <h3 className="font-semibold text-white">Daily Login</h3>
                            </div>
                            <p className="text-sm text-white/70 mb-2">
                                Claim your daily stars just by visiting!
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-blue-500/20 text-blue-200 px-2 py-1 rounded">
                                    Anonymous: 5 stars
                                </span>
                                <span className="text-xs bg-green-500/20 text-green-200 px-2 py-1 rounded">
                                    Logged in: 10 stars
                                </span>
                            </div>
                        </div>

                        {/* Watch Ads */}
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <Play className="w-5 h-5 text-purple-400" />
                                <h3 className="font-semibold text-white">Watch Ads</h3>
                            </div>
                            <p className="text-sm text-white/70 mb-2">
                                Watch up to 10 ads per day for 2 stars each
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-purple-500/20 text-purple-200 px-2 py-1 rounded">
                                    Up to 20 stars/day
                                </span>
                            </div>
                        </div>

                        {/* Social Sharing */}
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <Share2 className="w-5 h-5 text-pink-400" />
                                <h3 className="font-semibold text-white">Share Readings</h3>
                            </div>
                            <p className="text-sm text-white/70 mb-2">
                                Share your tarot readings on social media
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-pink-500/20 text-pink-200 px-2 py-1 rounded">
                                    2 stars per share
                                </span>
                            </div>
                        </div>

                        {/* Referrals */}
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <Users className="w-5 h-5 text-green-400" />
                                <h3 className="font-semibold text-white">Invite Friends</h3>
                            </div>
                            <p className="text-sm text-white/70 mb-2">
                                Both you and your friend get 5 stars when they sign up
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-green-500/20 text-green-200 px-2 py-1 rounded">
                                    5 stars each
                                </span>
                            </div>
                        </div>

                        {/* Tarot Reading Cost */}
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <Zap className="w-5 h-5 text-yellow-400" />
                                <h3 className="font-semibold text-white">Reading Cost</h3>
                            </div>
                            <p className="text-sm text-white/70 mb-2">
                                Each tarot reading costs stars
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-yellow-500/20 text-yellow-200 px-2 py-1 rounded">
                                    2 stars per reading
                                </span>
                            </div>
                        </div>
                    </div>
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