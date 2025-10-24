"use client"

import Link from "next/link"

export default function DiscoverHeader() {
    return (
        <div className='text-center space-y-6'>
            <h1 className='text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-white'>
                What is{" "}
                <span className='text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                    Asking Fate?
                </span>
            </h1>
            <p className='text-gray-300 max-w-3xl mx-auto'>
                We&apos;re revolutionizing spiritual guidance by combining
                ancient mystical wisdom with cutting-edge AI technology, making
                personalized insights accessible to everyone.
            </p>
            <div className='flex items-center justify-center gap-4 pt-2'>
                <Link
                    href='/about'
                    className='text-sm text-primary hover:underline underline-offset-4'
                >
                    Learn more on the About page
                </Link>
                <span className='text-gray-600'>•</span>
                <Link
                    href='/demo'
                    className='text-sm text-primary hover:underline underline-offset-4'
                >
                    Request a demo
                </Link>
            </div>
        </div>
    )
}
