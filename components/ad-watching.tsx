"use client"

import { useStars } from "@/contexts/stars-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Play, Star, Clock, Zap } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function AdWatching() {
    const { 
        dailyAdWatches, 
        maxDailyAds, 
        canWatchAd, 
        watchAd 
    } = useStars()
    const [isWatching, setIsWatching] = useState(false)
    const [watchProgress, setWatchProgress] = useState(0)
    const [isAdPlaying, setIsAdPlaying] = useState(false)

    const handleWatchAd = async () => {
        if (!canWatchAd) {
            toast.error("Daily ad limit reached")
            return
        }

        setIsWatching(true)
        setIsAdPlaying(true)
        setWatchProgress(0)

        // Simulate ad watching progress
        const progressInterval = setInterval(() => {
            setWatchProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressInterval)
                    return 100
                }
                return prev + 10
            })
        }, 200)

        // Complete ad after 2 seconds
        setTimeout(async () => {
            clearInterval(progressInterval)
            setWatchProgress(100)
            
            try {
                const result = await watchAd()
                if (result.success) {
                    toast.success(result.message)
                } else {
                    toast.error(result.message)
                }
            } finally {
                setIsWatching(false)
                setIsAdPlaying(false)
                setWatchProgress(0)
            }
        }, 2000)
    }

    const adsRemaining = maxDailyAds - dailyAdWatches
    const progressPercentage = (dailyAdWatches / maxDailyAds) * 100

    return (
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-400">
                    <Play className="w-5 h-5" />
                    Watch Ads for Stars
                </CardTitle>
                <CardDescription>
                    Watch short ads to earn 2 stars each. You can watch up to 10 ads per day.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-blue-300">Daily Progress</span>
                        <span className="text-blue-400 font-semibold">
                            {dailyAdWatches}/{maxDailyAds} ads
                        </span>
                    </div>
                    <Progress 
                        value={progressPercentage} 
                        className="h-2 bg-blue-500/20"
                    />
                    <div className="text-xs text-blue-300">
                        {adsRemaining} ads remaining today
                    </div>
                </div>

                {/* Ad Simulation */}
                {isAdPlaying && (
                    <div className="bg-black/50 rounded-lg p-4 border border-blue-500/30">
                        <div className="flex items-center justify-center mb-2">
                            <div className="w-16 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded flex items-center justify-center">
                                <Play className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="text-center text-sm text-blue-300 mb-2">
                            Ad Playing...
                        </div>
                        <Progress value={watchProgress} className="h-1" />
                    </div>
                )}

                {/* Watch Button */}
                <Button
                    onClick={handleWatchAd}
                    disabled={!canWatchAd || isWatching}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                    {isWatching ? (
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 animate-spin" />
                            Watching Ad...
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Watch Ad (+2 Stars)
                        </div>
                    )}
                </Button>

                {/* Benefits */}
                <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/20">
                    <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-blue-300">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span>Earn 2 stars per ad watched</span>
                        </div>
                        <div className="flex items-center gap-2 text-blue-300">
                            <Clock className="w-4 h-4 text-blue-400" />
                            <span>Up to 10 ads per day (20 stars max)</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}