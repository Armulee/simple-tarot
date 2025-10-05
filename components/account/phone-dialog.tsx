"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Save } from "lucide-react"
import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { validatePhone } from "./use-account-validation"

interface PhoneDialogProps {
    showPhoneDialog: boolean
    setShowPhoneDialog: (show: boolean) => void
    phoneDialogValue: string
    setPhoneDialogValue: (value: string) => void
    phoneError: string
    setPhoneError: (error: string) => void
    isPhoneLoading: boolean
    setIsPhoneLoading: (loading: boolean) => void
    primaryPhoneNumber: string
    defaultCountry: string
    setShowPhoneOtpDialog: (show: boolean) => void
}

export function PhoneDialog({
    showPhoneDialog,
    setShowPhoneDialog,
    phoneDialogValue,
    setPhoneDialogValue,
    phoneError,
    setPhoneError,
    isPhoneLoading,
    setIsPhoneLoading,
    primaryPhoneNumber,
    defaultCountry,
    setShowPhoneOtpDialog,
}: PhoneDialogProps) {
    const handlePhoneDialogSubmit = async () => {
        if (!phoneDialogValue) {
            setPhoneError("Phone number is required")
            return
        }

        if (!validatePhone(phoneDialogValue)) {
            setPhoneError("Please enter a valid phone number")
            return
        }

        setIsPhoneLoading(true)
        setPhoneError("")

        try {
            // Send OTP to the phone number for verification
            const { error } = await supabase.auth.signInWithOtp({
                phone: phoneDialogValue,
            })

            if (error) {
                throw error
            }

            // Close phone dialog and open OTP dialog
            setShowPhoneDialog(false)
            setShowPhoneOtpDialog(true)
            setPhoneError("")

            toast.success("OTP sent successfully!", {
                description:
                    "Please check your phone for the verification code.",
            })
        } catch (error: unknown) {
            console.error("Failed to send OTP:", error)
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Failed to send OTP. Please try again."
            setPhoneError(errorMessage)
            toast.error("Failed to send OTP", {
                description: errorMessage,
            })
        } finally {
            setIsPhoneLoading(false)
        }
    }

    return (
        <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
            <DialogContent className='sm:max-w-md bg-background/95 backdrop-blur-sm border border-border/50'>
                <DialogHeader>
                    <DialogTitle className='text-white font-semibold'>
                        {primaryPhoneNumber
                            ? "Edit Phone Number"
                            : "Add Phone Number"}
                    </DialogTitle>
                    <DialogDescription className='text-muted-foreground'>
                        Enter your phone number for account verification and
                        communication.
                    </DialogDescription>
                </DialogHeader>

                <div className='space-y-4 mt-4'>
                    <Label
                        htmlFor='dialogPhone'
                        className='text-white font-medium sr-only'
                    >
                        Phone Number
                    </Label>
                    <div className='phone-input-container'>
                        <PhoneInput
                            id='dialogPhone'
                            value={phoneDialogValue}
                            onChange={(value) => {
                                setPhoneDialogValue(value || "")
                                setPhoneError("")
                            }}
                            defaultCountry={
                                defaultCountry as "US" | "TH" | undefined
                            }
                            placeholder='Enter phone number'
                            disabled={isPhoneLoading}
                            international
                            countryCallingCodeEditable={false}
                            style={
                                {
                                    "--PhoneInput-color--focus":
                                        "rgb(59 130 246)",
                                    "--PhoneInputInternationalIconPhone-opacity":
                                        "0.8",
                                    "--PhoneInputInternationalIconGlobe-opacity":
                                        "0.65",
                                    "--PhoneInputCountrySelect-marginRight":
                                        "0.35em",
                                    "--PhoneInputCountrySelectArrow-opacity":
                                        "0.45",
                                    "--PhoneInputCountrySelectArrow-borderColor":
                                        "rgba(255, 255, 255, 0.3)",
                                    "--PhoneInputCountrySelectArrow-borderWidth":
                                        "1px",
                                } as React.CSSProperties
                            }
                        />
                    </div>
                    {phoneError && (
                        <p className='text-sm text-red-400 mt-1'>
                            {phoneError}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        onClick={handlePhoneDialogSubmit}
                        disabled={isPhoneLoading || !phoneDialogValue}
                        className='bg-primary hover:bg-primary/90 text-primary-foreground'
                    >
                        {isPhoneLoading ? (
                            <>
                                <div className='w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent' />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Save className='w-4 h-4 mr-2' />
                                Send Verification Code
                            </>
                        )}
                    </Button>
                    <Button
                        variant='outline'
                        onClick={() => {
                            setShowPhoneDialog(false)
                            setPhoneDialogValue("")
                            setPhoneError("")
                        }}
                        disabled={isPhoneLoading}
                        className='border-border/40 text-muted-foreground hover:bg-background/20'
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
