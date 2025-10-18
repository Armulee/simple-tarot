"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import ReferralBonusDialog from "@/components/referral-bonus-dialog"

interface ReferralContextType {
    showReferralDialog: boolean
    referralCode: string | null
    setShowReferralDialog: (show: boolean) => void
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined)

export function ReferralProvider({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const [showReferralDialog, setShowReferralDialog] = useState(false)
    const [referralCode, setReferralCode] = useState<string | null>(null)

    useEffect(() => {
        if (!loading && user) {
            // Check if user has a referral code in localStorage and hasn't been processed yet
            const storedReferralCode = localStorage.getItem("referral_code")
            const referralProcessed = localStorage.getItem("referral_processed")
            
            if (storedReferralCode && !referralProcessed) {
                setReferralCode(storedReferralCode)
                setShowReferralDialog(true)
            }
        }
    }, [user, loading])

    const handleCloseDialog = () => {
        setShowReferralDialog(false)
        setReferralCode(null)
    }

    return (
        <ReferralContext.Provider value={{
            showReferralDialog,
            referralCode,
            setShowReferralDialog
        }}>
            {children}
            <ReferralBonusDialog
                isOpen={showReferralDialog}
                onClose={handleCloseDialog}
                referralCode={referralCode}
            />
        </ReferralContext.Provider>
    )
}

export function useReferral() {
    const context = useContext(ReferralContext)
    if (context === undefined) {
        throw new Error("useReferral must be used within a ReferralProvider")
    }
    return context
}