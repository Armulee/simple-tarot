"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"

export default function DiscoverHeader() {
    const t = useTranslations("HomeDiscover")
    return (
        <div className='text-center space-y-6'>
            <h1 className='text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-white'>
                {t("whatIs")} {" "}
                <span className='text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                    {t("brand")}
                </span>
            </h1>
            <p className='text-gray-300 max-w-3xl mx-auto'>{t("tagline")}</p>
            <div className='flex items-center justify-center gap-4 pt-2'>
                <Link
                    href='/about'
                    className='text-sm text-primary hover:underline underline-offset-4'
                >
                    {t("learnMore")}
                </Link>
                <span className='text-gray-600'>•</span>
                <Link
                    href='/demo'
                    className='text-sm text-primary hover:underline underline-offset-4'
                >
                    {t("requestDemo")}
                </Link>
            </div>
        </div>
    )
}
