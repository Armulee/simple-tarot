"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Plus, Edit } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { EmailDialog } from "./email-dialog"
import { EmailOtpDialog } from "./email-otp-dialog"

export function EmailSettings() {
    const { user } = useAuth()
    const [emailData, setEmailData] = useState({
        currentEmail: user?.email || "",
    })
    const [showEmailDialog, setShowEmailDialog] = useState(false)
    const [emailDialogValue, setEmailDialogValue] = useState("")
    const [emailError, setEmailError] = useState("")
    const [showOtpDialog, setShowOtpDialog] = useState(false)
    const [otpValue, setOtpValue] = useState("")
    const [otpError, setOtpError] = useState("")
    const [isOtpLoading, setIsOtpLoading] = useState(false)

    // Update email data when user changes
    useEffect(() => {
        if (user?.email) {
            setEmailData({ currentEmail: user.email })
        }
    }, [user?.email])

    const handleAddEmail = () => {
        setShowEmailDialog(true)
        setEmailDialogValue("")
        setEmailError("")
    }

    return (
        <>
            <Card className='bg-card/50 border-border/30 p-6 shadow-xl shadow-black/20 backdrop-blur-sm hover:border-primary/40 transition-all duration-300'>
                <div className='space-y-6'>
                    <div className='flex items-center space-x-3'>
                        <div className='p-2 rounded-lg bg-primary/20'>
                            <Mail className='w-5 h-5 text-primary' />
                        </div>
                        <h2 className='text-2xl font-bold text-white'>Email</h2>
                    </div>

                    <div className='space-y-4'>
                        {emailData.currentEmail ? (
                            <div className='space-y-4'>
                                <div>
                                    <Label className='text-white font-medium'>
                                        Current Email Address
                                    </Label>
                                    <div className='flex items-center space-x-2 mt-1'>
                                        <Input
                                            value={emailData.currentEmail}
                                            disabled
                                            className='bg-background/30 border-border/50 text-white'
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className='flex justify-start pt-2'>
                        <Button
                            onClick={handleAddEmail}
                            size='sm'
                            className='bg-accent hover:bg-accent/90 text-accent-foreground'
                        >
                            {emailData.currentEmail ? (
                                <>
                                    <Edit className='w-4 h-4 mr-2' />
                                    Edit Email
                                </>
                            ) : (
                                <>
                                    <Plus className='w-4 h-4 mr-2' />
                                    Add Email
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>

            <EmailDialog
                showEmailDialog={showEmailDialog}
                setShowEmailDialog={setShowEmailDialog}
                emailDialogValue={emailDialogValue}
                setEmailDialogValue={setEmailDialogValue}
                emailError={emailError}
                setEmailError={setEmailError}
                setShowOtpDialog={setShowOtpDialog}
            />

            <EmailOtpDialog
                showOtpDialog={showOtpDialog}
                setShowOtpDialog={setShowOtpDialog}
                otpValue={otpValue}
                setOtpValue={setOtpValue}
                otpError={otpError}
                setOtpError={setOtpError}
                isOtpLoading={isOtpLoading}
                setIsOtpLoading={setIsOtpLoading}
                emailDialogValue={emailDialogValue}
                setEmailDialogValue={setEmailDialogValue}
            />
        </>
    )
}
