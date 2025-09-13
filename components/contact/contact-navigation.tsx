"use client"

import Link from "next/link"

export default function ContactNavigation() {
    return (
        <nav className='relative z-10 flex items-center justify-between p-6 backdrop-blur-sm bg-card/10 border-b border-border/20'>
            <Link href='/' className='flex items-center space-x-2'>
                <div className='w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center'>
                    <span className='text-primary font-serif font-bold'>
                        ✦
                    </span>
                </div>
                <h1 className='font-serif font-bold text-xl text-foreground'>
                    Asking Fate
                </h1>
            </Link>

            <div className='flex items-center space-x-4'>
                <Link
                    href='/'
                    className='text-muted-foreground hover:text-foreground transition-colors'
                >
                    Back to Home
                </Link>
            </div>
        </nav>
    )
}