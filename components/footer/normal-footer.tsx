import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"

export default function NormalFooter() {
    const currentYear = new Date().getFullYear()
    const t = useTranslations("Footer")
    const tSidebar = useTranslations("Sidebar")
    
    return (
        <footer className='w-full z-10'>
            <div className='max-w-6xl mx-auto px-6 pt-4 pb-12 lg:pb-6'>
                <div className='flex flex-col md:flex-row justify-between items-center gap-4'>
                    <div className='hidden md:flex gap-6 text-xs font-medium text-muted-foreground order-1 md:order-2'>
                        <Link href="/privacy-policy" className="hover:text-primary transition-colors">
                            {tSidebar("privacyPolicy")}
                        </Link>
                        <Link href="/terms-of-service" className="hover:text-primary transition-colors">
                            {tSidebar("termsOfService")}
                        </Link>
                        <Link href="/contact" className="hover:text-primary transition-colors">
                            {tSidebar("contactSupport")}
                        </Link>
                    </div>
                    <div className='text-xs text-muted-foreground text-center order-2 md:order-1'>
                        © {currentYear} {t("copyright")}
                    </div>
                </div>
            </div>
        </footer>
    )
}
