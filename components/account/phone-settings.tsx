"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Phone, Plus, Edit } from "lucide-react"
import { getDefaultCountry } from "./use-account-validation"
import { PhoneDialog } from "./phone-dialog"
import { PhoneOtpDialog } from "./phone-otp-dialog"
import { useTranslations } from "next-intl"

interface PhoneSettingsProps {
    locale: string
}

export function PhoneSettings({ locale }: PhoneSettingsProps) {
    const t = useTranslations("Account.phoneSettings")
    // Mock primary phone number - in real app this would come from user data
    // Set to empty string to show no phone number state
    const primaryPhoneNumber = ""

    const [showPhoneDialog, setShowPhoneDialog] = useState(false)
    const [phoneDialogValue, setPhoneDialogValue] = useState("")
    const [phoneError, setPhoneError] = useState("")
    const [isPhoneLoading, setIsPhoneLoading] = useState(false)
    const [showPhoneOtpDialog, setShowPhoneOtpDialog] = useState(false)
    const [phoneOtpValue, setPhoneOtpValue] = useState("")
    const [phoneOtpError, setPhoneOtpError] = useState("")
    const [isPhoneOtpLoading, setIsPhoneOtpLoading] = useState(false)

    const handleAddPhone = () => {
        setShowPhoneDialog(true)
        setPhoneDialogValue("")
        setPhoneError("")
    }

    return (
        <>
            <Card className='w-full bg-card/50 border-border/30 p-6 shadow-xl shadow-black/20 backdrop-blur-sm hover:border-primary/40 transition-all duration-300'>
                <div className='space-y-6'>
                    <div className='flex items-center space-x-3'>
                        <div className='p-2 rounded-lg bg-primary/20'>
                            <Phone className='w-5 h-5 text-primary' />
                        </div>
                        <h2 className='text-2xl font-bold text-white'>{t("title")}</h2>
                    </div>

                    <div className='space-y-4'>
                        {primaryPhoneNumber ? (
                            <div className='space-y-4'>
                                <div>
                                    <Label className='text-white font-medium'>
                                        {t("currentPhone")}
                                    </Label>
                                    <div className='flex items-center space-x-2 mt-1'>
                                        <Input
                                            value={primaryPhoneNumber}
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
                            onClick={handleAddPhone}
                            size='sm'
                            className='bg-accent hover:bg-accent/90 text-accent-foreground'
                        >
                            {primaryPhoneNumber ? (
                                <>
                                    <Edit className='w-4 h-4 mr-2' />
                                    {t("editPhone")}
                                </>
                            ) : (
                                <>
                                    <Plus className='w-4 h-4 mr-2' />
                                    {t("addPhone")}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>

            <PhoneDialog
                showPhoneDialog={showPhoneDialog}
                setShowPhoneDialog={setShowPhoneDialog}
                phoneDialogValue={phoneDialogValue}
                setPhoneDialogValue={setPhoneDialogValue}
                phoneError={phoneError}
                setPhoneError={setPhoneError}
                isPhoneLoading={isPhoneLoading}
                setIsPhoneLoading={setIsPhoneLoading}
                primaryPhoneNumber={primaryPhoneNumber}
                defaultCountry={getDefaultCountry(locale)}
                setShowPhoneOtpDialog={setShowPhoneOtpDialog}
            />

            <PhoneOtpDialog
                showPhoneOtpDialog={showPhoneOtpDialog}
                setShowPhoneOtpDialog={setShowPhoneOtpDialog}
                phoneOtpValue={phoneOtpValue}
                setPhoneOtpValue={setPhoneOtpValue}
                phoneOtpError={phoneOtpError}
                setPhoneOtpError={setPhoneOtpError}
                isPhoneOtpLoading={isPhoneOtpLoading}
                setIsPhoneOtpLoading={setIsPhoneOtpLoading}
                phoneDialogValue={phoneDialogValue}
                setPhoneDialogValue={setPhoneDialogValue}
            />
        </>
    )
}
