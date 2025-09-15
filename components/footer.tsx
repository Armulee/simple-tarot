import Link from "next/link"
import { useTranslations } from 'next-intl'
import { useI18n } from '@/contexts/i18n-context'

export default function Footer() {
    const t = useTranslations()
    const { locale } = useI18n()
    return (
        <footer className='w-full z-10'>
            <div className='max-w-6xl mx-auto px-6 pt-4 pb-12 md:pb-6'>
                <div className='flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0'>
                    <Link
                        href={`/${locale}`}
                        className='flex items-center space-x-2 group'
                    >
                        <div className='w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center'>
                            <span className='text-primary font-serif text-sm group-hover:scale-110 transition-transform'>
                                ✦
                            </span>
                        </div>
                        <span className='font-serif font-semibold text-primary transition-colors'>
                            {t('common.brandName')}
                        </span>
                    </Link>
                    <div className='flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6'>
                        <div className='hidden md:grid grid-cols-2 md:flex md:space-x-6 gap-4 md:gap-0 text-sm text-muted-foreground text-center md:text-left'>
                            <Link
                                href={`/${locale}/privacy-policy`}
                                className='hover:text-foreground transition-colors'
                            >
                                {t('common.privacyPolicy')}
                            </Link>
                            <Link
                                href={`/${locale}/terms-of-service`}
                                className='hover:text-foreground transition-colors'
                            >
                                {t('common.termsOfService')}
                            </Link>
                        </div>
                        <div className='text-xs text-muted-foreground text-center md:text-right'>
                            © 2025 {t('common.brandName')}. {t('common.allRightsReserved')}.
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
