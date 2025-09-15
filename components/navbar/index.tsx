"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Menu } from "lucide-react"
import { SidebarSheet } from "./sidebar-sheet"
import MysticalServicesSheet from "./mystical-services-sheet"
import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Check } from "lucide-react"
import { locales as supportedLocales } from "@/i18n/request"

export function Navbar() {
    const locale = useLocale()
    const t = useTranslations("Navbar")
    const [open, setOpen] = useState(false)
    const [mysticalOpen, setMysticalOpen] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

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
                                {t("brand")}
                            </span>
                        </Link>
                    </div>

                    {/* Right side: User Profile / Sign In button and Active Service Sheet */}
                    <div className='flex items-center gap-x-3'>
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
                        <MysticalServicesSheet
                            mysticalOpen={mysticalOpen}
                            setMysticalOpen={setMysticalOpen}
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size='sm'
                                    variant='outline'
                                    className='text-white cursor-pointer select-none'
                                    aria-label='Change language'
                                >
                                    {locale.toUpperCase()}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align='end'
                                className='min-w-32'
                            >
                                {supportedLocales.map((loc) => (
                                    <DropdownMenuItem
                                        key={loc}
                                        onClick={() =>
                                            router.replace(
                                                { pathname },
                                                { locale: loc }
                                            )
                                        }
                                        className='flex items-center justify-between'
                                    >
                                        <span>
                                            {loc === "en" ? "English" : "ไทย"}
                                        </span>
                                        {loc === locale && (
                                            <Check className='h-4 w-4' />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Mobile sidebar */}
            <SidebarSheet open={open} onOpenChange={setOpen} />
        </nav>
    )
}
