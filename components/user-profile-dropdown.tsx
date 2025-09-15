"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { Settings, LogOut, History, CreditCard } from "lucide-react"

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

    const handleSettingsClick = () => {
        router.push("/settings")
        if (onClose) onClose()
    }

    const handleHistoryClick = () => {
        router.push("/reading-history")
        if (onClose) onClose()
    }

    const handleBillingClick = () => {
        router.push("/billing")
        if (onClose) onClose()
    }

    const getUserInitials = () => {
        const name =
            user.user_metadata?.name || user.email?.split("@")[0] || "U"
        return name.charAt(0).toUpperCase()
    }

    const getUserName = () => {
        return user.user_metadata?.name || user.email?.split("@")[0] || "User"
    }

    const getUserAvatar = () => {
        return user.user_metadata?.avatar_url || user.user_metadata?.picture
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
            <DropdownMenuContent
                align='end'
                className='w-56 bg-card/95 backdrop-blur-md border-border/30'
            >
                <div className='flex items-center gap-2 p-2'>
                    <Avatar className='w-8 h-8'>
                        <AvatarImage
                            src={getUserAvatar()}
                            alt={getUserName()}
                        />
                        <AvatarFallback className='bg-primary/20 text-primary font-semibold'>
                            {getUserInitials()}
                        </AvatarFallback>
                    </Avatar>
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
                <DropdownMenuItem onClick={handleSettingsClick}>
                    <Settings className='w-4 h-4 mr-2' />
                    Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleHistoryClick}>
                    <History className='w-4 h-4 mr-2' />
                    Reading History
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
    )
}
