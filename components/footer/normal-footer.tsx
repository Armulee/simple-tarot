import Link from "next/link"
import Image from "next/image"

export default function NormalFooter() {
    return (
        <footer className='w-full z-10 bg-background/95 backdrop-blur-sm border-t border-border/30'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12'>
                {/* Main Footer Content */}
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8'>
                    {/* Brand Section */}
                    <div className='lg:col-span-2'>
                        <Link
                            href='/'
                            className='flex items-center space-x-2 group mb-4'
                        >
                            <Image
                                src='/assets/logo.png'
                                alt='Asking Fate logo'
                                width={32}
                                height={32}
                                className='rounded-md object-contain group-hover:scale-110 transition-transform'
                            />
                            <span className='font-serif font-semibold text-primary text-xl transition-colors'>
                                Asking Fate
                            </span>
                        </Link>
                        <p className='text-muted-foreground text-sm max-w-md leading-relaxed'>
                            Discover your destiny through mystical tarot readings and cosmic guidance. 
                            Ask the cards and unlock the secrets of your future.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className='font-semibold text-foreground mb-4 text-sm'>Quick Links</h3>
                        <ul className='space-y-3'>
                            <li>
                                <Link
                                    href='/'
                                    className='text-muted-foreground hover:text-foreground transition-colors text-sm'
                                >
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href='/about'
                                    className='text-muted-foreground hover:text-foreground transition-colors text-sm'
                                >
                                    About
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href='/pricing'
                                    className='text-muted-foreground hover:text-foreground transition-colors text-sm'
                                >
                                    Pricing
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href='/articles'
                                    className='text-muted-foreground hover:text-foreground transition-colors text-sm'
                                >
                                    Articles & Guides
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support & Legal */}
                    <div>
                        <h3 className='font-semibold text-foreground mb-4 text-sm'>Support & Legal</h3>
                        <ul className='space-y-3'>
                            <li>
                                <Link
                                    href='/contact'
                                    className='text-muted-foreground hover:text-foreground transition-colors text-sm'
                                >
                                    Contact & Support
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href='/privacy-policy'
                                    className='text-muted-foreground hover:text-foreground transition-colors text-sm'
                                >
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href='/terms-of-service'
                                    className='text-muted-foreground hover:text-foreground transition-colors text-sm'
                                >
                                    Terms of Service
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className='pt-6 border-t border-border/30'>
                    <div className='flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0'>
                        <div className='text-xs text-muted-foreground text-center sm:text-left'>
                            © 2025 Asking Fate. All rights reserved.
                        </div>
                        <div className='flex items-center space-x-4 text-xs text-muted-foreground'>
                            <span>Made with ✨ for seekers of truth</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
