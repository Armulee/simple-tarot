import { StarsDashboard } from "@/components/stars-dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, Gift, Share2, Users, CreditCard, Play, Calendar, Zap } from 'lucide-react'
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Stars Dashboard - Asking Fate",
    description: "Manage your stars, earn rewards, and unlock more tarot readings",
}

export default function StarsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-2">
                        <Star className="w-8 h-8 text-yellow-400" />
                        Stars Dashboard
                    </h1>
                    <p className="text-lg text-purple-200 max-w-2xl mx-auto">
                        Earn stars to unlock tarot readings and discover your cosmic destiny. 
                        Complete daily activities, watch ads, and invite friends to earn more stars!
                    </p>
                </div>

                {/* How to Earn Stars Section */}
                <Card className="mb-8 bg-white/10 border-white/20 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl text-white flex items-center gap-2">
                            <Gift className="w-6 h-6 text-yellow-400" />
                            How to Earn Stars
                        </CardTitle>
                        <CardDescription className="text-purple-200">
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
                                <p className="text-sm text-purple-200 mb-2">
                                    Claim your daily stars just by visiting!
                                </p>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-200">
                                        Anonymous: 5 stars
                                    </Badge>
                                    <Badge variant="secondary" className="bg-green-500/20 text-green-200">
                                        Logged in: 10 stars
                                    </Badge>
                                </div>
                            </div>

                            {/* Watch Ads */}
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <div className="flex items-center gap-3 mb-2">
                                    <Play className="w-5 h-5 text-purple-400" />
                                    <h3 className="font-semibold text-white">Watch Ads</h3>
                                </div>
                                <p className="text-sm text-purple-200 mb-2">
                                    Watch up to 10 ads per day for 2 stars each
                                </p>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-200">
                                        Up to 20 stars/day
                                    </Badge>
                                </div>
                            </div>

                            {/* Social Sharing */}
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <div className="flex items-center gap-3 mb-2">
                                    <Share2 className="w-5 h-5 text-pink-400" />
                                    <h3 className="font-semibold text-white">Share Readings</h3>
                                </div>
                                <p className="text-sm text-purple-200 mb-2">
                                    Share your tarot readings on social media
                                </p>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-pink-500/20 text-pink-200">
                                        2 stars per share
                                    </Badge>
                                </div>
                            </div>

                            {/* Referrals */}
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <div className="flex items-center gap-3 mb-2">
                                    <Users className="w-5 h-5 text-green-400" />
                                    <h3 className="font-semibold text-white">Invite Friends</h3>
                                </div>
                                <p className="text-sm text-purple-200 mb-2">
                                    Both you and your friend get 5 stars when they sign up
                                </p>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-green-500/20 text-green-200">
                                        5 stars each
                                    </Badge>
                                </div>
                            </div>

                            {/* Tarot Reading Cost */}
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <div className="flex items-center gap-3 mb-2">
                                    <Zap className="w-5 h-5 text-yellow-400" />
                                    <h3 className="font-semibold text-white">Reading Cost</h3>
                                </div>
                                <p className="text-sm text-purple-200 mb-2">
                                    Each tarot reading costs stars
                                </p>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-200">
                                        2 stars per reading
                                    </Badge>
                                </div>
                            </div>

                            {/* Future: Purchase Stars */}
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10 opacity-60">
                                <div className="flex items-center gap-3 mb-2">
                                    <CreditCard className="w-5 h-5 text-gray-400" />
                                    <h3 className="font-semibold text-white">Purchase Stars</h3>
                                </div>
                                <p className="text-sm text-purple-200 mb-2">
                                    Coming soon! Buy stars directly
                                </p>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="border-gray-500 text-gray-400">
                                        Coming Soon
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stars Dashboard */}
                <StarsDashboard />
            </div>
        </div>
    )
}