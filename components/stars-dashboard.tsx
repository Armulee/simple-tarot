"use client"

import { useStars } from "@/contexts/stars-context"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StarsDisplay } from "./stars-display"
import { AdWatching } from "./ad-watching"
import { SocialSharing } from "./social-sharing"
import { ReferralSystem } from "./referral-system"
import { Star, TrendingUp, Gift, Share2, Play } from "lucide-react"

export function StarsDashboard() {
    const { user } = useAuth()
    const { 
        stars, 
        canClaimDaily, 
        dailyStarsClaimed, 
        dailyAdWatches, 
        maxDailyAds,
        transactions,
        loadTransactions 
    } = useStars()

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                    Stars Dashboard
                </h1>
                <p className="text-muted-foreground">
                    Manage your stars, earn rewards, and unlock more readings
                </p>
            </div>

            {/* Stars Overview */}
            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-400">
                        <Star className="w-6 h-6" />
                        Your Stars
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="text-4xl font-bold text-yellow-400">
                            {stars}
                        </div>
                        <StarsDisplay showActions={true} />
                    </div>
                    <div className="mt-4 text-sm text-yellow-300">
                        {canClaimDaily ? (
                            <span>✨ You can claim your daily stars!</span>
                        ) : (
                            <span>Daily stars claimed: {dailyStarsClaimed}</span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            <div>
                                <div className="text-2xl font-bold text-green-400">{dailyStarsClaimed}</div>
                                <div className="text-sm text-green-300">Daily Stars</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Play className="w-5 h-5 text-blue-400" />
                            <div>
                                <div className="text-2xl font-bold text-blue-400">{dailyAdWatches}</div>
                                <div className="text-sm text-blue-300">Ads Watched</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Gift className="w-5 h-5 text-purple-400" />
                            <div>
                                <div className="text-2xl font-bold text-purple-400">{maxDailyAds - dailyAdWatches}</div>
                                <div className="text-sm text-purple-300">Ads Remaining</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="earn" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="earn" className="flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Earn
                    </TabsTrigger>
                    <TabsTrigger value="ads" className="flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Ads
                    </TabsTrigger>
                    <TabsTrigger value="share" className="flex items-center gap-2">
                        <Share2 className="w-4 h-4" />
                        Share
                    </TabsTrigger>
                    <TabsTrigger value="referral" className="flex items-center gap-2">
                        <Gift className="w-4 h-4" />
                        Referral
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="earn" className="space-y-4">
                    <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                        <CardHeader>
                            <CardTitle className="text-green-400">Ways to Earn Stars</CardTitle>
                            <CardDescription>
                                Here are all the ways you can earn stars in our app
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4">
                                <div className="flex items-center justify-between p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                            <Star className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-green-400">Daily Login</div>
                                            <div className="text-sm text-green-300">
                                                {user ? "10 stars" : "5 stars"} per day
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-green-400 font-bold">
                                        {user ? "+10" : "+5"}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                            <Play className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-blue-400">Watch Ads</div>
                                            <div className="text-sm text-blue-300">2 stars per ad (max 10/day)</div>
                                        </div>
                                    </div>
                                    <div className="text-blue-400 font-bold">+2</div>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                            <Share2 className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-purple-400">Social Sharing</div>
                                            <div className="text-sm text-purple-300">2 stars per share</div>
                                        </div>
                                    </div>
                                    <div className="text-purple-400 font-bold">+2</div>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-pink-500/5 rounded-lg border border-pink-500/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                                            <Gift className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-pink-400">Referral Program</div>
                                            <div className="text-sm text-pink-300">5 stars for you and your friend</div>
                                        </div>
                                    </div>
                                    <div className="text-pink-400 font-bold">+5</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="ads">
                    <AdWatching />
                </TabsContent>

                <TabsContent value="share">
                    <SocialSharing />
                </TabsContent>

                <TabsContent value="referral">
                    <ReferralSystem />
                </TabsContent>
            </Tabs>
        </div>
    )
}