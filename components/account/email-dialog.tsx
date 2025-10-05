"use client"

import { useState } from "react"
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
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { validateEmail } from "./use-account-validation"
import { Mail } from "lucide-react"

interface EmailDialogProps {
    showEmailDialog: boolean
    setShowEmailDialog: (show: boolean) => void
    emailDialogValue: string
    setEmailDialogValue: (value: string) => void
    emailError: string
    setEmailError: (error: string) => void
    setShowOtpDialog: (show: boolean) => void
}

export function EmailDialog({
    showEmailDialog,
    setShowEmailDialog,
    emailDialogValue,
    setEmailDialogValue,
    emailError,
    setEmailError,
    setShowOtpDialog,
}: EmailDialogProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleEmailDialogSubmit = async () => {
        if (!emailDialogValue) {
            setEmailError("Email is required")
            return
        }

        if (!validateEmail(emailDialogValue)) {
            setEmailError("Please enter a valid email address")
            return
        }

        setIsLoading(true)
        setEmailError("")

        try {
            // Send OTP to the new email address for verification
            const { error } = await supabase.auth.updateUser({
                email: emailDialogValue,
            })

            if (error) {
                throw error
            }

            // Close email dialog and open OTP dialog
            setShowEmailDialog(false)
            setShowOtpDialog(true)
            setEmailError("")

            toast.success("OTP sent successfully!", {
                description:
                    "Please check your new email for the verification code.",
            })
        } catch (error: unknown) {
            console.error("Failed to send OTP:", error)
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Failed to send OTP. Please try again."
            setEmailError(errorMessage)
            toast.error("Failed to send OTP", {
                description: errorMessage,
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
            <DialogContent className='sm:max-w-md bg-background/95 backdrop-blur-sm border border-border/50'>
                <DialogHeader>
                    <DialogTitle className='text-white font-semibold'>
                        Update Email Address
                    </DialogTitle>
                    <DialogDescription className='text-muted-foreground'>
                        Enter your new email address. A verification code will
                        be sent to confirm the change.
                    </DialogDescription>
                </DialogHeader>

                <div className='space-y-4 mt-4'>
                    <Label
                        htmlFor='dialogEmail'
                        className='text-white font-medium sr-only'
                    >
                        Email Address
                    </Label>
                    <Input
                        id='dialogEmail'
                        type='email'
                        value={emailDialogValue}
                        onChange={(e) => {
                            setEmailDialogValue(e.target.value)
                            setEmailError("")
                        }}
                        className='bg-background/30 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50'
                        placeholder='Enter new email address'
                        disabled={isLoading}
                    />
                    {emailError && (
                        <p className='text-sm text-red-400 mt-1'>
                            {emailError}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        onClick={handleEmailDialogSubmit}
                        disabled={isLoading || !emailDialogValue}
                        className='bg-primary hover:bg-primary/90 text-primary-foreground'
                    >
                        {isLoading ? (
                            <>
                                <div className='w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent' />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Mail className='w-4 h-4 mr-2' />
                                Send Verification Code
                            </>
                        )}
                    </Button>
                    <Button
                        variant='outline'
                        onClick={() => {
                            setShowEmailDialog(false)
                            setEmailDialogValue("")
                            setEmailError("")
                        }}
                        disabled={isLoading}
                        className='border-border/40 text-muted-foreground hover:bg-background/20'
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
