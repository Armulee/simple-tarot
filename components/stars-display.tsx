"use client"

import { useStars } from "@/contexts/stars-context"
import { Star, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { toast } from "sonner"
import Link from "next/link"

interface StarsDisplayProps {
    showActions?: boolean
    className?: string
}

export function StarsDisplay({ showActions = true, className = "" }: StarsDisplayProps) {
    const { 
        stars, 
        canClaimDaily, 
        dailyAdWatches, 
        maxDailyAds, 
        canWatchAd,
        claimDailyStars,
        watchAd,
        loading 
    } = useStars()
    const [isClaiming, setIsClaiming] = useState(false)
    const [isWatching, setIsWatching] = useState(false)

    const handleClaimDaily = async () => {
        setIsClaiming(true)
        try {
            const result = await claimDailyStars()
            if (result.success) {
                toast.success(result.message)
            } else {
                toast.error(result.message)
            }
        } finally {
            setIsClaiming(false)
        }
    }

    const handleWatchAd = async () => {
        setIsWatching(true)
        try {
            const result = await watchAd()
            if (result.success) {
                toast.success(result.message)
            } else {
                toast.error(result.message)
            }
        } finally {
            setIsWatching(false)
        }
    }

    if (loading) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className="w-4 h-4 bg-yellow-400/20 rounded-full animate-pulse" />
                <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
        )
    }

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* Stars Display - Clickable */}
            <Link href="/stars" className="flex items-center gap-1 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 px-3 py-1.5 rounded-full border border-yellow-400/30 hover:from-yellow-400/30 hover:to-yellow-600/30 transition-all duration-200 cursor-pointer">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm font-semibold text-yellow-400">{stars}</span>
            </Link>

            {showActions && (
                <div className="flex items-center gap-2">
                    {/* Daily Claim Button */}
                    {canClaimDaily && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleClaimDaily}
                            disabled={isClaiming}
                            className="text-xs bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                        >
                            <Sparkles className="w-3 h-3 mr-1" />
                            {isClaiming ? "Claiming..." : "Claim Daily"}
                        </Button>
                    )}

                    {/* Ad Watch Button */}
                    {canWatchAd && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleWatchAd}
                            disabled={isWatching}
                            className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                        >
                            <Sparkles className="w-3 h-3 mr-1" />
                            {isWatching ? "Watching..." : "Watch Ad"}
                        </Button>
                    )}

                    {/* Ad Watch Progress */}
                    {dailyAdWatches > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {dailyAdWatches}/{maxDailyAds} ads
                        </Badge>
                    )}
                </div>
            )}
        </div>
    )
}