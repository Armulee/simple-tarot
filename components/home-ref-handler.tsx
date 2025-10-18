"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Star, Users, Gift, X } from "lucide-react"
import Link from "next/link"

export default function HomeRefHandler() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [showDialog, setShowDialog] = useState(false)
    const [referralCode, setReferralCode] = useState<string | null>(null)

    useEffect(() => {
        const ref = searchParams.get("ref")
        const hasSeenReferralDialog = localStorage.getItem("referral_dialog_seen")
        
        if (ref && !hasSeenReferralDialog) {
            setReferralCode(ref)
            setShowDialog(true)
        }
    }, [searchParams])

    const handleCloseDialog = () => {
        setShowDialog(false)
        // Save that user has seen the referral dialog
        localStorage.setItem("referral_dialog_seen", "true")
        // Save the referral code for later use
        if (referralCode) {
            localStorage.setItem("referral_code", referralCode)
        }
        // Remove the ref parameter from URL
        const url = new URL(window.location.href)
        url.searchParams.delete("ref")
        router.replace(url.pathname + url.search, { scroll: false })
    }

    const handleSignIn = () => {
        const callbackUrl = encodeURIComponent(window.location.pathname)
        router.push(`/signin?callbackUrl=${callbackUrl}`)
    }

    const handleSignUp = () => {
        const callbackUrl = encodeURIComponent(window.location.pathname)
        router.push(`/signup?callbackUrl=${callbackUrl}`)
    }

    return (
        <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-400/30 to-emerald-500/30 border border-green-500/40 text-green-300 mx-auto mb-4">
                        <Gift className="w-8 h-8" />
                    </div>
                    <DialogTitle className="text-center text-2xl font-serif text-white">
                        Referral Bonus Available!
                    </DialogTitle>
                    <DialogDescription className="text-center text-gray-300">
                        You were referred by a friend! Sign in or create an account to receive bonus stars.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-green-400/10 via-emerald-500/10 to-green-600/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <Users className="w-5 h-5 text-green-400" />
                            <h3 className="font-semibold text-white">Referral Rewards</h3>
                        </div>
                        <div className="space-y-2 text-sm text-gray-300">
                            <div className="flex justify-between">
                                <span>You receive:</span>
                                <span className="text-green-400 font-semibold">5 stars</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Your referrer receives:</span>
                                <span className="text-green-400 font-semibold">5 stars</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Initial account bonus:</span>
                                <span className="text-yellow-400 font-semibold">12 stars</span>
                            </div>
                            <div className="border-t border-green-500/30 pt-2 flex justify-between font-bold">
                                <span>Total for you:</span>
                                <span className="text-yellow-400">17 stars</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <Button
                            onClick={handleSignIn}
                            className="flex-1 rounded-full bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 text-white hover:from-green-300 hover:via-emerald-400 hover:to-green-500 transition-all duration-300"
                        >
                            <Star className="w-4 h-4 mr-2" fill="currentColor" />
                            Sign In
                        </Button>
                        <Button
                            onClick={handleSignUp}
                            variant="outline"
                            className="flex-1 rounded-full border-green-500/40 text-green-300 hover:bg-green-500/10 hover:border-green-400/60"
                        >
                            Sign Up
                        </Button>
                    </div>
                    
                    <Button
                        onClick={handleCloseDialog}
                        variant="ghost"
                        className="w-full text-gray-400 hover:text-white hover:bg-white/10"
                    >
                        Continue without account
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}