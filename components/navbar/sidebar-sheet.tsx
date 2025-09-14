"use client"

import Link from "next/link"
import {
    Home,
    Info,
    ChevronDown,
    ChevronUp,
    Sparkles,
} from "lucide-react"
import { useState } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import mysticalServices from "./mystical-services"

interface SidebarSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SidebarSheet({ open, onOpenChange }: SidebarSheetProps) {
    const [mysticalOpen, setMysticalOpen] = useState(true)

    const sidebarLinks = [
        { href: "/", label: "Home", Icon: Home },
        { href: "/about", label: "About", Icon: Info },
    ] as const

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side='left'
                className='md:hidden bg-card/95 backdrop-blur-md border-border/30 w-72 max-w-[85vw]'
            >
                <SheetHeader>
                    <SheetTitle>
                        <Link
                            href='/'
                            onClick={() => onOpenChange(false)}
                            className='flex items-center space-x-2 group'
                        >
                            <div className='w-7 h-7 bg-gradient-to-br from-cosmic-purple to-cosmic-blue rounded-full flex items-center justify-center group-hover:scale-110 transition-transform'>
                                <span className='text-white font-bold text-xs'>
                                    ✦
                                </span>
                            </div>
                            <span className='font-playfair text-lg font-bold text-white group-hover:text-cosmic-purple transition-colors'>
                                Asking Fate
                            </span>
                        </Link>
                    </SheetTitle>
                </SheetHeader>
                <nav>
                    <ul className='flex flex-col space-y-1 p-1'>
                        {/* Start Reading Button */}
                        <li className='pb-2 border-b border-white/10 mb-2'>
                            <Link
                                href='/reading'
                                className='flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white/10 text-white/90 border border-white/10 hover:bg-white/15 transition'
                                onClick={() => onOpenChange(false)}
                            >
                                <Sparkles className='w-4 h-4' />
                                <span>Start Reading</span>
                            </Link>
                        </li>

                        {sidebarLinks.map(({ href, label, Icon }) => (
                            <li key={href}>
                                <Link
                                    href={href}
                                    className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors'
                                    onClick={() => onOpenChange(false)}
                                >
                                    <Icon className='w-4 h-4' />
                                    <span>{label}</span>
                                </Link>
                            </li>
                        ))}

                        {/* Active Service Dropdown */}
                        <li>
                            <button
                                onClick={() => setMysticalOpen(!mysticalOpen)}
                                className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors w-full'
                            >
                                <Sparkles className='w-4 h-4' />
                                <span>Services</span>
                                {mysticalOpen ? (
                                    <ChevronUp className='w-4 h-4 ml-auto' />
                                ) : (
                                    <ChevronDown className='w-4 h-4 ml-auto' />
                                )}
                            </button>
                            {mysticalOpen && (
                                <ul className='ml-4 mt-1 space-y-1'>
                                    {mysticalServices.map(
                                        ({ href, label, Icon, available }) => (
                                            <li key={label}>
                                                {available ? (
                                                    <Link
                                                        href={
                                                            label === "Tarot"
                                                                ? "/"
                                                                : href
                                                        }
                                                        className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors'
                                                        onClick={() =>
                                                            onOpenChange(false)
                                                        }
                                                    >
                                                        <Icon className='w-4 h-4' />
                                                        <span>{label}</span>
                                                    </Link>
                                                ) : (
                                                    <div className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light/50 cursor-not-allowed opacity-60'>
                                                        <Icon className='w-4 h-4' />
                                                        <span>{label}</span>
                                                        <span className='ml-auto text-xs bg-white/10 px-2 py-1 rounded-full'>
                                                            Coming Soon
                                                        </span>
                                                    </div>
                                                )}
                                            </li>
                                        )
                                    )}
                                </ul>
                            )}
                        </li>
                    </ul>
                </nav>
            </SheetContent>
        </Sheet>
    )
}
