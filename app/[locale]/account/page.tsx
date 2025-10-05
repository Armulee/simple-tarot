"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Mail,
    Key,
    Smartphone,
    Trash2,
    Save,
    Eye,
    EyeOff,
    AlertTriangle,
    Settings,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export default function AccountPage() {
    const { user } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const [emailData, setEmailData] = useState({
        currentEmail: user?.email || "",
        newEmail: "",
        password: "",
    })

    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    })

    const [accountPreferences, setAccountPreferences] = useState({
        emailNotifications: true,
        marketingEmails: false,
        readingReminders: true,
        twoFactorAuth: false,
    })

    const handleEmailChange = (field: string, value: string) => {
        setEmailData((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handlePasswordChange = (field: string, value: string) => {
        setPasswordData((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handlePreferenceChange = (field: string, value: boolean) => {
        setAccountPreferences((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleEmailUpdate = async () => {
        setIsLoading(true)
        try {
            // TODO: Implement email update API call
            console.log("Updating email:", emailData)
            await new Promise((resolve) => setTimeout(resolve, 1000))
            alert("Email updated successfully!")
            setEmailData((prev) => ({ ...prev, newEmail: "", password: "" }))
        } catch (error) {
            console.error("Failed to update email:", error)
            alert("Failed to update email. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const handlePasswordUpdate = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert("New passwords don't match!")
            return
        }

        setIsLoading(true)
        try {
            // TODO: Implement password update API call
            console.log("Updating password:", passwordData)
            await new Promise((resolve) => setTimeout(resolve, 1000))
            alert("Password updated successfully!")
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            })
        } catch (error) {
            console.error("Failed to update password:", error)
            alert("Failed to update password. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteAccount = async () => {
        setIsLoading(true)
        try {
            // TODO: Implement account deletion API call
            console.log("Deleting account...")
            await new Promise((resolve) => setTimeout(resolve, 2000))
            alert("Account deleted successfully!")
            // Redirect to home page
            window.location.href = "/"
        } catch (error) {
            console.error("Failed to delete account:", error)
            alert("Failed to delete account. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const getLoginMethod = () => {
        if (user?.app_metadata?.provider === "google") {
            return { provider: "Google", icon: "🔗", connected: true }
        }
        return { provider: "Email", icon: "📧", connected: true }
    }

    const loginMethod = getLoginMethod()

    return (
        <div className='min-h-screen p-6 relative overflow-hidden'>
            <div className='max-w-4xl mx-auto space-y-8 pt-10 relative z-10'>
                {/* Header */}
                <div className='text-center space-y-4'>
                    <h1 className='text-4xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                        Account Settings
                    </h1>
                    <p className='text-gray-300 text-lg max-w-2xl mx-auto'>
                        Manage your account security, email, and preferences
                    </p>
                </div>

                <div className='space-y-8'>
                    {/* Email Settings */}
                    <Card className='bg-card/50 border-border/30 p-8 shadow-xl shadow-black/20 backdrop-blur-sm'>
                        <div className='space-y-6'>
                            <div className='flex items-center space-x-2 mb-6'>
                                <Mail className='w-6 h-6 text-primary' />
                                <h2 className='text-2xl font-bold text-white'>
                                    Email Settings
                                </h2>
                            </div>

                            <div className='space-y-4'>
                                <div>
                                    <Label className='text-white font-medium'>
                                        Current Email
                                    </Label>
                                    <div className='flex items-center space-x-2 mt-1'>
                                        <Input
                                            value={emailData.currentEmail}
                                            disabled
                                            className='bg-background/30 border-border/30 text-muted-foreground'
                                        />
                                        <Badge
                                            variant='outline'
                                            className='bg-green-400/20 text-green-300 border-green-400/40'
                                        >
                                            Verified
                                        </Badge>
                                    </div>
                                </div>

                                <div>
                                    <Label
                                        htmlFor='newEmail'
                                        className='text-white font-medium'
                                    >
                                        New Email Address
                                    </Label>
                                    <Input
                                        id='newEmail'
                                        type='email'
                                        value={emailData.newEmail}
                                        onChange={(e) =>
                                            handleEmailChange(
                                                "newEmail",
                                                e.target.value
                                            )
                                        }
                                        className='bg-background/30 border-border/30 text-foreground placeholder-muted-foreground focus:border-primary/50'
                                        placeholder='Enter new email address'
                                    />
                                </div>

                                <div>
                                    <Label
                                        htmlFor='emailPassword'
                                        className='text-white font-medium'
                                    >
                                        Current Password
                                    </Label>
                                    <div className='relative'>
                                        <Input
                                            id='emailPassword'
                                            type={
                                                showCurrentPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={emailData.password}
                                            onChange={(e) =>
                                                handleEmailChange(
                                                    "password",
                                                    e.target.value
                                                )
                                            }
                                            className='bg-black/30 border-yellow-400/30 text-white placeholder-gray-400 focus:border-yellow-400/50 pr-10'
                                            placeholder='Enter current password'
                                        />
                                        <Button
                                            type='button'
                                            variant='ghost'
                                            size='sm'
                                            className='absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white'
                                            onClick={() =>
                                                setShowCurrentPassword(
                                                    !showCurrentPassword
                                                )
                                            }
                                        >
                                            {showCurrentPassword ? (
                                                <EyeOff className='w-4 h-4' />
                                            ) : (
                                                <Eye className='w-4 h-4' />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleEmailUpdate}
                                    disabled={
                                        isLoading ||
                                        !emailData.newEmail ||
                                        !emailData.password
                                    }
                                    className='bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2 rounded-lg transition-all duration-300'
                                >
                                    {isLoading ? (
                                        <>
                                            <div className='w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2' />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className='w-4 h-4 mr-2' />
                                            Update Email
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Password Settings */}
                    <Card className='bg-card/50 border-border/30 p-8 shadow-xl shadow-black/20 backdrop-blur-sm'>
                        <div className='space-y-6'>
                            <div className='flex items-center space-x-2 mb-6'>
                                <Key className='w-6 h-6 text-secondary' />
                                <h2 className='text-2xl font-bold text-white'>
                                    Password Settings
                                </h2>
                            </div>

                            <div className='space-y-4'>
                                <div>
                                    <Label
                                        htmlFor='currentPassword'
                                        className='text-white font-medium'
                                    >
                                        Current Password
                                    </Label>
                                    <div className='relative'>
                                        <Input
                                            id='currentPassword'
                                            type={
                                                showNewPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={passwordData.currentPassword}
                                            onChange={(e) =>
                                                handlePasswordChange(
                                                    "currentPassword",
                                                    e.target.value
                                                )
                                            }
                                            className='bg-black/30 border-yellow-400/30 text-white placeholder-gray-400 focus:border-yellow-400/50 pr-10'
                                            placeholder='Enter current password'
                                        />
                                        <Button
                                            type='button'
                                            variant='ghost'
                                            size='sm'
                                            className='absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white'
                                            onClick={() =>
                                                setShowNewPassword(
                                                    !showNewPassword
                                                )
                                            }
                                        >
                                            {showNewPassword ? (
                                                <EyeOff className='w-4 h-4' />
                                            ) : (
                                                <Eye className='w-4 h-4' />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <Label
                                        htmlFor='newPassword'
                                        className='text-white font-medium'
                                    >
                                        New Password
                                    </Label>
                                    <div className='relative'>
                                        <Input
                                            id='newPassword'
                                            type={
                                                showNewPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={passwordData.newPassword}
                                            onChange={(e) =>
                                                handlePasswordChange(
                                                    "newPassword",
                                                    e.target.value
                                                )
                                            }
                                            className='bg-black/30 border-yellow-400/30 text-white placeholder-gray-400 focus:border-yellow-400/50 pr-10'
                                            placeholder='Enter new password'
                                        />
                                        <Button
                                            type='button'
                                            variant='ghost'
                                            size='sm'
                                            className='absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white'
                                            onClick={() =>
                                                setShowNewPassword(
                                                    !showNewPassword
                                                )
                                            }
                                        >
                                            {showNewPassword ? (
                                                <EyeOff className='w-4 h-4' />
                                            ) : (
                                                <Eye className='w-4 h-4' />
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
                                    <div className='relative'>
                                        <Input
                                            id='confirmPassword'
                                            type={
                                                showConfirmPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={passwordData.confirmPassword}
                                            onChange={(e) =>
                                                handlePasswordChange(
                                                    "confirmPassword",
                                                    e.target.value
                                                )
                                            }
                                            className='bg-black/30 border-yellow-400/30 text-white placeholder-gray-400 focus:border-yellow-400/50 pr-10'
                                            placeholder='Confirm new password'
                                        />
                                        <Button
                                            type='button'
                                            variant='ghost'
                                            size='sm'
                                            className='absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white'
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    !showConfirmPassword
                                                )
                                            }
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className='w-4 h-4' />
                                            ) : (
                                                <Eye className='w-4 h-4' />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <Button
                                    onClick={handlePasswordUpdate}
                                    disabled={
                                        isLoading ||
                                        !passwordData.currentPassword ||
                                        !passwordData.newPassword ||
                                        !passwordData.confirmPassword
                                    }
                                    className='bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2 rounded-lg transition-all duration-300'
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

                    {/* Login Method */}
                    <Card className='bg-card/50 border-border/30 p-8 shadow-xl shadow-black/20 backdrop-blur-sm'>
                        <div className='space-y-6'>
                            <div className='flex items-center space-x-2 mb-6'>
                                <Smartphone className='w-6 h-6 text-primary' />
                                <h2 className='text-2xl font-bold text-white'>
                                    Login Method
                                </h2>
                            </div>

                            <div className='flex items-center justify-between p-4 bg-black/30 rounded-lg border border-white/10'>
                                <div className='flex items-center space-x-3'>
                                    <span className='text-2xl'>
                                        {loginMethod.icon}
                                    </span>
                                    <div>
                                        <h3 className='text-white font-medium'>
                                            {loginMethod.provider}
                                        </h3>
                                        <p className='text-sm text-gray-400'>
                                            Primary login method
                                        </p>
                                    </div>
                                </div>
                                <Badge
                                    variant='outline'
                                    className='bg-green-400/20 text-green-300 border-green-400/40'
                                >
                                    Connected
                                </Badge>
                            </div>
                        </div>
                    </Card>

                    {/* Account Preferences */}
                    <Card className='bg-card/50 border-border/30 p-8 shadow-xl shadow-black/20 backdrop-blur-sm'>
                        <div className='space-y-6'>
                            <div className='flex items-center space-x-2 mb-6'>
                                <Settings className='w-6 h-6 text-secondary' />
                                <h2 className='text-2xl font-bold text-white'>
                                    Account Preferences
                                </h2>
                            </div>

                            <div className='space-y-4'>
                                {[
                                    {
                                        key: "emailNotifications",
                                        label: "Email Notifications",
                                        description:
                                            "Receive important updates via email",
                                    },
                                    {
                                        key: "marketingEmails",
                                        label: "Marketing Emails",
                                        description:
                                            "Receive promotional content and offers",
                                    },
                                    {
                                        key: "readingReminders",
                                        label: "Reading Reminders",
                                        description:
                                            "Get reminded to check your readings",
                                    },
                                    {
                                        key: "twoFactorAuth",
                                        label: "Two-Factor Authentication",
                                        description:
                                            "Add extra security to your account",
                                    },
                                ].map((pref) => (
                                    <div
                                        key={pref.key}
                                        className='flex items-center justify-between p-4 bg-black/30 rounded-lg border border-white/10'
                                    >
                                        <div>
                                            <h3 className='text-white font-medium'>
                                                {pref.label}
                                            </h3>
                                            <p className='text-sm text-gray-400'>
                                                {pref.description}
                                            </p>
                                        </div>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() =>
                                                handlePreferenceChange(
                                                    pref.key,
                                                    !accountPreferences[
                                                        pref.key as keyof typeof accountPreferences
                                                    ]
                                                )
                                            }
                                            className={`border transition-colors ${
                                                accountPreferences[
                                                    pref.key as keyof typeof accountPreferences
                                                ]
                                                    ? "bg-green-500/20 border-green-400/40 text-green-300"
                                                    : "bg-gray-500/20 border-gray-400/40 text-gray-400"
                                            }`}
                                        >
                                            {accountPreferences[
                                                pref.key as keyof typeof accountPreferences
                                            ]
                                                ? "On"
                                                : "Off"}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* Danger Zone */}
                    <Card className='bg-card/50 border-destructive/20 p-8 shadow-xl shadow-black/20 backdrop-blur-sm'>
                        <div className='space-y-6'>
                            <div className='flex items-center space-x-2 mb-6'>
                                <AlertTriangle className='w-6 h-6 text-destructive' />
                                <h2 className='text-2xl font-bold text-white'>
                                    Danger Zone
                                </h2>
                            </div>

                            <div className='bg-destructive/10 border border-destructive/20 rounded-lg p-4'>
                                <h3 className='text-destructive font-medium mb-2'>
                                    Delete Account
                                </h3>
                                <p className='text-sm text-destructive/80 mb-4'>
                                    Permanently delete your account and all
                                    associated data. This action cannot be
                                    undone.
                                </p>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant='outline'
                                            className='border-destructive/40 text-destructive hover:bg-destructive/20 hover:border-destructive/60'
                                        >
                                            <Trash2 className='w-4 h-4 mr-2' />
                                            Delete Account
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className='bg-background/95 border-destructive/30'>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className='text-destructive'>
                                                Delete Account
                                            </AlertDialogTitle>
                                            <AlertDialogDescription className='text-gray-300'>
                                                Are you sure you want to delete
                                                your account? This will
                                                permanently remove:
                                                <ul className='list-disc list-inside mt-2 space-y-1'>
                                                    <li>
                                                        All your tarot readings
                                                        and interpretations
                                                    </li>
                                                    <li>
                                                        Your profile information
                                                        and preferences
                                                    </li>
                                                    <li>
                                                        Your stars balance and
                                                        purchase history
                                                    </li>
                                                    <li>
                                                        All account data and
                                                        settings
                                                    </li>
                                                </ul>
                                                This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className='border-gray-400/40 text-gray-300 hover:bg-gray-500/20'>
                                                Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDeleteAccount}
                                                disabled={isLoading}
                                                className='bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <div className='w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2' />
                                                        Deleting...
                                                    </>
                                                ) : (
                                                    "Delete Account"
                                                )}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
