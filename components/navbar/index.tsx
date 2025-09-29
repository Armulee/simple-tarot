"use client"

import Link from "next/link"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import {
    Menu,
    ChevronDown,
    BookOpen,
    LogIn,
    Sparkles,
    Check,
    Star,
} from "lucide-react"
import { SidebarSheet } from "./sidebar-sheet"
import { UserProfile } from "@/components/user-profile"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { useStars } from "@/contexts/stars-context"
import { useStarConsent } from "@/components/star-consent"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import mysticalServices from "./mystical-services"
import { useTranslations as useSidebarTranslations } from "next-intl"

export function Navbar({ locale }: { locale: string }) {
    const t = useTranslations("Navbar")
    const s = useSidebarTranslations("Services")
    const [open, setOpen] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const [mysticalOpen, setMysticalOpen] = useState(false)
    const { user, loading } = useAuth()
    const { stars, initialized } = useStars()
    const { choice, show } = useStarConsent()
    const meta = (user?.user_metadata ?? {}) as {
        avatar_url?: string
        picture?: string
        name?: string
    }
    // const avatarSrc = meta.avatar_url || meta.picture || undefined
    const displayName = meta.name || user?.email?.split("@")[0] || "User"
    // const initial = displayName.charAt(0).toUpperCase()

    return (
        <nav className='fixed top-0 left-0 right-0 z-50 bg-card/5 backdrop-blur-sm border-b border-border/20'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                <div className='flex justify-between items-center h-16'>
                    {/* Left: Mobile menu button / Desktop brand */}
                    <div className='flex items-center'>
                        {/* Mobile: menu button (always bars) */}
                        <Button
                            variant='ghost'
                            size='icon'
                            className='md:hidden text-white hover:bg-white/10'
                            onClick={() => setOpen(true)}
                            aria-label='Open menu'
                        >
                            <Menu className='h-6 w-6' />
                        </Button>

                        {/* Desktop: brand */}
                        <Link
                            href='/'
                            className='hidden md:flex items-center space-x-2 group px-2 py-1 rounded-md hover:bg-white/5'
                        >
                            <Image
                                src='/assets/logo.png'
                                alt='Asking Fate logo'
                                width={32}
                                height={32}
                                className='rounded-md object-contain group-hover:scale-110 transition-transform'
                                priority
                            />
                            <span className='font-playfair text-xl font-bold text-white group-hover:text-cosmic-purple transition-colors'>
                                {t("brand")}
                            </span>
                        </Link>
                    </div>

                    {/* Right side: Navigation links, Language dropdown, and Auth */}
                    <div className='flex items-center space-x-3'>
                        <Link
                            href='/'
                            className='hidden md:block text-cosmic-light hover:text-white transition-colors'
                        >
                            {t("home")}
                        </Link>
                        <Link
                            href='/about'
                            className='hidden md:block text-cosmic-light hover:text-white transition-colors'
                        >
                            {t("about")}
                        </Link>
                        <Sheet
                            open={mysticalOpen}
                            onOpenChange={setMysticalOpen}
                        >
                            <SheetTrigger asChild>
                                <Button
                                    variant='ghost'
                                    className='inline-flex items-center space-x-2 text-white hover:bg-white/10 px-4 py-2 rounded-md transition-colors'
                                >
                                    <Sparkles className='h-4 w-4' />
                                    <span>{s("tarot")}</span>
                                    <ChevronDown className='h-4 w-4' />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side='right'
                                className='w-80 bg-card/95 backdrop-blur-md border-border/30'
                            >
                                <SheetHeader>
                                    <SheetTitle className='flex items-center space-x-2 text-white'>
                                        <BookOpen className='h-5 w-5' />
                                        <span>{s("tarot")}</span>
                                    </SheetTitle>
                                </SheetHeader>
                                <div className='mt-8 space-y-2'>
                                    {mysticalServices.map(
                                        ({ id, href, Icon, available }) => (
                                            <div key={id}>
                                                {available ? (
                                                    <Link
                                                        href={
                                                            id === "tarot"
                                                                ? "/"
                                                                : href
                                                        }
                                                        className='flex items-center space-x-3 px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors group'
                                                        onClick={() =>
                                                            setMysticalOpen(
                                                                false
                                                            )
                                                        }
                                                    >
                                                        <Icon className='h-5 w-5 text-primary' />
                                                        <span className='font-medium'>
                                                            {s(id)}
                                                        </span>
                                                    </Link>
                                                ) : (
                                                    <div className='flex items-center space-x-3 px-4 py-3 rounded-lg text-white/50 cursor-not-allowed opacity-60'>
                                                        <Icon className='h-5 w-5' />
                                                        <span className='font-medium'>
                                                            {s(id)}
                                                        </span>
                                                        <span className='ml-auto text-xs bg-white/10 px-2 py-1 rounded-full'>
                                                            Coming Soon
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>

                        {/* Language Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='text-white border-white/30 hover:bg-white/10'
                                    aria-label='Change language'
                                >
                                    {locale.toUpperCase()}{" "}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className='w-24 bg-card/95 backdrop-blur-md border-border/30'>
                                {routing.locales.map((loc) => (
                                    <DropdownMenuItem
                                        key={loc}
                                        onClick={() =>
                                            router.replace(pathname, {
                                                locale: loc,
                                            })
                                        }
                                        className='cursor-pointer'
                                    >
                                        <span className='flex-grow'>
                                            {loc.toUpperCase()}
                                        </span>
                                        {locale === loc && (
                                            <Check className='ml-2 h-4 w-4' />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Star balance pill - desktop */}
                        <div className='hidden md:flex items-center'>
                            <Link href='/stars'>
                                <Button
                                    variant='ghost'
                                    className='h-10 px-3 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 text-yellow-300 border border-yellow-500/30 flex items-center gap-2'
                                    onClick={(e) => {
                                        if (choice === null || choice === "declined") {
                                            e.preventDefault()
                                            show()
                                        }
                                    }}
                                >
                                    <Star className={`w-4 h-4 ${initialized ? '' : 'animate-spin-slow'}`} fill='currentColor' />
                                    {initialized && (
                                        <span className='font-semibold'>
                                            {stars ?? 0}
                                        </span>
                                    )}
                                </Button>
                            </Link>
                        </div>

                        {/* Mobile: Star balance next to sign-in/profile */}
                        <div className='md:hidden flex items-center'>
                            <Link href='/stars' className='mr-2'>
                                <Button
                                    variant='ghost'
                                    className='h-9 px-2 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 text-yellow-300 border border-yellow-500/30 flex items-center gap-1'
                                    onClick={(e) => {
                                        if (choice === null || choice === "declined") {
                                            e.preventDefault()
                                            show()
                                        }
                                    }}
                                >
                                    <Star className={`w-4 h-4 ${initialized ? '' : 'animate-spin-slow'}`} fill='currentColor' />
                                    {initialized && (
                                        <span className='font-semibold'>
                                            {stars ?? 0}
                                        </span>
                                    )}
                                </Button>
                            </Link>
                        </div>

                        {/* Desktop: User Profile / Sign In button */}
                        <div className='hidden md:block'>
                            {!loading && user ? (
                                <UserProfile variant='desktop' />
                            ) : (
                                <Link href={`/signin?callbackUrl=${encodeURIComponent(pathname)}`}>
                                    <Button
                                        variant='outline'
                                        className='flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white/10 text-white/90 border border-white/10 hover:bg-white/15 transition'
                                    >
                                        <LogIn className='w-4 h-4' />
                                        Sign In
                                    </Button>
                                </Link>
                            )}
                        </div>

                        {/* Mobile: User profile when logged-in, else sign-in icon */}
                        <div className='md:hidden'>
                            {!loading && user ? (
                                <UserProfile variant='mobile' />
                            ) : (
                                <Link href={`/signin?callbackUrl=${encodeURIComponent(pathname)}`}>
                                    <Button
                                        variant='outline'
                                        size='icon'
                                        className='text-white border-white/30 hover:bg-white/10 rounded-full'
                                        aria-label='Sign in'
                                    >
                                        <LogIn className='w-4 h-4' />
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile sidebar */}
            <SidebarSheet open={open} onOpenChange={setOpen} />
        </nav>
    )
}
