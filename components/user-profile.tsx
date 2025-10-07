"use client"

import { Button } from "@/components/ui/button"
import { ConsistentAvatar } from "@/components/ui/consistent-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/contexts/profile-context"
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
    const { profile, loading } = useProfile()

    if (!user) return null

    const getUserName = () => {
        return profile?.name || user.email?.split("@")[0] || "User"
    }

    // Show loading skeleton while profile is loading
    if (loading) {
        if (variant === "mobile") {
            return (
                <UserProfileDropdown onClose={onClose}>
                    <Button
                        variant='ghost'
                        size='icon'
                        className={`text-white hover:bg-white/10 ${className || ""}`}
                        aria-label='Open user menu'
                        disabled
                    >
                        <Skeleton className='w-8 h-8 rounded-full' />
                    </Button>
                </UserProfileDropdown>
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
                    disabled
                >
                        <Skeleton className='w-8 h-8 rounded-full' />
                    <Skeleton className='h-4 w-20 hidden sm:block' />
                    <ChevronDown className='w-4 h-4' />
                </Button>
            )
        }

        return (
            <UserProfileDropdown>
                <Button
                    variant='ghost'
                    className='flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/10 text-white'
                    disabled
                >
                        <Skeleton className='w-8 h-8 rounded-full' />
                    <ChevronDown className='w-4 h-4' />
                </Button>
            </UserProfileDropdown>
        )
    }

    if (variant === "mobile") {
        return (
            <UserProfileDropdown onClose={onClose}>
                <Button
                    variant='ghost'
                    size='icon'
                    className={`text-white hover:bg-white/10 ${className || ""}`}
                    aria-label='Open user menu'
                >
                    <ConsistentAvatar 
                        data={{
                            name: profile?.name,
                            email: user.email
                        }}
                        size="sm"
                    />
                </Button>
            </UserProfileDropdown>
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
                    <ConsistentAvatar 
                        data={{
                            name: profile?.name,
                            email: user.email
                        }}
                        size="sm"
                    />
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
                    <ConsistentAvatar 
                        data={{
                            name: profile?.name,
                            email: user.email
                        }}
                        size="sm"
                    />
                <ChevronDown className='w-4 h-4' />
            </Button>
        </UserProfileDropdown>
    )
}
