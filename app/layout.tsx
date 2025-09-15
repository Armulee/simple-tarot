import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Source_Sans_3 } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { TarotProvider } from "@/contexts/tarot-context"
import "./globals.css"
import CosmicStars from "@/components/cosmic-stars"
import { Toaster } from "sonner"

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

export const metadata: Metadata = {
    title: "Asking Fate - AI-Powered Mystical Guidance",
    description:
        "Discover your destiny with AI-powered tarot card interpretations in a stunning cosmic experience",
    generator: "v0.app",
    other: {
        "apple-mobile-web-app-capable": "yes",
        "apple-mobile-web-app-status-bar-style": "black-translucent",
        "apple-mobile-web-app-title": "Asking Fate",
    },
}

export const viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#0a0a1a",
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html>
            <body
                className={`font-sans ${sourceSans.variable} ${playfairDisplay.variable}`}
            >
                <CosmicStars />

                <TarotProvider>
                    <div className='min-h-screen flex flex-col home-gradient'>
                        <main className='relative overflow-hidden'>
                            <Suspense fallback={null}>{children}</Suspense>
                        </main>
                    </div>
                </TarotProvider>
                <Analytics />
                <Toaster
                    position='top-center'
                    theme='dark'
                    richColors
                    closeButton
                />
            </body>
        </html>
    )
}
