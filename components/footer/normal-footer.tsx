import Link from "next/link"
import Image from "next/image"

export default function NormalFooter() {
    return (
        <footer className='w-full z-10'>
            <div className='max-w-6xl mx-auto px-6 pt-4 pb-12 md:pb-6'>
                <div className='flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0'>
                    <Link
                        href='/'
                        className='flex items-center space-x-2 group'
                    >
                        <Image
                            src='/assets/logo.png'
                            alt='Asking Fate logo'
                            width={24}
                            height={24}
                            className='rounded-md object-contain group-hover:scale-110 transition-transform'
                        />
                        <span className='font-serif font-semibold text-primary transition-colors'>
                            Asking Fate
                        </span>
                    </Link>
                    <div className='flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6'>
                        <div className='hidden md:flex gap-6 text-sm text-muted-foreground text-center md:text-left'>
                            <Link
                                href='/contact'
                                className='w-fit hover:text-foreground transition-colors'
                            >
                                Contact & Support
                            </Link>
                            <Link
                                href='/privacy-policy'
                                className='w-fit hover:text-foreground transition-colors'
                            >
                                Privacy Policy
                            </Link>
                            <Link
                                href='/terms-of-service'
                                className='w-fit hover:text-foreground transition-colors'
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
