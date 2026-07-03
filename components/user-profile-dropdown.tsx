"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { ConsistentAvatar } from "@/components/ui/consistent-avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import {
    LogOut,
    CreditCard,
    Bell,
    User,
    Shield,
    BookOpen,
    CalendarDays,
    Settings,
    Sparkles,
    Activity,
} from "lucide-react"
import { NotificationSheet } from "@/components/notifications/notification-sheet"

export function useUserProfileMenu(onClose?: () => void) {
    const { user, signOut } = useAuth()
    const router = useRouter()
    const t = useTranslations("UserProfile")
    const [isLoading, setIsLoading] = useState(false)
    const [notificationOpen, setNotificationOpen] = useState(false)

    const handleSignOut = async () => {
        if (!user) return
        setIsLoading(true)
        try {
            await signOut()
            router.push("/")
            onClose?.()
        } catch (error) {
            console.error("Failed to sign out:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleNotificationsClick = () => {
        setNotificationOpen(true)
        onClose?.()
    }

    const navigate = (path: string) => {
        router.push(path)
        onClose?.()
    }

    return {
        user,
        t,
        isLoading,
        notificationOpen,
        setNotificationOpen,
        handleSignOut,
        handleNotificationsClick,
        navigate,
    }
}

interface UserProfileDropdownProps {
    children: React.ReactNode
    onClose?: () => void
}

export function UserProfileDropdown({
    children,
    onClose,
}: UserProfileDropdownProps) {
    const {
        user,
        t,
        isLoading,
        notificationOpen,
        setNotificationOpen,
        handleSignOut,
        handleNotificationsClick,
        navigate,
    } = useUserProfileMenu(onClose)

    if (!user) return null

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
                        <ConsistentAvatar
                            data={{
                                name: user.user_metadata?.name,
                                email: user.email,
                            }}
                            size='sm'
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
                        <DropdownMenuItem
                            onClick={handleNotificationsClick}
                        >
                            <Bell className='w-4 h-4 mr-2' />
                            {t("notifications")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => navigate("/reading/history")}
                        >
                            <BookOpen className='w-4 h-4 mr-2' />
                            {t("yourReading")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/calendar")}>
                            <CalendarDays className='w-4 h-4 mr-2' />
                            {t("calendar")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => navigate("/birth-chart")}
                        >
                            <Sparkles className='w-4 h-4 mr-2' />
                            {t("birthChart")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => navigate("/life-monitor")}
                        >
                            <Activity className='w-4 h-4 mr-2' />
                            {t("lifeMonitor")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/profile")}>
                            <User className='w-4 h-4 mr-2' />
                            {t("profile")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/account")}>
                            <Shield className='w-4 h-4 mr-2' />
                            {t("account")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/billing")}>
                            <CreditCard className='w-4 h-4 mr-2' />
                            {t("billing")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => navigate("/settings")}
                        >
                            <Settings className='w-4 h-4 mr-2' />
                            {t("settings")}
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

            <NotificationSheet
                open={notificationOpen}
                onOpenChange={setNotificationOpen}
            />
        </>
    )
}

function sidebarLinkActive(pathname: string, href: string) {
    if (pathname === href) return true
    return pathname.startsWith(`${href}/`)
}

export type UserProfileMenuState = ReturnType<typeof useUserProfileMenu>

interface UserProfileSidebarMenuProps {
    menu: UserProfileMenuState
    onNavigate?: () => void
    /** When true, omit sign out (e.g. render it at the bottom of the main nav instead). */
    hideSignOut?: boolean
}

export function UserProfileSidebarMenu({
    menu,
    onNavigate,
    hideSignOut = false,
}: UserProfileSidebarMenuProps) {
    const pathname = usePathname()
    const { user, t, handleNotificationsClick } = menu

    if (!user) return null

    const rowBase =
        "flex items-center gap-2 px-3 py-2 rounded-md transition-colors w-full text-left"

    const linkClass = (href: string) =>
        `${rowBase} ${
            sidebarLinkActive(pathname, href)
                ? "bg-accent text-white"
                : "text-cosmic-light hover:text-white hover:bg-white/10"
        }`

    return (
        <ul className='flex flex-col space-y-1'>
            <li>
                <button
                    type='button'
                    className={`${rowBase} text-cosmic-light hover:text-white hover:bg-white/10`}
                    onClick={handleNotificationsClick}
                >
                    <Bell className='w-4 h-4 shrink-0' />
                    <span>{t("notifications")}</span>
                </button>
            </li>
            <li>
                <Link
                    href='/reading/history'
                    className={linkClass("/reading/history")}
                    onClick={() => onNavigate?.()}
                >
                    <BookOpen className='w-4 h-4 shrink-0' />
                    <span>{t("yourReading")}</span>
                </Link>
            </li>
            <li>
                <Link
                    href='/calendar'
                    className={linkClass("/calendar")}
                    onClick={() => onNavigate?.()}
                >
                    <CalendarDays className='w-4 h-4 shrink-0' />
                    <span>{t("calendar")}</span>
                </Link>
            </li>
            <li>
                <Link
                    href='/birth-chart'
                    className={linkClass("/birth-chart")}
                    onClick={() => onNavigate?.()}
                >
                    <Sparkles className='w-4 h-4 shrink-0' />
                    <span>{t("birthChart")}</span>
                </Link>
            </li>
            <li>
                <Link
                    href='/life-monitor'
                    className={linkClass("/life-monitor")}
                    onClick={() => onNavigate?.()}
                >
                    <Activity className='w-4 h-4 shrink-0' />
                    <span>{t("lifeMonitor")}</span>
                </Link>
            </li>
            <li>
                <Link
                    href='/profile'
                    className={linkClass("/profile")}
                    onClick={() => onNavigate?.()}
                >
                    <User className='w-4 h-4 shrink-0' />
                    <span>{t("profile")}</span>
                </Link>
            </li>
            <li>
                <Link
                    href='/account'
                    className={linkClass("/account")}
                    onClick={() => onNavigate?.()}
                >
                    <Shield className='w-4 h-4 shrink-0' />
                    <span>{t("account")}</span>
                </Link>
            </li>
            <li>
                <Link
                    href='/billing'
                    className={linkClass("/billing")}
                    onClick={() => onNavigate?.()}
                >
                    <CreditCard className='w-4 h-4 shrink-0' />
                    <span>{t("billing")}</span>
                </Link>
            </li>
            <li>
                <Link
                    href='/settings'
                    className={linkClass("/settings")}
                    onClick={() => onNavigate?.()}
                >
                    <Settings className='w-4 h-4 shrink-0' />
                    <span>{t("settings")}</span>
                </Link>
            </li>
            {!hideSignOut ? (
                <li>
                    <button
                        type='button'
                        onClick={menu.handleSignOut}
                        disabled={menu.isLoading}
                        className={`${rowBase} text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 disabled:opacity-50`}
                    >
                        <LogOut className='w-4 h-4 shrink-0' />
                        <span>
                            {menu.isLoading ? t("signingOut") : t("signOut")}
                        </span>
                    </button>
                </li>
            ) : null}
        </ul>
    )
}

export { isUserSidebarSectionActive } from "@/lib/user-sidebar-nav"
