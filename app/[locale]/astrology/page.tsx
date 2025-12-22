import type { Metadata } from "next"
import HoroscopeForm from "@/components/horoscope/horoscope-form"

export const metadata: Metadata = {
    title: "Astrology",
    description:
        "Create a transit-based astrology reading using your birth information, transit information, and an optional question.",
}

export default function AstrologyPage() {
    return (
        <div className='min-h-[calc(100dvh-64px)] flex flex-col items-center justify-start py-10'>
            <HoroscopeForm />
        </div>
    )
}


