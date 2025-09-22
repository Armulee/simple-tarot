import { Card } from "@/components/ui/card"
import { Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useTranslations } from "next-intl"

export default function GoPremium() {
    const t = useTranslations("GoPremium")
    const { user } = useAuth()

    return (
        <>
            {/* Premium Upsell */}
            {process.env.NEXT_PUBLIC_ENABLED_AD === "true" && (
                <Card className='p-5 bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-indigo-500/10 backdrop-blur-sm border border-white/10'>
                    <div className='flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4'>
                        <div className='text-center sm:text-left'>
                            <div className='flex items-center justify-center sm:justify-start gap-2 text-white'>
                                <Crown className='w-5 h-5 text-sky-300' />
                                <span className='font-semibold'>
                                    {t('title')}
                                </span>
                            </div>
                            <p className='text-sm text-muted-foreground mt-1'>
                                {t('description')}
                            </p>
                        </div>
                        {user ? (
                            <Link href='/checkout?cycle=monthly'>
                                <Button className='group relative overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-semibold bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 hover:from-sky-500 hover:via-blue-500 hover:to-indigo-500 ring-1 ring-white/20 shadow-[0_8px_24px_rgba(59,130,246,0.35)] hover:shadow-[0_10px_28px_rgba(59,130,246,0.45)] transition-all duration-300'>
                                    <Crown className='w-4 h-4' />
                                    <span>{t('skipAds')}</span>
                                </Button>
                            </Link>
                        ) : (
                            <Link
                                href={`/signin?redirect=${encodeURIComponent(
                                    "/checkout?cycle=monthly"
                                )}`}
                            >
                                <Button
                                    variant='outline'
                                    className='flex items-center gap-2 px-5 py-2.5 rounded-full text-white border-white/20 hover:bg-white/10'
                                >
                                    <Crown className='w-4 h-4' />
                                    <span>{t('signInToUpgrade')}</span>
                                </Button>
                            </Link>
                        )}
                    </div>
                </Card>
            )}
        </>
    )
}
