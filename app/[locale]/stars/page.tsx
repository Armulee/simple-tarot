import { Sparkles } from "lucide-react"
import StarsBalance from "@/components/stars/balance"
import SubscribeSection from "@/components/stars/subscribe-section"
import WaysToEarn from "@/components/stars/ways-to-earn"
import { getTranslations } from "next-intl/server"

export default async function StarsPage() {
    const t = await getTranslations("StarsPage")
    return (
        <div className='relative min-h-screen overflow-hidden'>
            {/* Animated background elements */}
            <div className='fixed inset-0 overflow-hidden pointer-events-none'>
                <div className='absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-yellow-400/20 to-amber-500/20 rounded-full blur-3xl animate-pulse' />
                <div className='absolute top-40 right-16 w-24 h-24 bg-gradient-to-r from-purple-400/15 to-pink-500/15 rounded-full blur-2xl animate-pulse delay-1000' />
                <div className='absolute bottom-20 left-1/4 w-40 h-40 bg-gradient-to-r from-blue-400/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000' />
            </div>

            <div className='relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-12'>
                <div className='grid grid-cols-1 lg:grid-cols-6 gap-8 lg:gap-12 items-start'>
                    {/* Left Column: Balance & Subscribe */}
                    <div className='space-y-8 lg:col-span-4'>
                        {/* Hero Badge */}
                        <div className='text-center lg:text-left'>
                            <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400/20 to-amber-500/20 border border-yellow-500/30 text-yellow-200 text-sm font-medium'>
                                <Sparkles className='w-4 h-4 animate-pulse' />
                                <span>{t("hero.badge")}</span>
                            </div>
                        </div>

                        {/* Balance Card */}
                        <StarsBalance />

                        {/* Subscribe Section */}
                        <SubscribeSection />
                    </div>

                    {/* Right Column: Ways to Earn */}
                    <div className='lg:sticky lg:top-8 lg:col-span-2'>
                        <WaysToEarn />
                    </div>
                </div>
            </div>
        </div>
    )
}
