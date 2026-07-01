"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { usePathname } from "@/i18n/navigation"
import {
    ChevronsLeft,
    ChevronsRight,
    ChevronDown,
    CircleUser,
    LogIn,
    LogOut,
    Star,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useStars } from "@/contexts/stars-context"
import { PRIMARY_NAV_ITEMS, isPrimaryNavActive } from "@/lib/primary-nav"
import { isUserSidebarSectionActive } from "@/lib/user-sidebar-nav"
import {
    UserProfileSidebarMenu,
    useUserProfileMenu,
} from "@/components/user-profile-dropdown"
import { NotificationSheet } from "@/components/notifications/notification-sheet"

/** Shared row styling for a nav entry (expanded = icon + label, collapsed = centered icon). */
function rowClass(active: boolean, collapsed: boolean, extra?: string) {
    return cn(
        "flex items-center rounded-md text-sm transition-colors",
        collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2",
        active
            ? "bg-accent text-white"
            : "text-cosmic-light hover:text-white hover:bg-white/10",
        extra,
    )
}

/**
 * Persistent, collapsible left sidebar shown at lg+ (larger than iPad). Docks
 * to the left below the fixed navbar and can collapse to an icon rail. Below
 * lg it is hidden — the hamburger `SidebarSheet` drawer is used instead.
 */
