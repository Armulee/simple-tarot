"use client"

import Link from "next/link"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { usePathname } from "@/i18n/navigation"
import {
    Home,
    Info,
    DollarSign,
    ChevronDown,
    ChevronUp,
    Sparkles,
    LogIn,
    ShieldCheck,
    FileText,
    MessageSquare,
    BookOpen,
} from "lucide-react"
import { useState } from "react"
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
import mysticalServices from "./mystical-services"

interface SidebarSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SidebarSheet({ open, onOpenChange }: SidebarSheetProps) {
    const { user, loading } = useAuth()
    const { profile, loading: profileLoading } = useProfile()
    const [mysticalOpen, setMysticalOpen] = useState(true)
    const pathname = usePathname()
    const t = useTranslations("Sidebar")
    const s = useTranslations("Services")
    const a = useTranslations("Auth.SignIn")

    const getUserName = () => {
        return profile?.name || user?.email?.split("@")[0] || "User"
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side='left'
                className='md:hidden bg-card/95 backdrop-blur-md border-border/30 w-72 max-w-[85vw] flex flex-col h-full p-0 overflow-visible'
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
                                    alt='Asking Fate logo'
                                    width={28}
                                    height={28}
                                    className='rounded-md object-contain group-hover:scale-110 transition-transform'
                                    priority
                                />
                                <span className='font-playfair text-lg font-bold text-white group-hover:text-cosmic-purple transition-colors'>
                                    Asking Fate
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
                <div className='flex-1 overflow-y-auto px-4'>
                    <nav>
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

                            {/* Active Service Dropdown */}
                            <li>
                                <button
                                    onClick={() =>
                                        setMysticalOpen(!mysticalOpen)
                                    }
                                    className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors w-full'
                                >
                                    <Sparkles className='w-4 h-4' />
                                    <span>{t("services")}</span>
                                    {mysticalOpen ? (
                                        <ChevronUp className='w-4 h-4 ml-auto' />
                                    ) : (
                                        <ChevronDown className='w-4 h-4 ml-auto' />
                                    )}
                                </button>
                                {mysticalOpen && (
                                    <ul className='ml-4 mt-1 space-y-1'>
                                        {mysticalServices.map(
                                            ({ id, href, Icon, available }) => {
                                                const itemPath =
                                                    id === "tarot" ? "/" : href
                                                const isActive =
                                                    pathname === itemPath
                                                return (
                                                    <li key={id}>
                                                        {available ? (
                                                            <Link
                                                                href={itemPath}
                                                                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                                                                    isActive
                                                                        ? "bg-accent/50 text-white"
                                                                        : "text-cosmic-light hover:text-white hover:bg-white/10"
                                                                }`}
                                                                onClick={() =>
                                                                    onOpenChange(
                                                                        false
                                                                    )
                                                                }
                                                            >
                                                                <Icon className='w-4 h-4' />
                                                                <span>
                                                                    {s(id)}
                                                                </span>
                                                            </Link>
                                                        ) : (
                                                            <div className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light/50 cursor-not-allowed opacity-60'>
                                                                <Icon className='w-4 h-4' />
                                                                <span>
                                                                    {s(id)}
                                                                </span>
                                                                <span className='ml-auto text-xs bg-white/10 px-2 py-1 rounded-full'>
                                                                    {t(
                                                                        "comingSoon"
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </li>
                                                )
                                            }
                                        )}
                                    </ul>
                                )}
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
