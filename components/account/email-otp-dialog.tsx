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

interface EmailOtpDialogProps {
    showOtpDialog: boolean
    setShowOtpDialog: (show: boolean) => void
    otpValue: string
    setOtpValue: (value: string) => void
    otpError: string
    setOtpError: (error: string) => void
    isOtpLoading: boolean
    setIsOtpLoading: (loading: boolean) => void
    emailDialogValue: string
    setEmailDialogValue: (value: string) => void
}

export function EmailOtpDialog({
    showOtpDialog,
    setShowOtpDialog,
    otpValue,
    setOtpValue,
    otpError,
    setOtpError,
    isOtpLoading,
    setIsOtpLoading,
    emailDialogValue,
    setEmailDialogValue,
}: EmailOtpDialogProps) {
    const handleOtpSubmit = async () => {
        if (!otpValue) {
            setOtpError("OTP is required")
            return
        }

        if (otpValue.length !== 6) {
            setOtpError("OTP must be 6 digits")
            return
        }

        setIsOtpLoading(true)
        setOtpError("")

        try {
            // Verify OTP and update email
            const { error } = await supabase.auth.verifyOtp({
                type: "email_change",
                email: emailDialogValue,
                token: otpValue,
            })

            if (error) {
                throw error
            }

            // Show success toast
            toast.success("Email updated successfully!", {
                description: "Your email has been verified and updated.",
            })

            // Close OTP dialog and reset form
            setShowOtpDialog(false)
            setOtpValue("")
            setOtpError("")
            setEmailDialogValue("")

            // User data will be updated automatically via onAuthStateChange listener
        } catch (error: unknown) {
            console.error("Failed to verify OTP:", error)
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Invalid OTP. Please try again."
            setOtpError(errorMessage)
            toast.error("Failed to verify OTP", {
                description: errorMessage,
            })
        } finally {
            setIsOtpLoading(false)
        }
    }

    return (
        <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
            <DialogContent className='sm:max-w-md bg-background/95 backdrop-blur-sm border border-border/50'>
                <DialogHeader>
                    <DialogTitle className='text-white font-semibold'>
                        Verify Email Change
                    </DialogTitle>
                    <DialogDescription className='text-muted-foreground'>
                        Enter the 6-digit verification code sent to{" "}
                        <span className='text-primary font-medium'>
                            {emailDialogValue}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className='space-y-4 mt-4'>
                    <Label
                        htmlFor='dialogOtp'
                        className='text-white font-medium sr-only'
                    >
                        Verification Code
                    </Label>
                    <Input
                        id='dialogOtp'
                        type='text'
                        value={otpValue}
                        onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "")
                            if (value.length <= 6) {
                                setOtpValue(value)
                                setOtpError("")
                            }
                        }}
                        className='bg-background/30 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 text-center text-lg tracking-widest'
                        placeholder='000000'
                        maxLength={6}
                        disabled={isOtpLoading}
                    />
                    {otpError && (
                        <p className='text-sm text-red-400 mt-1'>{otpError}</p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        onClick={handleOtpSubmit}
                        disabled={isOtpLoading || otpValue.length !== 6}
                        className='bg-primary hover:bg-primary/90 text-primary-foreground'
                    >
                        {isOtpLoading ? (
                            <>
                                <div className='w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent' />
                                Verifying...
                            </>
                        ) : (
                            <>
                                <Check className='w-4 h-4 mr-2' />
                                Verify Email
                            </>
                        )}
                    </Button>
                    <Button
                        variant='outline'
                        onClick={() => {
                            setShowOtpDialog(false)
                            setOtpValue("")
                            setOtpError("")
                            setEmailDialogValue("")
                        }}
                        disabled={isOtpLoading}
                        className='border-border/40 text-muted-foreground hover:bg-background/20'
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