export function DesktopSidebar({
    collapsed,
    onToggle,
}: {
    collapsed: boolean
    onToggle: () => void
}) {
    const t = useTranslations("Sidebar")
    const a = useTranslations("Auth.SignIn")
    const pathname = usePathname()
    const { user } = useAuth()
    const { stars, initialized } = useStars()
    const profileMenu = useUserProfileMenu()
    const [userSubmenuOpen, setUserSubmenuOpen] = useState(false)

    // Auto-open the user submenu when on one of its routes.
    useEffect(() => {
        if (user && isUserSidebarSectionActive(pathname)) {
            setUserSubmenuOpen(true)
        }
    }, [user, pathname])

    // The rail (collapsed) only shows icons — never an expanded submenu.
    useEffect(() => {
        if (collapsed) setUserSubmenuOpen(false)
    }, [collapsed])

    const [homeItem, ...restItems] = PRIMARY_NAV_ITEMS
    const HomeIcon = homeItem.icon
    const userSectionActive = isUserSidebarSectionActive(pathname)

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-50 hidden h-dvh flex-col border-r border-white/10 bg-[#0A0F26]/80 backdrop-blur-md transition-[width] duration-300 ease-in-out lg:flex",
                collapsed ? "w-16" : "w-64",
            )}
            aria-label={t("userMenu")}
        >
            {/* Brand + collapse toggle */}
            {collapsed ? (
                <div className='flex flex-col items-center gap-1 border-b border-white/10 py-2'>
                    <Link
                        href='/'
                        aria-label='AskingFate'
                        className='flex items-center justify-center'
                    >
                        <Image
                            src='/assets/logo.png'
                            alt='AskingFate'
                            width={28}
                            height={28}
                            className='rounded-md object-contain'
                            priority
                        />
                    </Link>
                    <button
                        type='button'
                        onClick={onToggle}
                        aria-label={t("expand")}
                        title={t("expand")}
                        className='inline-flex size-8 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white'
                    >
                        <ChevronsRight className='size-4' />
                    </button>
                </div>
            ) : (
                <div className='flex h-16 items-center justify-between gap-2 border-b border-white/10 px-3'>
                    <Link
                        href='/'
                        className='group flex min-w-0 items-center gap-2'
                    >
                        <Image
                            src='/assets/logo.png'
                            alt='AskingFate'
                            width={28}
                            height={28}
                            className='rounded-md object-contain transition-transform group-hover:scale-110'
                            priority
                        />
                        <span className='truncate font-playfair text-lg font-bold text-white transition-colors group-hover:text-cosmic-purple'>
                            AskingFate
                        </span>
                    </Link>
                    <button
                        type='button'
                        onClick={onToggle}
                        aria-label={t("collapse")}
                        title={t("collapse")}
                        className='inline-flex size-8 shrink-0 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white'
                    >
                        <ChevronsLeft className='size-4' />
                    </button>
                </div>
            )}

            {/* Scrollable nav */}
            <div className='flex-1 overflow-y-auto scrollbar-hide px-2 py-3'>
                <nav className='flex flex-col gap-1'>
                    {/* Stars */}
                    <Link
                        href='/stars'
                        title={collapsed ? t("yourStars") : undefined}
                        className={rowClass(
                            pathname === "/stars",
                            collapsed,
                            "text-yellow-100 hover:text-yellow-50",
                        )}
                    >
                        <Star
                            className='size-5 shrink-0 text-yellow-400'
                            fill='currentColor'
                        />
                        {!collapsed && (
                            <>
                                <span className='truncate'>
                                    {t("yourStars")}
                                </span>
                                {initialized && (
                                    <span className='ml-auto text-sm font-semibold text-yellow-300 tabular-nums'>
                                        {stars ?? 0}
                                    </span>
                                )}
                            </>
                        )}
                    </Link>

                    {/* Home */}
                    <Link
                        href={homeItem.href}
                        title={collapsed ? t(homeItem.labelKey) : undefined}
                        className={rowClass(
                            isPrimaryNavActive(homeItem, pathname),
                            collapsed,
                        )}
                    >
                        <HomeIcon className='size-5 shrink-0' />
                        {!collapsed && (
                            <span className='truncate'>
                                {t(homeItem.labelKey)}
                            </span>
                        )}
                    </Link>

                    {/* User section */}
                    {user ? (
                        collapsed ? (
                            <button
                                type='button'
                                onClick={onToggle}
                                title={t("userMenu")}
                                className={rowClass(userSectionActive, true)}
                            >
                                <CircleUser className='size-5 shrink-0' />
                            </button>
                        ) : (
                            <div className='flex flex-col'>
                                <button
                                    type='button'
                                    onClick={() =>
                                        setUserSubmenuOpen((o) => !o)
                                    }
                                    aria-expanded={userSubmenuOpen}
                                    className={rowClass(
                                        userSectionActive || userSubmenuOpen,
                                        false,
                                    )}
                                >
                                    <CircleUser className='size-5 shrink-0' />
                                    <span className='flex-1 min-w-0 text-left'>
                                        {t("userMenu")}
                                    </span>
                                    <ChevronDown
                                        className={cn(
                                            "size-4 shrink-0 transition-transform",
                                            userSubmenuOpen && "rotate-180",
                                        )}
                                        aria-hidden
                                    />
                                </button>
                                {userSubmenuOpen ? (
                                    <div className='mt-0.5 ml-3 border-l border-white/15 pl-2 py-0.5'>
                                        <UserProfileSidebarMenu
                                            menu={profileMenu}
                                            hideSignOut
                                        />
                                    </div>
                                ) : null}
                            </div>
                        )
                    ) : null}

                    {/* Remaining primary links */}
                    {restItems.map((item) => {
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={
                                    collapsed ? t(item.labelKey) : undefined
                                }
                                className={rowClass(
                                    isPrimaryNavActive(item, pathname),
                                    collapsed,
                                )}
                            >
                                <Icon className='size-5 shrink-0' />
                                {!collapsed && (
                                    <span className='truncate'>
                                        {t(item.labelKey)}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Sign out / sign in */}
            <div className='border-t border-white/10 px-2 py-2'>
                {user ? (
                    <button
                        type='button'
                        onClick={profileMenu.handleSignOut}
                        disabled={profileMenu.isLoading}
                        title={collapsed ? profileMenu.t("signOut") : undefined}
                        className={cn(
                            "flex items-center rounded-md border border-red-500/20 bg-red-500/10 text-white transition-colors hover:bg-red-500/20 disabled:opacity-50",
                            collapsed
                                ? "w-full justify-center py-2"
                                : "w-full gap-3 px-3 py-2",
                        )}
                    >
                        <LogOut className='size-4 shrink-0' />
                        {!collapsed && (
                            <span>
                                {profileMenu.isLoading
                                    ? profileMenu.t("signingOut")
                                    : profileMenu.t("signOut")}
                            </span>
                        )}
                    </button>
                ) : (
                    <Link
                        href='/signin'
                        title={collapsed ? a("button") : undefined}
                        className={cn(
                            "flex items-center rounded-md border border-white/10 bg-white/10 text-white/90 transition-colors hover:bg-white/15",
                            collapsed
                                ? "w-full justify-center py-2"
                                : "w-full justify-center gap-2 px-3 py-2",
                        )}
                    >
                        <LogIn className='size-4 shrink-0' />
                        {!collapsed && <span>{a("button")}</span>}
                    </Link>
                )}
            </div>

            {profileMenu.user ? (
                <NotificationSheet
                    open={profileMenu.notificationOpen}
                    onOpenChange={profileMenu.setNotificationOpen}
                />
            ) : null}
        </aside>
    )
}

export default DesktopSidebar
