import { useTranslations } from "next-intl"

export default function NormalFooter() {
    const currentYear = new Date().getFullYear()
    const t = useTranslations("Footer")
    
    return (
        <footer className='w-full z-10'>
            <div className='max-w-6xl mx-auto px-6 pt-4 pb-12 lg:pb-6'>
                <div className='flex justify-center items-center'>
                    <div className='text-xs text-muted-foreground text-center'>
                        © {currentYear} {t("copyright")}
                    </div>
                </div>
            </div>
        </footer>
    )
}
