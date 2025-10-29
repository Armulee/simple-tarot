"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Star, Gift, Check } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useStars } from "@/contexts/stars-context"

interface ReferralBonusDialogProps {
    isOpen: boolean
    onClose: () => void
    referralCode: string | null
}

export default function ReferralBonusDialog({
    isOpen,
    onClose,
    referralCode,
}: ReferralBonusDialogProps) {
    const { user } = useAuth()
    const { addStars, stars } = useStars()
    const [isProcessing, setIsProcessing] = useState(false)
    const [success, setSuccess] = useState(false)
    const [currentStars, setCurrentStars] = useState(0)

    const processReferralBonus = useCallback(async () => {
        if (!referralCode || !user) return

        setIsProcessing(true)
        setCurrentStars(stars || 0)

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

                    // Mark referral as processed and clear referral code
                    localStorage.setItem("referral_processed", "true")
                    localStorage.removeItem("referral_code")
                }
            }
        } catch (error) {
            console.error("Error processing referral bonus:", error)
        } finally {
            setIsProcessing(false)
        }
    }, [referralCode, user, addStars, stars])

    // Auto-process referral bonus when dialog opens
    useEffect(() => {
        if (isOpen && referralCode && user && !success && !isProcessing) {
            processReferralBonus()
        }
    }, [
        isOpen,
        referralCode,
        user,
        success,
        isProcessing,
        processReferralBonus,
    ])

    const handleClose = () => {
        if (success) {
            // Mark referral as processed and clear referral code
            localStorage.setItem("referral_processed", "true")
            localStorage.removeItem("referral_code")
        }
        onClose()
    }

    if (success) {
        return (
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <div className='flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-400/30 to-emerald-500/30 border border-green-500/40 text-green-300 mx-auto mb-4'>
                            <Check className='w-8 h-8' />
                        </div>
                        <DialogTitle className='text-center text-2xl font-serif text-white'>
                            Referral Bonus Granted!
                        </DialogTitle>
                        <DialogDescription className='text-center text-gray-300'>
                            You and your referrer have each received 5 stars!
                        </DialogDescription>
                    </DialogHeader>
                    <div className='space-y-4'>
                        <div className='text-center'>
                            <div className='text-3xl font-bold text-green-400 flex items-center justify-center gap-2'>
                                <Star className='w-8 h-8' fill='currentColor' />
                                {currentStars} + 5
                            </div>
                            <p className='text-sm text-gray-400 mt-2'>
                                Your new star balance
                            </p>
                        </div>
                        <Button
                            onClick={handleClose}
                            className='w-full rounded-full bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 text-white hover:from-green-300 hover:via-emerald-400 hover:to-green-500 transition-all duration-300'
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
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <div className='flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400/30 to-amber-500/30 border border-yellow-500/40 text-yellow-300 mx-auto mb-4'>
                        <Gift className='w-8 h-8' />
                    </div>
                    <DialogTitle className='text-center text-2xl font-serif text-white'>
                        Processing Referral Bonus...
                    </DialogTitle>
                    <DialogDescription className='text-center text-gray-300'>
                        Please wait while we process your referral bonus.
                    </DialogDescription>
                </DialogHeader>
                <div className='space-y-6'>
                    <div className='text-center'>
                        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-4'></div>
                        <p className='text-gray-300'>
                            Adding 5 stars to your account...
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
