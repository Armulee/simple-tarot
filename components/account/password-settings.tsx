"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Key, Save, Eye, EyeOff } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface PasswordSettingsProps {
    loginMethod: {
        hasEmailPassword: boolean
        provider: string | null
    }
}

export function PasswordSettings({ loginMethod }: PasswordSettingsProps) {
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    })
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handlePasswordChange = (field: string, value: string) => {
        setPasswordData((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handlePasswordUpdate = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("Password mismatch", {
                description: "New passwords don't match!",
            })
            return
        }

        if (passwordData.newPassword.length < 6) {
            toast.error("Password too short", {
                description: "Password must be at least 6 characters long.",
            })
            return
        }

        setIsLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword,
            })

            if (error) {
                throw error
            }

            toast.success("Password updated successfully!", {
                description: "Your password has been changed.",
            })

            // Reset form
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            })
        } catch (error: unknown) {
            console.error("Failed to update password:", error)
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Failed to update password. Please try again."
            toast.error("Failed to update password", {
                description: errorMessage,
            })
        } finally {
            setIsLoading(false)
        }
    }

    // Don't render if user doesn't have email/password login
    if (!loginMethod.hasEmailPassword) {
        return null
    }

    return (
        <Card className='w-full bg-card/50 border-border/30 p-6 shadow-xl shadow-black/20 backdrop-blur-sm hover:border-primary/40 transition-all duration-300'>
            <div className='space-y-6'>
                <div className='flex items-center space-x-3'>
                    <div className='p-2 rounded-lg bg-primary/20'>
                        <Key className='w-5 h-5 text-primary' />
                    </div>
                    <div>
                        <h2 className='text-2xl font-bold text-white'>
                            Password Settings
                        </h2>
                        <p className='text-sm text-muted-foreground'>
                            Manage your email & password login method
                        </p>
                    </div>
                </div>

                <div className='space-y-4'>
                    <div>
                        <Label
                            htmlFor='newPassword'
                            className='text-white font-medium'
                        >
                            New Password
                        </Label>
                        <div className='relative mt-1'>
                            <Input
                                id='newPassword'
                                type={showNewPassword ? "text" : "password"}
                                value={passwordData.newPassword}
                                onChange={(e) =>
                                    handlePasswordChange(
                                        "newPassword",
                                        e.target.value
                                    )
                                }
                                className='bg-background/30 border-border/50 text-white placeholder-gray-400 focus:border-primary/50 pr-10'
                                placeholder='Enter new password'
                                disabled={isLoading}
                            />
                            <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                                onClick={() =>
                                    setShowNewPassword(!showNewPassword)
                                }
                                disabled={isLoading}
                            >
                                {showNewPassword ? (
                                    <EyeOff className='h-4 w-4 text-muted-foreground' />
                                ) : (
                                    <Eye className='h-4 w-4 text-muted-foreground' />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div>
                        <Label
                            htmlFor='confirmPassword'
                            className='text-white font-medium'
                        >
                            Confirm New Password
                        </Label>
                        <div className='relative mt-1'>
                            <Input
                                id='confirmPassword'
                                type={showConfirmPassword ? "text" : "password"}
                                value={passwordData.confirmPassword}
                                onChange={(e) =>
                                    handlePasswordChange(
                                        "confirmPassword",
                                        e.target.value
                                    )
                                }
                                className='bg-background/30 border-border/50 text-white placeholder-gray-400 focus:border-primary/50 pr-10'
                                placeholder='Confirm new password'
                                disabled={isLoading}
                            />
                            <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                                onClick={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                }
                                disabled={isLoading}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className='h-4 w-4 text-muted-foreground' />
                                ) : (
                                    <Eye className='h-4 w-4 text-muted-foreground' />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className='flex justify-start pt-2'>
                    <Button
                        onClick={handlePasswordUpdate}
                        disabled={
                            isLoading ||
                            !passwordData.newPassword ||
                            !passwordData.confirmPassword
                        }
                        size='sm'
                        className='bg-primary hover:bg-primary/90 text-primary-foreground'
                    >
                        {isLoading ? (
                            <>
                                <div className='w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2' />
                                Updating...
                            </>
                        ) : (
                            <>
                                <Save className='w-4 h-4 mr-2' />
                                Update Password
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Card>
    )
}
