"use client"

import { useStars } from "@/contexts/stars-context"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, Users, Gift, Star } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function ReferralSystem() {
    const { user } = useAuth()
    const { getReferralCode, applyReferralCode } = useStars()
    const [referralCode, setReferralCode] = useState<string>("")
    const [inputCode, setInputCode] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isUsingCode, setIsUsingCode] = useState(false)

    const handleGetReferralCode = async () => {
        if (!user) {
            toast.error("Please log in to get a referral code")
            return
        }

        setIsLoading(true)
        try {
            const result = await getReferralCode()
            if (result.success && result.code) {
                setReferralCode(result.code)
                toast.success("Referral code generated!")
            } else {
                toast.error(result.message)
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleUseReferralCode = async () => {
        if (!inputCode.trim()) {
            toast.error("Please enter a referral code")
            return
        }

        setIsUsingCode(true)
        try {
            const result = await applyReferralCode(inputCode.trim())
            if (result.success) {
                toast.success(result.message)
                setInputCode("")
            } else {
                toast.error(result.message)
            }
        } finally {
            setIsUsingCode(false)
        }
    }

    const copyReferralCode = () => {
        if (referralCode) {
            navigator.clipboard.writeText(`${window.location.origin}?ref=${referralCode}`)
            toast.success("Referral link copied to clipboard!")
        }
    }

    return (
        <div className="space-y-6">
            {/* Your Referral Code */}
            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-400">
                        <Users className="w-5 h-5" />
                        Your Referral Code
                    </CardTitle>
                    <CardDescription>
                        Share your code with friends and both of you will earn 5 stars when they use it!
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {referralCode ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Input
                                    value={`${window.location.origin}?ref=${referralCode}`}
                                    readOnly
                                    className="font-mono text-sm"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={copyReferralCode}
                                    className="border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="text-center">
                                <Badge variant="secondary" className="text-lg px-4 py-2">
                                    {referralCode}
                                </Badge>
                            </div>
                        </div>
                    ) : (
                        <Button
                            onClick={handleGetReferralCode}
                            disabled={isLoading || !user}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                            {isLoading ? "Generating..." : "Get My Referral Code"}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Use Referral Code */}
            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-400">
                        <Gift className="w-5 h-5" />
                        Use Referral Code
                    </CardTitle>
                    <CardDescription>
                        Enter a friend&apos;s referral code to earn 5 stars (and they&apos;ll get 5 too)!
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="referral-code">Referral Code</Label>
                        <div className="flex gap-2">
                            <Input
                                id="referral-code"
                                placeholder="Enter referral code"
                                value={inputCode}
                                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                className="font-mono"
                                maxLength={8}
                            />
                            <Button
                                onClick={handleUseReferralCode}
                                disabled={isUsingCode || !inputCode.trim() || !user}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                            >
                                {isUsingCode ? "Using..." : "Use Code"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Referral Benefits */}
            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-400">
                        <Star className="w-5 h-5" />
                        Referral Benefits
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                            <span>Both you and your friend get 5 stars when they use your code</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                            <span>No limit on how many friends you can refer</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                            <span>Each person can only use one referral code</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}