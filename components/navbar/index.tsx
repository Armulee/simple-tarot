"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Menu, ChevronDown, BookOpen, LogIn, Sparkles } from "lucide-react"
import { SidebarSheet } from "./sidebar-sheet"
import { UserProfile } from "@/components/user-profile"
import { useAuth } from "@/hooks/use-auth"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import mysticalServices from "./mystical-services"

export function Navbar({ locale }: { locale: string }) {
    const t = useTranslations("Navbar")
    const [open, setOpen] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const [mysticalOpen, setMysticalOpen] = useState(false)
    const { user, loading } = useAuth()

    return (
        <nav className='fixed top-0 left-0 right-0 z-50 bg-card/5 backdrop-blur-sm border-b border-border/20'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                <div className='flex justify-between items-center h-16'>
                    {/* Left: Mobile menu button / Desktop brand */}
                    <div className='flex items-center'>
                        {/* Mobile: menu button */}
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
                            <div className='w-8 h-8 bg-gradient-to-br from-cosmic-purple to-cosmic-blue rounded-full flex items-center justify-center group-hover:scale-110 transition-transform'>
                                <span className='text-white font-bold text-sm'>
                                    ✦
                                </span>
                            </div>
                            <span className='font-playfair text-xl font-bold text-white group-hover:text-cosmic-purple transition-colors'>
                                Asking Fate
                            </span>
                        </Link>
                    </div>

                    {/* Right side: User Profile / Sign In button and Active Service Sheet */}
                    <div className='flex items-center space-x-6'>
                        <Link
                            href='/'
                            className='text-cosmic-light hover:text-white transition-colors'
                        >
                            Home
                        </Link>
                        <Link
                            href='/about'
                            className='text-cosmic-light hover:text-white transition-colors'
                        >
                            About
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
                                    <span>Tarot</span>
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
                                        <span>Tarot</span>
                                    </SheetTitle>
                                </SheetHeader>
                                <div className='mt-8 space-y-2'>
                                    {mysticalServices.map(
                                        ({ href, label, Icon, available }) => (
                                            <div key={label}>
                                                {available ? (
                                                    <Link
                                                        href={
                                                            label === "Tarot"
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
                                                            {label}
                                                        </span>
                                                    </Link>
                                                ) : (
                                                    <div className='flex items-center space-x-3 px-4 py-3 rounded-lg text-white/50 cursor-not-allowed opacity-60'>
                                                        <Icon className='h-5 w-5' />
                                                        <span className='font-medium'>
                                                            {label}
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
                    </div>
                </div>
            </div>

            {/* Mobile sidebar */}
            <SidebarSheet open={open} onOpenChange={setOpen} />
        </nav>
    )
}
