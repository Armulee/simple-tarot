import type React from "react"
import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import { Playfair_Display, Source_Sans_3 } from "next/font/google"
import { Suspense } from "react"
import { TarotProvider } from "@/contexts/tarot-context"
import { StarsProvider } from "@/contexts/stars-context"
import { AuthProvider } from "@/contexts/auth-context"
import { Navbar } from "@/components/navbar"
import { DesktopSidebarShell } from "@/components/navbar/desktop-sidebar-shell"
import "../globals.css"
import Footer from "@/components/footer/footer"
import { CookiesBanner } from "@/components/cookies-banner"
import CosmicStars from "@/components/cosmic-stars"
import { Toaster } from "sonner"
import { BetaToaster } from "@/components/beta-toaster"
import { hasLocale } from "next-intl"
import { routing } from "@/i18n/routing"
import { notFound } from "next/navigation"
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server"
import { getMetadataBase, getSocialImageUrls } from "@/lib/seo"
import { ConsentAwareAnalytics } from "@/components/consent-aware-analytics"
// StarConsentProvider and ReferralProvider are composed inside StarsProvider

/* Updated fonts to match mystical design brief */
const playfairDisplay = Playfair_Display({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-playfair",
    weight: ["400", "600", "700"],
})

const sourceSans = Source_Sans_3({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-source-sans",
    weight: ["400", "500", "600"],
})

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Meta.Layout" })
    const baseUrl = getMetadataBase().toString().replace(/\/$/, "")
    const { ogImage, twitterImage } = getSocialImageUrls(locale)

    return {
        metadataBase: getMetadataBase(),
        title: t("title"),
        description: t("description"),
        keywords: t("keywords"),
        generator: "v0.app",
        openGraph: {
            type: "website",
            locale,
            url: baseUrl,
            siteName: "AskingFate",
            title: t("title"),
            description: t("description"),
            images: [
                {
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: t("title"),
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: t("title"),
            description: t("description"),
            images: [twitterImage],
        },
        icons: {
            icon: [
                {
                    url: "/favicon-16x16.png",
                    sizes: "16x16",
                    type: "image/png",
                },
                {
                    url: "/favicon-32x32.png",
                    sizes: "32x32",
                    type: "image/png",
                },
                { url: "/favicon.ico", sizes: "any" },
            ],
            apple: [
                {
                    url: "/apple-touch-icon.png",
                    sizes: "180x180",
                    type: "image/png",
                },
            ],
            other: [
                {
                    url: "/android-chrome-192x192.png",
                    sizes: "192x192",
                    type: "image/png",
                },
                {
                    url: "/android-chrome-512x512.png",
                    sizes: "512x512",
                    type: "image/png",
                },
            ],
        },
        other: {
            "apple-mobile-web-app-capable": "yes",
            "mobile-web-app-capable": "yes",
            "apple-mobile-web-app-status-bar-style": "black-translucent",
            "apple-mobile-web-app-title": "AskingFate",
        },
    }
}

export const viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#0a0a1a",
}

export default async function RootLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode
    params: Promise<{ locale: string }>
}>) {
    // Ensure that the incoming `locale` is valid
    const { locale } = await params
    if (!hasLocale(routing.locales, locale)) {
        notFound()
    }
    // Opt into static rendering: tell next-intl the locale up front so
    // getMessages()/getTranslations() don't read headers() (which would
    // force the whole [locale] subtree to render dynamically).
    setRequestLocale(locale)
    const messages = await getMessages()

    return (
        <html lang={locale}>
            <body
                className={`font-sans ${sourceSans.variable} ${playfairDisplay.variable}`}
            >
                <CosmicStars />
                <NextIntlClientProvider messages={messages} locale={locale}>
                    <AuthProvider>
                        <StarsProvider>
                            <TarotProvider>
                                <div className='min-h-screen flex flex-col home-gradient relative'>
                                    <Navbar locale={locale} />
                                    <DesktopSidebarShell>
                                        <main className='flex flex-1 flex-col pt-16 min-h-[calc(100dvh-64px)] relative min-h-0'>
                                            <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
                                                <Suspense fallback={null}>
                                                    <div className='flex min-h-0 flex-1 flex-col'>
                                                        {children}
                                                    </div>
                                                </Suspense>
                                            </div>
                                            <CookiesBanner />
                                        </main>
                                        <Footer />
                                    </DesktopSidebarShell>
                                </div>
                            </TarotProvider>
                        </StarsProvider>
                    </AuthProvider>
                    <BetaToaster />
                    <Toaster
                        position='bottom-center'
                        theme='dark'
                        richColors
                        closeButton
                    />
                </NextIntlClientProvider>
                <ConsentAwareAnalytics />
            </body>
        </html>
    )
}
