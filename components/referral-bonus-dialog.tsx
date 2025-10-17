"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Star, Gift, Users, Check } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useStars } from "@/contexts/stars-context"

interface ReferralBonusDialogProps {
    isOpen: boolean
    onClose: () => void
    referralCode: string | null
}

export default function ReferralBonusDialog({ isOpen, onClose, referralCode }: ReferralBonusDialogProps) {
    const { user } = useAuth()
    const { addStars } = useStars()
    const [isProcessing, setIsProcessing] = useState(false)
    const [success, setSuccess] = useState(false)

    const processReferralBonus = async () => {
        if (!referralCode || !user) return

        setIsProcessing(true)
        try {
            const response = await fetch("/api/referral/process", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    referralCode,
                    userId: user.id,
                }),
            })

            if (response.ok) {
                const result = await response.json()
                if (result.success) {
                    // Add 5 stars to current user
                    addStars(5)
                    setSuccess(true)
                    
                    // Clear referral code from localStorage
                    localStorage.removeItem("referral_code")
                }
            }
        } catch (error) {
            console.error("Error processing referral bonus:", error)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleClose = () => {
        if (success) {
            // Clear referral code from localStorage
            localStorage.removeItem("referral_code")
        }
        onClose()
    }

    if (success) {
        return (
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-400/30 to-emerald-500/30 border border-green-500/40 text-green-300 mx-auto mb-4">
                            <Check className="w-8 h-8" />
                        </div>
                        <DialogTitle className="text-center text-2xl font-serif text-white">
                            Referral Bonus Granted!
                        </DialogTitle>
                        <DialogDescription className="text-center text-gray-300">
                            You and your referrer have each received 5 stars! 
                            Your account has been initialized with 17 stars total.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-400 flex items-center justify-center gap-2">
                                <Star className="w-8 h-8" fill="currentColor" />
                                +5 Stars
                            </div>
                            <p className="text-sm text-gray-400 mt-2">
                                Added to your account
                            </p>
                        </div>
                        <Button
                            onClick={handleClose}
                            className="w-full rounded-full bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 text-white hover:from-green-300 hover:via-emerald-400 hover:to-green-500 transition-all duration-300"
                        >
                            Continue
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400/30 to-amber-500/30 border border-yellow-500/40 text-yellow-300 mx-auto mb-4">
                        <Gift className="w-8 h-8" />
                    </div>
                    <DialogTitle className="text-center text-2xl font-serif text-white">
                        Referral Bonus Available!
                    </DialogTitle>
                    <DialogDescription className="text-center text-gray-300">
                        You were referred by a friend! Complete your account creation to receive bonus stars.
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
                            onClick={processReferralBonus}
                            disabled={isProcessing}
                            className="flex-1 rounded-full bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 text-white hover:from-green-300 hover:via-emerald-400 hover:to-green-500 transition-all duration-300"
                        >
                            {isProcessing ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <Star className="w-4 h-4 mr-2" fill="currentColor" />
                                    Claim Bonus
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={handleClose}
                            variant="outline"
                            className="rounded-full border-gray-500/40 text-gray-300 hover:bg-gray-500/10 hover:border-gray-400/60"
                        >
                            Skip
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}