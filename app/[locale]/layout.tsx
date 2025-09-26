import type React from "react"
import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import { Playfair_Display, Source_Sans_3 } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { TarotProvider } from "@/contexts/tarot-context"
import { StarsProvider } from "@/contexts/stars-context"
import { AuthProvider } from "@/contexts/auth-context"
import { Navbar } from "@/components/navbar"
import "./globals.css"
import Footer from "@/components/footer"
import CosmicStars from "@/components/cosmic-stars"
import { Toaster } from "sonner"
import { hasLocale } from "next-intl"
import { routing } from "@/i18n/routing"
import { notFound } from "next/navigation"
import { getMessages, getTranslations } from "next-intl/server"
import Script from "next/script"
import CookieConsentOverlay from "@/components/cookie-consent"

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
    return {
        title: t("title"),
        description: t("description"),
        generator: "v0.app",
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
            "apple-mobile-web-app-status-bar-style": "black-translucent",
            "apple-mobile-web-app-title": "Asking Fate",
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
    const messages = await getMessages()
    if (!hasLocale(routing.locales, locale)) {
        notFound()
    }
    return (
        <html lang={locale}>
            <head>
                <meta
                    name='google-adsense-account'
                    content='ca-pub-9151677091179897'
                />
            </head>
            <body
                className={`font-sans ${sourceSans.variable} ${playfairDisplay.variable}`}
            >
                <CosmicStars />
                <NextIntlClientProvider messages={messages} locale={locale}>
                    <AuthProvider>
                        <StarsProvider>
                            <TarotProvider>
                                <div className='min-h-screen flex flex-col home-gradient'>
                                    <Navbar locale={locale} />
                                    <main className='pt-16 md:min-h-[calc(100dvh-65px)] min-h-[calc(100dvh-65px-4rem)] relative overflow-hidden'>
                                        <Suspense fallback={null}>
                                            {children}
                                        </Suspense>
                                    </main>
                                    <Footer />
                                </div>
                            </TarotProvider>
                        </StarsProvider>
                    </AuthProvider>
                </NextIntlClientProvider>
                <Analytics />
                <Toaster
                    position='top-center'
                    theme='dark'
                    richColors
                    closeButton
                />

                <Script
                    type='text/javascript'
                    src='https://cdn.applixir.com/applixir.app.v6.0.1.js'
                />
                <CookieConsentOverlay />
            </body>
        </html>
    )
}
