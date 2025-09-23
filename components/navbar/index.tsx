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
} from "lucide-react"
import { SidebarSheet } from "./sidebar-sheet"
import { UserProfile } from "@/components/user-profile"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
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
import { useService } from "@/contexts/service-context"
import { WaitlistDialog } from "@/components/waitlist-dialog"
import type { MysticalServiceId } from "@/contexts/service-context"
import { useTranslations as useSidebarTranslations } from "next-intl"

export function Navbar({ locale }: { locale: string }) {
    const t = useTranslations("Navbar")
    const s = useSidebarTranslations("Services")
    const [open, setOpen] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const [mysticalOpen, setMysticalOpen] = useState(false)
    const [waitlistOpen, setWaitlistOpen] = useState(false)
    const [waitlistLabel, setWaitlistLabel] = useState("")
    const { activeService, setActiveService } = useService()
    const { user, loading } = useAuth()
    const meta = (user?.user_metadata ?? {}) as {
        avatar_url?: string
        picture?: string
        name?: string
    }
    const avatarSrc = meta.avatar_url || meta.picture || undefined
    const displayName = meta.name || user?.email?.split("@")[0] || "User"
    const initial = displayName.charAt(0).toUpperCase()

    return (
        <>
        <nav className='fixed top-0 left-0 right-0 z-50 bg-card/5 backdrop-blur-sm border-b border-border/20'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                <div className='flex justify-between items-center h-16'>
                    {/* Left: Mobile menu button / Desktop brand */}
                    <div className='flex items-center'>
                        {/* Mobile: menu button or user avatar */}
                        <Button
                            variant='ghost'
                            size='icon'
                            className='md:hidden text-white hover:bg-white/10'
                            onClick={() => setOpen(true)}
                            aria-label='Open menu'
                        >
                            {!loading && user ? (
                                <Avatar className='w-8 h-8'>
                                    <AvatarImage
                                        src={avatarSrc}
                                        alt={displayName}
                                    />
                                    <AvatarFallback className='bg-primary/20 text-primary font-semibold text-sm'>
                                        {initial}
                                    </AvatarFallback>
                                </Avatar>
                            ) : (
                                <Menu className='h-6 w-6' />
                            )}
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
                                    <span>{s(activeService)}</span>
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
                                        ({ id, Icon, available, label }) => (
                                            <div key={id}>
                                                <button
                                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors group ${available ? "text-white hover:bg-white/10" : "text-white/50 hover:bg-white/5"}`}
                                                    onClick={() => {
                                                        if (available) {
                                                            setActiveService(id as MysticalServiceId)
                                                            setMysticalOpen(false)
                                                            if (id === "tarot" && pathname !== "/") {
                                                                router.push("/")
                                                            }
                                                        } else {
                                                            setMysticalOpen(false)
                                                            setWaitlistLabel(label)
                                                            setWaitlistOpen(true)
                                                        }
                                                    }}
                                                >
                                                    <Icon className={`h-5 w-5 ${available ? "text-primary" : ""}`} />
                                                    <span className='font-medium'>
                                                        {s(id)}
                                                    </span>
                                                    {!available && (
                                                        <span className='ml-auto text-xs bg-white/10 px-2 py-1 rounded-full'>
                                                            Coming Soon
                                                        </span>
                                                    )}
                                                </button>
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
                                {routing.locales.map((loc: (typeof routing.locales)[number]) => (
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

                        {/* Desktop only: User Profile / Sign In button */}
                        <div className='hidden md:block'>
                            {!loading && user ? (
                                <UserProfile variant='desktop' />
                            ) : (
                                <Link href='/signin'>
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

                        {/* Mobile: Sign-in icon button (hidden when logged in) */}
                        {!loading && !user && (
                            <Link href='/signin' className='md:hidden'>
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

            {/* Mobile sidebar */}
            <SidebarSheet open={open} onOpenChange={setOpen} />
        </nav>
        <WaitlistDialog
            open={waitlistOpen}
            onOpenChange={setWaitlistOpen}
            serviceLabel={waitlistLabel}
        />
        </>
    )
}
