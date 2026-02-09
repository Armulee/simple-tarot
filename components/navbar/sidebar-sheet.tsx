"use client"

import Link from "next/link"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { usePathname } from "@/i18n/navigation"
import {
    Home,
    Info,
    DollarSign,
    LogIn,
    ShieldCheck,
    FileText,
    MessageSquare,
    BookOpen,
    Star,
    Infinity,
} from "lucide-react"
import { useEffect, useState } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { ConsistentAvatar } from "@/components/ui/consistent-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { UserProfileDropdown } from "@/components/user-profile-dropdown"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/contexts/profile-context"
import { useStars } from "@/contexts/stars-context"
import { Progress } from "@/components/ui/progress"

interface SidebarSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SidebarSheet({ open, onOpenChange }: SidebarSheetProps) {
    const { user, loading } = useAuth()
    const { profile, loading: profileLoading } = useProfile()
    const { stars, initialized, isInfinity, nextRefillAt, refillCap } =
        useStars()
    const pathname = usePathname()
    const t = useTranslations("Sidebar")
    const a = useTranslations("Auth.SignIn")
    const [timeLeft, setTimeLeft] = useState(0)
    const refillInterval = 2 * 60 * 60 * 1000

    useEffect(() => {
        if (!nextRefillAt) {
            setTimeLeft(0)
            return
        }
        const updateTimer = () => {
            const diff = nextRefillAt - Date.now()
            setTimeLeft(Math.max(0, diff))
        }
        updateTimer()
        const interval = window.setInterval(updateTimer, 1000)
        return () => window.clearInterval(interval)
    }, [nextRefillAt])

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000)
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60
        return `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }

    const progress = nextRefillAt
        ? Math.min(
              100,
              Math.max(0, (1 - timeLeft / refillInterval) * 100)
          )
        : 0

    const getUserName = () => {
        return profile?.name || user?.email?.split("@")[0] || "User"
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side='left'
                className='lg:hidden bg-card/95 backdrop-blur-md border-border/30 w-72 max-w-[85vw] flex flex-col h-full p-0 overflow-visible'
            >
                {/* Fixed Header Section */}
                <div className='flex-shrink-0 px-4 py-4 border-b border-white/10 overflow-visible'>
                    <SheetHeader>
                        <SheetTitle>
                            <Link
                                href='/'
                                onClick={() => onOpenChange(false)}
                                className='flex items-center space-x-2 group'
                            >
                                <Image
                                    src='/assets/logo.png'
                                    alt='AskingFate logo'
                                    width={28}
                                    height={28}
                                    className='rounded-md object-contain group-hover:scale-110 transition-transform'
                                    priority
                                />
                                <span className='font-playfair text-lg font-bold text-white group-hover:text-cosmic-purple transition-colors'>
                                    AskingFate
                                </span>
                            </Link>
                        </SheetTitle>
                    </SheetHeader>

                    {/* User Profile Section */}

                    {!loading && user ? (
                        <UserProfileDropdown
                            onClose={() => onOpenChange(false)}
                        >
                            <div className='flex items-center gap-3 p-3 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 transition-colors cursor-pointer'>
                                {profileLoading ? (
                                    <>
                                        <Skeleton className='w-10 h-10 rounded-full' />
                                        <div className='flex-1 min-w-0 space-y-2'>
                                            <Skeleton className='h-4 w-24' />
                                            <Skeleton className='h-3 w-32' />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <ConsistentAvatar
                                            data={{
                                                name: profile?.name,
                                                email: user?.email,
                                            }}
                                            size='md'
                                        />
                                        <div className='flex-1 min-w-0'>
                                            <p className='text-sm font-medium text-white truncate'>
                                                {getUserName()}
                                            </p>
                                            <p className='text-xs text-white/70 truncate'>
                                                {user.email}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </UserProfileDropdown>
                    ) : (
                        <Link
                            href='/signin'
                            className='flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white/10 text-white/90 border border-white/10 hover:bg-white/15 transition'
                            onClick={() => onOpenChange(false)}
                        >
                            <LogIn className='w-4 h-4' />
                            <span>{a("button")}</span>
                        </Link>
                    )}
                </div>

                {/* Scrollable Navigation Section */}
                <div className='flex-1 overflow-y-auto px-4 scrollbar-hide appearance-none'>
                    <nav className='space-y-6'>
                        <div className='mt-4'>
                            <div className='block group'>
                                <div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400/10 via-yellow-500/5 to-transparent border border-yellow-500/20 p-4 transition-all duration-300 group-hover:border-yellow-500/40 group-hover:from-yellow-400/20'>
                                    <Link
                                        href='/stars'
                                        onClick={() => onOpenChange(false)}
                                        className='absolute inset-0 z-0'
                                    />
                                    <div className='relative z-10'>
                                        <div className='flex items-center justify-between mb-3'>
                                            <div className='flex items-center gap-2'>
                                                <div className='p-2 rounded-full bg-yellow-500/20 text-yellow-400 group-hover:scale-110 transition-transform'>
                                                    <Star
                                                        className='w-5 h-5'
                                                        fill='currentColor'
                                                    />
                                                </div>
                                                <span className='font-medium text-yellow-100'>
                                                    Your Stars
                                                </span>
                                            </div>
                                            <div className='text-2xl font-bold text-yellow-400'>
                                                {initialized ? (
                                                    isInfinity ? (
                                                        <Infinity className='w-6 h-6' />
                                                    ) : (
                                                        stars ?? 0
                                                    )
                                                ) : (
                                                    <Skeleton className='h-8 w-8 rounded' />
                                                )}
                                            </div>
                                        </div>

                                        {nextRefillAt && timeLeft > 0 && (
                                            <div className='space-y-2'>
                                                <div className='flex justify-between text-[10px] uppercase tracking-wider text-yellow-500/70 font-semibold'>
                                                    <span>Next Refill</span>
                                                    <span>
                                                        {formatTime(timeLeft)}
                                                    </span>
                                                </div>
                                                <Progress
                                                    value={progress}
                                                    className='h-1.5 bg-yellow-950/30'
                                                    indicatorClassName='bg-gradient-to-r from-yellow-600 to-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                                                />
                                            </div>
                                        )}

                                        {!nextRefillAt && (
                                            <p className='text-[10px] text-yellow-500/50 italic'>
                                                {stars && stars >= refillCap
                                                    ? "Maximum stars reached"
                                                    : "Refill active"}
                                            </p>
                                        )}

                                        {!user && (stars ?? 0) <= 0 && (
                                            <div className='mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-[11px] text-yellow-100'>
                                                You’re out of stars.{" "}
                                                <span className='font-semibold text-white'>
                                                    Sign in
                                                </span>{" "}
                                                to recharge and get more.
                                            </div>
                                        )}

                                        {user && (
                                            <div className='mt-3'>
                                                <span className='text-[10px] uppercase tracking-wider text-yellow-500/70 font-semibold'>
                                                    Top up
                                                </span>
                                                <div className='mt-2'>
                                                    <Link
                                                        href='/stars/purchase'
                                                        onClick={() =>
                                                            onOpenChange(false)
                                                        }
                                                        className='inline-flex items-center justify-center rounded-full border border-yellow-500/30 bg-yellow-500/15 px-3 py-1 text-[11px] font-semibold text-yellow-100 transition-colors hover:bg-yellow-500/25 relative z-20'
                                                    >
                                                        Buy stars
                                                    </Link>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <ul className='flex flex-col space-y-1'>
                            <li>
                                <Link
                                    href={"/"}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                                        pathname === "/"
                                            ? "bg-accent text-white"
                                            : "text-cosmic-light hover:text-white hover:bg-white/10"
                                    }`}
                                    onClick={() => onOpenChange(false)}
                                >
                                    <Home className='w-4 h-4' />
                                    <span>{t("home")}</span>
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={"/about"}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                                        pathname === "/about"
                                            ? "bg-accent text-white"
                                            : "text-cosmic-light hover:text-white hover:bg-white/10"
                                    }`}
                                    onClick={() => onOpenChange(false)}
                                >
                                    <Info className='w-4 h-4' />
                                    <span>{t("about")}</span>
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={"/pricing"}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                                        pathname === "/pricing"
                                            ? "bg-accent text-white"
                                            : "text-cosmic-light hover:text-white hover:bg-white/10"
                                    }`}
                                    onClick={() => onOpenChange(false)}
                                >
                                    <DollarSign className='w-4 h-4' />
                                    <span>{t("pricing")}</span>
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={"/articles"}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                                        pathname.startsWith("/articles")
                                            ? "bg-accent text-white"
                                            : "text-cosmic-light hover:text-white hover:bg-white/10"
                                    }`}
                                    onClick={() => onOpenChange(false)}
                                >
                                    <BookOpen className='w-4 h-4' />
                                    <span>{t("articles")}</span>
                                </Link>
                            </li>

                            <li>
                                <Link
                                    href={"/contact"}
                                    className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors'
                                    onClick={() => onOpenChange(false)}
                                >
                                    <MessageSquare className='w-4 h-4' />
                                    <span>{t("contactSupport")}</span>
                                </Link>
                            </li>

                            <li>
                                <Link
                                    href={"/privacy-policy"}
                                    className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors'
                                    onClick={() => onOpenChange(false)}
                                >
                                    <ShieldCheck className='w-4 h-4' />
                                    <span>{t("privacyPolicy")}</span>
                                </Link>
                            </li>

                            <li>
                                <Link
                                    href={"/terms-of-service"}
                                    className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors'
                                    onClick={() => onOpenChange(false)}
                                >
                                    <FileText className='w-4 h-4' />
                                    <span>{t("termsOfService")}</span>
                                </Link>
                            </li>
                        </ul>
                    </nav>
                </div>
            </SheetContent>
        </Sheet>
    )
}
