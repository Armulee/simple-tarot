import { Sparkles } from "lucide-react"
import StarsBalance from "@/components/stars/balance"
import SubscribeSection from "@/components/stars/subscribe-section"
import WaysToEarn from "@/components/stars/ways-to-earn"
import { getTranslations } from "next-intl/server"

export default async function StarsPage() {
    const t = await getTranslations("StarsPage")
    return (
        <div className='relative min-h-screen'>
            {/* Hero Section */}
            <section className='relative overflow-hidden px-4 py-8 md:py-12'>
                {/* Animated background elements */}
                <div className='absolute inset-0 overflow-hidden'>
                    <div className='absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-yellow-400/20 to-amber-500/20 rounded-full blur-3xl animate-pulse' />
                    <div className='absolute top-40 right-16 w-24 h-24 bg-gradient-to-r from-purple-400/15 to-pink-500/15 rounded-full blur-2xl animate-pulse delay-1000' />
                    <div className='absolute bottom-20 left-1/4 w-40 h-40 bg-gradient-to-r from-blue-400/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000' />
                </div>

                <div className='relative z-10 max-w-4xl mx-auto'>
                    {/* Hero Content */}
                    <div className='text-center space-y-6 mb-6'>
                        <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400/20 to-amber-500/20 border border-yellow-500/30 text-yellow-200 text-sm font-medium'>
                            <Sparkles className='w-4 h-4 animate-pulse' />
                            <span>{t("hero.badge")}</span>
                        </div>
                    </div>

                    {/* Balance Card - Enhanced */}
                    <div className='mb-8'>
                        <StarsBalance />
                    </div>

                    {/* Subscribe Section - Moved to Top */}
                    <SubscribeSection />
                </div>
            </section>

            {/* Ways to Earn Section */}
            <WaysToEarn />
        </div>
    )
}
