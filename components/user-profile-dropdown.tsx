"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ConsistentAvatar } from "@/components/ui/consistent-avatar"
import { useTranslations } from "next-intl"
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
<<<<<<< HEAD
import { LogOut, CreditCard, Bell, User, Shield, Palette, Moon, Sun, Star, Eye, Wand2, Check } from "lucide-react"
=======
import {
    LogOut,
    CreditCard,
    Bell,
    User,
    Shield,
    Palette,
    Moon,
    Sun,
    Star,
    Eye,
    Wand2,
    Check,
} from "lucide-react"
>>>>>>> 8fb5c0644a643586f48cb396d255b1ef5e159eec
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
    const t = useTranslations("UserProfile")
    const [isLoading, setIsLoading] = useState(false)
    const [notificationOpen, setNotificationOpen] = useState(false)
    const [selectedTheme, setSelectedTheme] = useState("default")

    const applyTheme = (themeId: string) => {
        const root = document.documentElement
        if (themeId === "default") {
            root.removeAttribute("data-theme")
        } else {
            root.setAttribute("data-theme", themeId)
        }
    }

    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem("themeId")
            if (savedTheme) {
                setSelectedTheme(savedTheme)
                applyTheme(savedTheme)
            }
        } catch (error) {
            // ignore read errors
        }
    }, [])

    const themes: Theme[] = [
        {
            id: "default",
            name: t("themes.default"),
            icon: <Palette className='w-4 h-4' />,
            available: true,
        },
        {
            id: "antiverse",
            name: t("themes.antiverse"),
            icon: <Moon className='w-4 h-4' />,
            available: true,
        },
        {
            id: "zodiac",
            name: t("themes.zodiac"),
            icon: <Star className='w-4 h-4' />,
            available: true,
        },
        {
            id: "singularity",
            name: t("themes.singularity"),
            icon: <Eye className='w-4 h-4' />,
            available: true,
        },
        {
            id: "luminous",
            name: t("themes.luminous"),
            icon: <Sun className='w-4 h-4' />,
            available: true,
        },
        {
            id: "mystic",
            name: t("themes.mystic"),
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
        try {
            localStorage.setItem("themeId", themeId)
        } catch (error) {
            // ignore write errors
        }
        applyTheme(themeId)
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
                    className='w-56 bg-card/80 backdrop-blur-md border border-border/50 overflow-visible shadow-lg z-[9999]'
                    sideOffset={5}
                >
                    <div className='flex items-center gap-2 p-2'>
<<<<<<< HEAD
                        <ConsistentAvatar 
                            data={{
                                name: user.user_metadata?.name,
                                email: user.email
                            }}
                            size="sm"
=======
                        <ConsistentAvatar
                            data={{
                                name: user.user_metadata?.name,
                                email: user.email,
                            }}
                            size='sm'
>>>>>>> 8fb5c0644a643586f48cb396d255b1ef5e159eec
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
                            {t("notifications")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleProfileClick}>
                            <User className='w-4 h-4 mr-2' />
                            {t("profile")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleAccountClick}>
                            <Shield className='w-4 h-4 mr-2' />
                            {t("account")}
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Palette className='w-4 h-4 mr-2' />
                                {t("theme")}
                            </DropdownMenuSubTrigger>
<<<<<<< HEAD
                            <DropdownMenuSubContent 
=======
                            <DropdownMenuSubContent
>>>>>>> 8fb5c0644a643586f48cb396d255b1ef5e159eec
                                className='w-fit bg-card border border-border/50 overflow-visible shadow-lg z-[9999]'
                                sideOffset={-2}
                                alignOffset={-2}
                            >
                                {themes.map((theme) => (
                                    <DropdownMenuItem
                                        key={theme.id}
<<<<<<< HEAD
                                        onClick={() => handleThemeSelect(theme.id)}
                                        disabled={!theme.available}
                                        className={`flex items-center justify-between ${
                                            selectedTheme === theme.id 
                                                ? 'bg-accent text-accent-foreground' 
                                                : ''
=======
                                        onClick={() =>
                                            handleThemeSelect(theme.id)
                                        }
                                        disabled={!theme.available}
                                        className={`flex items-center justify-between ${
                                            selectedTheme === theme.id
                                                ? "bg-accent text-accent-foreground"
                                                : ""
>>>>>>> 8fb5c0644a643586f48cb396d255b1ef5e159eec
                                        }`}
                                    >
                                        <div className='flex items-center'>
                                            {selectedTheme === theme.id ? (
                                                <Check className='w-4 h-4' />
                                            ) : (
                                                theme.icon
                                            )}
<<<<<<< HEAD
                                            <span className='ml-2'>{theme.name}</span>
=======
                                            <span className='ml-2'>
                                                {theme.name}
                                            </span>
>>>>>>> 8fb5c0644a643586f48cb396d255b1ef5e159eec
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem onClick={handleBillingClick}>
                            <CreditCard className='w-4 h-4 mr-2' />
                            {t("billing")}
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={handleSignOut}
                        disabled={isLoading}
                        className='text-white bg-red-500/10 hover:bg-red-500/20 focus:bg-red-500/20 focus:text-white border border-red-500/20 hover:border-red-500/30'
                    >
                        <LogOut className='w-4 h-4 mr-2' />
                        {isLoading ? t("signingOut") : t("signOut")}
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
