"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

export default function Footer() {
    const router = useRouter()
    const handleBrandClick = () => router.push("/")
    return (
        <footer className='w-full z-10'>
            <div className='max-w-6xl mx-auto px-6 pt-4 pb-12 md:pb-6'>
                <div className='flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0'>
                    <button
                        type='button'
                        onClick={handleBrandClick}
                        className='flex items-center space-x-2 group'
                    >
                        <div className='w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center'>
                            <span className='text-primary font-serif text-sm group-hover:scale-110 transition-transform'>
                                ✦
                            </span>
                        </div>
                        <span className='font-serif font-semibold group-hover:text-primary transition-colors'>
                            Asking Fate
                        </span>
                    </button>
                    <div className='flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6'>
                        {/* Desktop only: Legal links */}
                        <div className='hidden md:flex md:space-x-6 text-sm text-muted-foreground'>
                            <Link
                                href='/privacy-policy'
                                className='hover:text-foreground transition-colors'
                            >
                                Privacy Policy
                            </Link>
                            <Link
                                href='/terms-of-service'
                                className='hover:text-foreground transition-colors'
                            >
                                Terms of Service
                            </Link>
                        </div>
                        <div className='text-xs text-muted-foreground text-center md:text-right'>
                            © 2025 Asking Fate. All rights reserved.
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
