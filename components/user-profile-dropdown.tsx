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
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { LogOut, CreditCard, Bell, User, Shield, Palette, Moon, Sun, Star, Eye, Wand2, Check } from "lucide-react"
import { NotificationSheet } from "@/components/notifications/notification-sheet"

interface UserProfileDropdownProps {
    children: React.ReactNode
    onClose?: () => void
}

interface Theme {
    id: string
    name: string
    icon: React.ReactNode
    available: boolean
}

export function UserProfileDropdown({
    children,
    onClose,
}: UserProfileDropdownProps) {
    const { user, signOut } = useAuth()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [notificationOpen, setNotificationOpen] = useState(false)
    const [selectedTheme, setSelectedTheme] = useState("default")

    const themes: Theme[] = [
        {
            id: "default",
            name: "Default",
            icon: <Palette className='w-4 h-4' />,
            available: true,
        },
        {
            id: "antiverse",
            name: "Anti-Verse",
            icon: <Moon className='w-4 h-4' />,
            available: true,
        },
        {
            id: "zodiac",
            name: "Zodiac",
            icon: <Star className='w-4 h-4' />,
            available: true,
        },
        {
            id: "singularity",
            name: "Singularity",
            icon: <Eye className='w-4 h-4' />,
            available: true,
        },
        {
            id: "luminous",
            name: "Luminous",
            icon: <Sun className='w-4 h-4' />,
            available: true,
        },
        {
            id: "mystic",
            name: "Mystic",
            icon: <Wand2 className='w-4 h-4' />,
            available: true,
        },
    ]

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

    const handleThemeSelect = (themeId: string) => {
        setSelectedTheme(themeId)
        // TODO: Implement theme switching logic
        console.log("Selected theme:", themeId)
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
                    className='w-56 bg-card/95 backdrop-blur-md border-border/30 z-[60] overflow-visible'
                    sideOffset={5}
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
                    <DropdownMenuGroup>
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
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Palette className='w-4 h-4 mr-2' />
                                Theme
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent 
                                className='w-56 bg-card/95 backdrop-blur-md border-border/30 z-[100] overflow-visible'
                                sideOffset={-2}
                                alignOffset={-2}
                            >
                                {themes.map((theme) => (
                                    <DropdownMenuItem
                                        key={theme.id}
                                        onClick={() => handleThemeSelect(theme.id)}
                                        disabled={!theme.available}
                                        className='flex items-center justify-between'
                                    >
                                        <div className='flex items-center'>
                                            {theme.icon}
                                            <span className='ml-2'>{theme.name}</span>
                                        </div>
                                        {selectedTheme === theme.id && (
                                            <Check className='w-4 h-4 text-green-400' />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem onClick={handleBillingClick}>
                            <CreditCard className='w-4 h-4 mr-2' />
                            Billing
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
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
