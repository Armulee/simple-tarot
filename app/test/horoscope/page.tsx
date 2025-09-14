import type { Metadata } from "next"
import { Card } from "@/components/ui/card"
import HoroscopeForm from "@/components/horoscope/horoscope-form"

export const metadata: Metadata = {
    title: "Horoscope - Generate Vedic Birth Chart | Asking Fate",
    description:
        "Enter your birth details to generate a beautiful Vedic birth chart with planetary positions and ascendant.",
    keywords:
        "vedic horoscope, birth chart, planetary positions, ascendant, lagna, astrology, natal chart",
    openGraph: {
        title: "Horoscope - Vedic Birth Chart",
        description:
            "Generate your Vedic birth chart with planetary positions and ascendant.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Horoscope - Vedic Birth Chart",
        description:
            "Generate your Vedic birth chart with planetary positions and ascendant.",
    },
}

export default function HoroscopePage() {
    return (
        <div className='min-h-screen relative overflow-hidden'>
            <main className='relative z-10 max-w-3xl mx-auto px-6 py-16'>
                <div className='text-center space-y-6 mb-10'>
                    <h1 className='font-serif font-bold text-4xl md:text-5xl text-balance'>
                        Discover Your
                        <span className='block text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                            Cosmic Blueprint
                        </span>
                    </h1>
                    <p className='text-lg text-muted-foreground max-w-2xl mx-auto text-pretty'>
                        Enter your birth date, time, and location. We will
                        auto-detect your timezone and current location to help
                        you generate a precise Vedic birth chart.
                    </p>
                </div>

                <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                    <HoroscopeForm />
                </Card>
            </main>
        </div>
    )
}
