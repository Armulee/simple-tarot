"use client"

import { Button } from "@/components/ui/button"
import { ConsistentAvatar } from "@/components/ui/consistent-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { WitchHat } from "@/components/ui/witch-hat"
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
                        <div className="relative">
                            <WitchHat 
                                size="sm" 
                                className="absolute -top-2 -right-1 z-10"
                            />
                            <Skeleton className='w-8 h-8 rounded-full' />
                        </div>
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
                    <div className="relative">
                        <WitchHat 
                            size="sm" 
                            className="absolute -top-2 -left-1 z-10"
                        />
                        <Skeleton className='w-8 h-8 rounded-full' />
                    </div>
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
                    <div className="relative">
                        <WitchHat 
                            size="sm" 
                            className="absolute -top-2 -left-1 z-10"
                        />
                        <Skeleton className='w-8 h-8 rounded-full' />
                    </div>
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
                    <div className="relative">
                        <WitchHat 
                            size="sm" 
                            className="absolute -top-2 -left-1 z-10"
                        />
                        <ConsistentAvatar 
                            data={{
                                name: profile?.name,
                                email: user.email
                            }}
                            size="sm"
                        />
                    </div>
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
                    <div className="relative">
                        <WitchHat 
                            size="sm" 
                            className="absolute -top-2 -left-1 z-10"
                        />
                        <ConsistentAvatar 
                            data={{
                                name: profile?.name,
                                email: user.email
                            }}
                            size="sm"
                        />
                    </div>
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
                    <div className="relative">
                        <WitchHat 
                            size="sm" 
                            className="absolute -top-2 -left-1 z-10"
                        />
                        <ConsistentAvatar 
                            data={{
                                name: profile?.name,
                                email: user.email
                            }}
                            size="sm"
                        />
                    </div>
                <ChevronDown className='w-4 h-4' />
            </Button>
        </UserProfileDropdown>
    )
}
