import type { Metadata } from "next"
import { Card } from "@/components/ui/card"
import HoroscopeFormWithQuestion from "@/components/horoscope/horoscope-form-with-question"

export const metadata: Metadata = {
    title: "Horoscope - AI-Powered Astrology Reading | Asking Fate",
    description:
        "Get personalized horoscope readings based on your birth chart and transit positions. Ask any question and receive detailed astrological insights.",
    keywords:
        "horoscope, astrology, birth chart, transit chart, vedic astrology, lagna system, daily horoscope, astrological reading",
    openGraph: {
        title: "Horoscope - AI-Powered Astrology Reading",
        description:
            "Get personalized horoscope readings based on your birth chart and transit positions.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Horoscope - AI-Powered Astrology Reading",
        description:
            "Get personalized horoscope readings based on your birth chart and transit positions.",
    },
}

export default function HoroscopePage() {
    return (
        <div className='min-h-screen relative overflow-hidden'>
            <main className='relative z-10 max-w-3xl mx-auto px-6 py-16'>
                <div className='text-center space-y-6 mb-10'>
                    <h1 className='font-serif font-bold text-4xl md:text-5xl text-balance'>
                        Daily
                        <span className='block text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                            Horoscope
                        </span>
                    </h1>
                    <p className='text-lg text-muted-foreground max-w-2xl mx-auto text-pretty'>
                        Enter your birth details, transit date, and ask your question. Receive personalized horoscope readings based on real star positions using the Thai horoscope (Lagna system).
                    </p>
                </div>

                <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                    <HoroscopeFormWithQuestion />
                </Card>
            </main>
        </div>
    )
}
