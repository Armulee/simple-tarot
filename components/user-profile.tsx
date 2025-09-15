"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { ChevronDown } from "lucide-react"
import { UserProfileDropdown } from "@/components/user-profile-dropdown"

interface UserProfileProps {
    variant?: "desktop" | "mobile" | "sidebar-trigger"
    onClose?: () => void
    className?: string
}

export function UserProfile({
    variant = "desktop",
    onClose,
    className,
}: UserProfileProps) {
    const { user } = useAuth()

    if (!user) return null

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

    if (variant === "mobile") {
        return (
            <Button
                variant='ghost'
                size='icon'
                onClick={onClose}
                className={`text-white hover:bg-white/10 ${className || ""}`}
                aria-label='Open user menu'
            >
                <Avatar className='w-8 h-8'>
                    <AvatarImage src={getUserAvatar()} alt={getUserName()} />
                    <AvatarFallback className='bg-primary/20 text-primary font-semibold text-sm'>
                        {getUserInitials()}
                    </AvatarFallback>
                </Avatar>
            </Button>
        )
    }

    if (variant === "sidebar-trigger") {
        return (
            <Button
                variant='ghost'
                onClick={onClose}
                className={`flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/10 text-white ${
                    className || ""
                }`}
                aria-label='Open user menu'
            >
                <Avatar className='w-8 h-8'>
                    <AvatarImage src={getUserAvatar()} alt={getUserName()} />
                    <AvatarFallback className='bg-primary/20 text-primary font-semibold text-sm'>
                        {getUserInitials()}
                    </AvatarFallback>
                </Avatar>
                <span className='hidden sm:block text-sm font-medium'>
                    {getUserName()}
                </span>
                <ChevronDown className='w-4 h-4' />
            </Button>
        )
    }

    return (
        <UserProfileDropdown>
            <Button
                variant='ghost'
                className='flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/10 text-white'
            >
                <Avatar className='w-8 h-8'>
                    <AvatarImage src={getUserAvatar()} alt={getUserName()} />
                    <AvatarFallback className='bg-primary/20 text-primary font-semibold text-sm'>
                        {getUserInitials()}
                    </AvatarFallback>
                </Avatar>
                <ChevronDown className='w-4 h-4' />
            </Button>
        </UserProfileDropdown>
    )
}
