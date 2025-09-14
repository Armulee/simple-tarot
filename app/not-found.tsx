import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
    title: "Page Not Found - 404 | Asking Fate",
    description:
        "The page you&apos;re looking for doesn&apos;t exist. Return to our AI tarot reading homepage to continue your spiritual journey.",
    robots: "noindex, nofollow",
}

export default function NotFound() {
    return (
        <div className='relative overflow-hidden pt-8'>
            <div className='relative z-10 max-w-2xl mx-auto px-6 text-center'>
                <div className='space-y-5'>
                    {/* 404 Icon */}
                    <div className='w-24 h-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center'>
                        <span className='text-primary font-serif font-bold text-4xl'>
                            ✦
                        </span>
                    </div>

                    {/* Error Message */}
                    <div className='space-y-4'>
                        <h1 className='font-serif font-bold text-6xl text-foreground'>
                            404
                        </h1>
                        <h2 className='font-serif font-bold text-3xl text-foreground'>
                            Page Not Found
                        </h2>
                        <p className='text-muted-foreground max-w-lg mx-auto'>
                            The cosmic path you&apos;re seeking has vanished
                            into the stars. Let&apos;s guide you back to your
                            spiritual journey.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                        <Button
                            asChild
                            size='lg'
                            className='bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg card-glow'
                        >
                            <Link href='/'>Start a Reading</Link>
                        </Button>
                    </div>

                    {/* Helpful Links */}
                    <div className='pt-5 border-t border-border/20'>
                        <p className='text-muted-foreground mb-4'>
                            Looking for something specific?
                        </p>
                        <div className='flex flex-wrap justify-center gap-4 text-sm'>
                            <Link
                                href='/about'
                                className='text-primary hover:text-primary/80 transition-colors'
                            >
                                About Us
                            </Link>
                            <Link
                                href='/contact'
                                className='text-primary hover:text-primary/80 transition-colors'
                            >
                                Contact Support
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
