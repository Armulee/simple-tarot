"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Check } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface PhoneOtpDialogProps {
    showPhoneOtpDialog: boolean
    setShowPhoneOtpDialog: (show: boolean) => void
    phoneOtpValue: string
    setPhoneOtpValue: (value: string) => void
    phoneOtpError: string
    setPhoneOtpError: (error: string) => void
    isPhoneOtpLoading: boolean
    setIsPhoneOtpLoading: (loading: boolean) => void
    phoneDialogValue: string
    setPhoneDialogValue: (value: string) => void
}

export function PhoneOtpDialog({
    showPhoneOtpDialog,
    setShowPhoneOtpDialog,
    phoneOtpValue,
    setPhoneOtpValue,
    phoneOtpError,
    setPhoneOtpError,
    isPhoneOtpLoading,
    setIsPhoneOtpLoading,
    phoneDialogValue,
    setPhoneDialogValue,
}: PhoneOtpDialogProps) {
    const handlePhoneOtpSubmit = async () => {
        if (!phoneOtpValue) {
            setPhoneOtpError("OTP is required")
            return
        }

        if (phoneOtpValue.length !== 6) {
            setPhoneOtpError("OTP must be 6 digits")
            return
        }

        setIsPhoneOtpLoading(true)
        setPhoneOtpError("")

        try {
            // Verify OTP and update phone
            const { error } = await supabase.auth.verifyOtp({
                type: "sms",
                phone: phoneDialogValue,
                token: phoneOtpValue,
            })

            if (error) {
                throw error
            }

            // Update user profile with phone number
            const { error: updateError } = await supabase.auth.updateUser({
                data: { phone: phoneDialogValue },
            })

            if (updateError) {
                throw updateError
            }

            // Show success toast
            toast.success("Phone number verified and updated successfully!", {
                description: "Your phone number has been verified and updated.",
            })

            // Close OTP dialog and reset form
            setShowPhoneOtpDialog(false)
            setPhoneOtpValue("")
            setPhoneOtpError("")
            setPhoneDialogValue("")

            // User data will be updated automatically via onAuthStateChange listener
        } catch (error: unknown) {
            console.error("Failed to verify phone OTP:", error)
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Invalid OTP. Please try again."
            setPhoneOtpError(errorMessage)
            toast.error("Failed to verify OTP", {
                description: errorMessage,
            })
        } finally {
            setIsPhoneOtpLoading(false)
        }
    }

    return (
        <Dialog open={showPhoneOtpDialog} onOpenChange={setShowPhoneOtpDialog}>
            <DialogContent className='sm:max-w-md bg-background/95 backdrop-blur-sm border border-border/50'>
                <DialogHeader>
                    <DialogTitle className='text-white font-semibold'>
                        Verify Phone Number
                    </DialogTitle>
                    <DialogDescription className='text-muted-foreground'>
                        Enter the 6-digit verification code sent to{" "}
                        <span className='text-primary font-medium'>
                            {phoneDialogValue}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className='space-y-4 mt-4'>
                    <Label
                        htmlFor='dialogPhoneOtp'
                        className='text-white font-medium sr-only'
                    >
                        Verification Code
                    </Label>
                    <Input
                        id='dialogPhoneOtp'
                        type='text'
                        value={phoneOtpValue}
                        onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "")
                            if (value.length <= 6) {
                                setPhoneOtpValue(value)
                                setPhoneOtpError("")
                            }
                        }}
                        className='bg-background/30 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 text-center text-lg tracking-widest'
                        placeholder='000000'
                        maxLength={6}
                        disabled={isPhoneOtpLoading}
                    />
                    {phoneOtpError && (
                        <p className='text-sm text-red-400 mt-1'>
                            {phoneOtpError}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        onClick={handlePhoneOtpSubmit}
                        disabled={
                            isPhoneOtpLoading || phoneOtpValue.length !== 6
                        }
                        className='bg-primary hover:bg-primary/90 text-primary-foreground'
                    >
                        {isPhoneOtpLoading ? (
                            <>
                                <div className='w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent' />
                                Verifying...
                            </>
                        ) : (
                            <>
                                <Check className='w-4 h-4 mr-2' />
                                Verify Phone
                            </>
                        )}
                    </Button>
                    <Button
                        variant='outline'
                        onClick={() => {
                            setShowPhoneOtpDialog(false)
                            setPhoneOtpValue("")
                            setPhoneOtpError("")
                            setPhoneDialogValue("")
                        }}
                        disabled={isPhoneOtpLoading}
                        className='border-border/40 text-muted-foreground hover:bg-background/20'
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
