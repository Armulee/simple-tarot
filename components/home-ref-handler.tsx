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
import { Star, Sparkle } from "lucide-react"
import { cn } from "@/lib/utils"

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

    const handleSignUp = () => {
        const callbackUrl = encodeURIComponent(window.location.pathname)
        router.push(`/signup?callbackUrl=${callbackUrl}`)
    }

    return (
        <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
            <ReferralDialog>
                <DialogHeader>
                    <DialogTitle className='text-green-300 font-serif text-xl'>
                        Referral Bonus Available!
                    </DialogTitle>
                    <DialogDescription className='text-white/85'>
                        You were referred by a friend! Sign in or create an account to receive bonus stars.
                    </DialogDescription>
                </DialogHeader>
                
                {/* Reward Display */}
                <div className='text-center my-6'>
                    <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-400/20 to-emerald-500/20 border border-green-500/30 text-green-200 text-sm font-medium mb-4'>
                        <Star className='w-4 h-4' fill="currentColor" />
                        <span>You&apos;ll receive</span>
                    </div>
                    <div className='text-4xl font-bold text-green-400 flex items-center justify-center gap-2'>
                        <Star className='w-8 h-8' fill="currentColor" />
                        5 Stars
                    </div>
                    <p className='text-sm text-white/70 mt-2'>
                        Plus your initial account bonus
                    </p>
                </div>

                <div className='space-y-3'>
                    <button
                        onClick={handleSignUp}
                        className='w-full px-3 py-2 rounded-md bg-gradient-to-r from-green-400 to-green-600 text-white border border-green-500/40 hover:from-green-300 hover:to-green-500 shadow-[0_12px_30px_-10px_rgba(34,197,94,0.45)]'
                    >
                        Sign Up
                    </button>
                    <div className='flex justify-center'>
                        <button
                            onClick={handleCloseDialog}
                            className='px-3 py-2 text-xs text-white/70'
                        >
                            Continue without account
                        </button>
                    </div>
                </div>
            </ReferralDialog>
        </Dialog>
    )
}

export function ReferralDialog({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <DialogContent
            className={cn(
                "max-w-lg w-[92vw] border border-green-400/20 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(34,197,94,0.35)]",
                className
            )}
        >
            {/* Beautiful ping orbs */}
            <Sparkle
                className='absolute top-16 left-16 w-3 h-3 rounded-full fill-green-400 opacity-50 animate-ping'
                style={{ animationDelay: "0.5s" }}
            />
            <Sparkle
                className='absolute top-24 right-20 w-2 h-2 rounded-full fill-green-400 opacity-50 animate-ping'
                style={{ animationDelay: "1.2s" }}
            />
            <Sparkle
                className='absolute top-40 left-1/3 w-2.5 h-2.5 rounded-full fill-green-400 opacity-50 animate-ping'
                style={{ animationDelay: "2.8s" }}
            />
            <Sparkle
                className='absolute top-32 right-1/4 w-1.5 h-1.5 rounded-full fill-green-400 opacity-50 animate-ping'
                style={{ animationDelay: "3.5s" }}
            />
            <Sparkle
                className='absolute bottom-20 left-20 w-3.5 h-3.5 rounded-full fill-green-400 opacity-50 animate-ping'
                style={{ animationDelay: "1.8s" }}
            />
            <Sparkle
                className='absolute bottom-32 right-16 w-2 h-2 rounded-full fill-green-400 opacity-50 animate-ping'
                style={{ animationDelay: "4.2s" }}
            />
            <Sparkle
                className='absolute bottom-16 right-1/3 w-2.5 h-2.5 rounded-full fill-green-400 opacity-50 animate-ping'
                style={{ animationDelay: "2.1s" }}
            />
            <Sparkle
                className='absolute top-1/2 left-12 w-1.5 h-1.5 rounded-full fill-green-400 opacity-50 animate-ping'
                style={{ animationDelay: "3.8s" }}
            />
            <Sparkle
                className='absolute top-1/3 right-12 w-3 h-3 rounded-full fill-green-400 opacity-50 animate-ping'
                style={{ animationDelay: "0.9s" }}
            />
            <Sparkle
                className='absolute bottom-1/3 left-1/4 w-2 h-2 rounded-full fill-green-400 opacity-50 animate-ping'
                style={{ animationDelay: "4.7s" }}
            />

            {/* Deep-space stars background */}
            <div className='pointer-events-none absolute inset-0 opacity-40'>
                <div className='cosmic-stars-layer-3' />
                <div className='cosmic-stars-layer-4' />
                <div className='cosmic-stars-layer-5' />
            </div>
            {/* Green aura behind dialog */}
            <div className='pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-br from-green-300/25 via-green-500/15 to-transparent blur-3xl animate-pulse' />
            <div
                className='pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-gradient-to-tl from-green-400/20 via-green-600/10 to-transparent blur-[100px] animate-pulse'
                style={{ animationDelay: "0.8s" }}
            />

            {children}
        </DialogContent>
    )
}