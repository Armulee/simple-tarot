"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Menu } from "lucide-react"
import { SidebarSheet } from "./sidebar-sheet"
import MysticalServicesSheet from "./mystical-services-sheet"
import { useTranslations } from 'next-intl'
import { useI18n } from '@/contexts/i18n-context'

export function Navbar() {
    const [open, setOpen] = useState(false)
    const [mysticalOpen, setMysticalOpen] = useState(false)
    const t = useTranslations()
    const { locale } = useI18n()

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
                            href={`/${locale}`}
                            className='hidden md:flex items-center space-x-2 group px-2 py-1 rounded-md hover:bg-white/5'
                        >
                            <div className='w-8 h-8 bg-gradient-to-br from-cosmic-purple to-cosmic-blue rounded-full flex items-center justify-center group-hover:scale-110 transition-transform'>
                                <span className='text-white font-bold text-sm'>
                                    ✦
                                </span>
                            </div>
                            <span className='font-playfair text-xl font-bold text-white group-hover:text-cosmic-purple transition-colors'>
                                {t('common.brandName')}
                            </span>
                        </Link>
                    </div>

                    {/* Right side: User Profile / Sign In button and Active Service Sheet */}
                    <div className='flex items-center space-x-6'>
                        <Link
                            href={`/${locale}`}
                            className='hidden md:block text-cosmic-light hover:text-white transition-colors'
                        >
                            {t('common.home')}
                        </Link>
                        <Link
                            href={`/${locale}/about`}
                            className='hidden md:block text-cosmic-light hover:text-white transition-colors'
                        >
                            {t('common.about')}
                        </Link>
                        <MysticalServicesSheet
                            mysticalOpen={mysticalOpen}
                            setMysticalOpen={setMysticalOpen}
                        />
                    </div>
                </div>
            </div>

            {/* Mobile sidebar */}
            <SidebarSheet open={open} onOpenChange={setOpen} />
        </nav>
    )
}
