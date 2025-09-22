"use client"

import Link from "next/link"
import Image from "next/image"
import { useTranslations } from "next-intl"
import {
    Home,
    Info,
    ChevronDown,
    ChevronUp,
    Sparkles,
    LogIn,
    ShieldCheck,
    FileText,
    DollarSign,
} from "lucide-react"
import { useState } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserProfileDropdown } from "@/components/user-profile-dropdown"
import { useAuth } from "@/hooks/use-auth"
import mysticalServices from "./mystical-services"

interface SidebarSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SidebarSheet({ open, onOpenChange }: SidebarSheetProps) {
    const { user, loading } = useAuth()
    const [mysticalOpen, setMysticalOpen] = useState(true)
    const t = useTranslations("Sidebar")
    const s = useTranslations("Services")
    const a = useTranslations("Auth.SignIn")

    const getUserInitials = () => {
        const name =
            user?.user_metadata?.name || user?.email?.split("@")[0] || "U"
        return name.charAt(0).toUpperCase()
    }

    const getUserName = () => {
        return user?.user_metadata?.name || user?.email?.split("@")[0] || "User"
    }

    const getUserAvatar = () => {
        return user?.user_metadata?.avatar_url || ""
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side='left'
                className='md:hidden bg-card/95 backdrop-blur-md border-border/30 w-72 max-w-[85vw] flex flex-col'
            >
                <SheetHeader className='flex-shrink-0'>
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
                <nav className='flex-1 overflow-y-auto'>
                    <ul className='flex flex-col space-y-1 p-1'>
                        {/* Sign In / User Profile at the top */}
                        <li className='pb-2 border-b border-white/10 mb-2'>
                            {!loading && user ? (
                                <UserProfileDropdown
                                    onClose={() => onOpenChange(false)}
                                >
                                    <div className='flex items-center gap-3 p-3 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 transition-colors cursor-pointer'>
                                        <Avatar className='w-10 h-10'>
                                            <AvatarImage
                                                src={getUserAvatar()}
                                                alt={getUserName()}
                                            />
                                            <AvatarFallback className='bg-primary/20 text-primary font-semibold'>
                                                {getUserInitials()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className='flex-1 min-w-0'>
                                            <p className='text-sm font-medium text-white truncate'>
                                                {getUserName()}
                                            </p>
                                            <p className='text-xs text-white/70 truncate'>
                                                {user.email}
                                            </p>
                                        </div>
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
                        </li>

                        <li>
                            <Link
                                href={"/"}
                                className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors'
                                onClick={() => onOpenChange(false)}
                            >
                                <Home className='w-4 h-4' />
                                <span>{t("home")}</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                href={"/about"}
                                className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors'
                                onClick={() => onOpenChange(false)}
                            >
                                <Info className='w-4 h-4' />
                                <span>{t("about")}</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                href={"/pricing"}
                                className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors'
                                onClick={() => onOpenChange(false)}
                            >
                                <DollarSign className='w-4 h-4' />
                                <span>{t("pricing")}</span>
                            </Link>
                        </li>

                        {/* Active Service Dropdown */}
                        <li>
                            <button
                                onClick={() => setMysticalOpen(!mysticalOpen)}
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
                                        ({ id, href, Icon, available }) => (
                                            <li key={id}>
                                                {available ? (
                                                    <Link
                                                        href={
                                                            id === "tarot"
                                                                ? "/"
                                                                : href
                                                        }
                                                        className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors'
                                                        onClick={() =>
                                                            onOpenChange(false)
                                                        }
                                                    >
                                                        <Icon className='w-4 h-4' />
                                                        <span>{s(id)}</span>
                                                    </Link>
                                                ) : (
                                                    <div className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light/50 cursor-not-allowed opacity-60'>
                                                        <Icon className='w-4 h-4' />
                                                        <span>{s(id)}</span>
                                                        <span className='ml-auto text-xs bg-white/10 px-2 py-1 rounded-full'>
                                                            {t("comingSoon")}
                                                        </span>
                                                    </div>
                                                )}
                                            </li>
                                        )
                                    )}
                                </ul>
                            )}
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
            </SheetContent>
        </Sheet>
    )
}
