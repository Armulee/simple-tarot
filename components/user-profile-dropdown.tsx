"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConsistentAvatar } from "@/components/ui/consistent-avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { LogOut, CreditCard, Bell, User, Shield, Palette } from "lucide-react"
import { NotificationSheet } from "@/components/notifications/notification-sheet"

interface UserProfileDropdownProps {
    children: React.ReactNode
    onClose?: () => void
}

export function UserProfileDropdown({
    children,
    onClose,
}: UserProfileDropdownProps) {
    const { user, signOut } = useAuth()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [notificationOpen, setNotificationOpen] = useState(false)

    if (!user) return null

    const handleSignOut = async () => {
        setIsLoading(true)
        try {
            await signOut()
            router.push("/")
            if (onClose) onClose()
        } catch (error) {
            console.error("Failed to sign out:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleNotificationsClick = () => {
        setNotificationOpen(true)
        if (onClose) onClose()
    }

    const handleProfileClick = () => {
        router.push("/profile")
        if (onClose) onClose()
    }

    const handleAccountClick = () => {
        router.push("/account")
        if (onClose) onClose()
    }

    const handleThemeClick = () => {
        router.push("/theme")
        if (onClose) onClose()
    }

    const handleBillingClick = () => {
        router.push("/billing")
        if (onClose) onClose()
    }

    const getUserName = () => {
        return user.user_metadata?.name || user.email?.split("@")[0] || "User"
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
                <DropdownMenuContent
                    align='end'
                    className='w-56 bg-card/95 backdrop-blur-md border-border/30'
                >
                    <div className='flex items-center gap-2 p-2'>
                        <ConsistentAvatar 
                            data={{
                                name: user.user_metadata?.name,
                                email: user.email
                            }}
                            size="sm"
                        />
                        <div className='flex-1 min-w-0'>
                            <p className='text-sm font-medium truncate'>
                                {getUserName()}
                            </p>
                            <p className='text-xs text-muted-foreground truncate'>
                                {user.email}
                            </p>
                        </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleNotificationsClick}>
                        <Bell className='w-4 h-4 mr-2' />
                        Notifications
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleProfileClick}>
                        <User className='w-4 h-4 mr-2' />
                        Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAccountClick}>
                        <Shield className='w-4 h-4 mr-2' />
                        Account
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleThemeClick}>
                        <Palette className='w-4 h-4 mr-2' />
                        Theme
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBillingClick}>
                        <CreditCard className='w-4 h-4 mr-2' />
                        Billing
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={handleSignOut}
                        disabled={isLoading}
                        className='text-white bg-red-500/10 hover:bg-red-500/20 focus:bg-red-500/20 focus:text-white border border-red-500/20 hover:border-red-500/30'
                    >
                        <LogOut className='w-4 h-4 mr-2' />
                        {isLoading ? "Signing out..." : "Sign out"}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Notification Sheet */}
            <NotificationSheet
                open={notificationOpen}
                onOpenChange={setNotificationOpen}
            />
        </>
    )
}
