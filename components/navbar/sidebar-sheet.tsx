"use client"

import Link from "next/link"
import {
    Home,
    Info,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Shield,
    FileText,
} from "lucide-react"
import { useState } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import mysticalServices from "./mystical-services"
import { useTranslations } from "next-intl"

interface SidebarSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SidebarSheet({ open, onOpenChange }: SidebarSheetProps) {
    const t = useTranslations("Sidebar")
    const s = useTranslations("Services")
    const [mysticalOpen, setMysticalOpen] = useState(true)

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
                        <li>
                            <Link
                                href='/'
                                className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors'
                                onClick={() => onOpenChange(false)}
                            >
                                <Home className='w-4 h-4' />
                                <span>{t("home")}</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                href='/about'
                                className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors'
                                onClick={() => onOpenChange(false)}
                            >
                                <Info className='w-4 h-4' />
                                <span>{t("about")}</span>
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
                                        ({
                                            href,
                                            label,
                                            Icon,
                                            available,
                                            id,
                                        }) => (
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
                                href='/privacy-policy'
                                className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors'
                                onClick={() => onOpenChange(false)}
                            >
                                <Shield className='w-4 h-4' />
                                <span>{t("privacyPolicy")}</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                href='/terms-of-service'
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
