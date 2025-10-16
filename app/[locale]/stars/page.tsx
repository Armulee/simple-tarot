import { Button } from "@/components/ui/button"
import {
    Star,
    Share2,
    Users,
    Megaphone,
    Sparkles,
    Zap,
    Gift,
    Heart,
    Crown,
} from "lucide-react"
import Link from "next/link"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import StarsBalance from "@/components/stars/balance"
import OneTapTopUp from "@/components/stars/one-tap-top-up"
import SignInAccordion from "@/components/stars/sign-in-accordion"
import { Checkout } from "@/components/checkout"
import SubscribeDropdown from "@/components/stars/subscribe-dropdown"

export default function StarsPage() {
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
                            <span>Stars System</span>
                        </div>
                    </div>

                    {/* Balance Card - Enhanced */}
                    <div className='mb-8'>
                        <StarsBalance />
                    </div>

                    {/* Subscribe Section - Moved to Top */}
                    <div className='mb-12'>
                        <div className='text-center mb-6'>
                            <h2 className='text-2xl font-serif font-semibold text-white mb-2'>
                                Quick stars Top-up
                            </h2>
                            <p className='text-gray-400'>
                                Need stars instantly? Choose your cosmic energy
                                pack
                            </p>
                        </div>
                        {/* Feature highlights */}
                        <div className='mb-4 flex flex-wrap justify-center gap-4 text-sm text-gray-400'>
                            <div className='flex items-center gap-2'>
                                <Star
                                    className='w-4 h-4 text-yellow-400'
                                    fill='currentColor'
                                />
                                <span>Unlimited readings</span>
                            </div>
                            <div className='flex items-center gap-2'>
                                <Zap className='w-4 h-4 text-yellow-400' />
                                <span>Premium features</span>
                            </div>
                            <div className='flex items-center gap-2'>
                                <Crown className='w-4 h-4 text-yellow-400' />
                                <span>Priority support</span>
                            </div>
                        </div>

                        {/* Subscribe Button */}
                        <div className='relative mb-4'>
                            <Checkout
                                mode='subscribe'
                                plan='monthly'
                                customTrigger={
                                    <button
                                        type='button'
                                        className='group relative w-full mx-auto rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black border border-yellow-500/40 hover:from-yellow-300 hover:via-amber-400 hover:to-orange-400 transition-all duration-300 px-8 py-4 text-lg font-bold flex items-center justify-center gap-3 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/30'
                                    >
                                        {/* Animated background glow */}
                                        <div className='absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl' />

                                        {/* Content */}
                                        <div className='relative z-10 flex items-center gap-3'>
                                            <Crown className='w-6 h-6 text-black group-hover:scale-110 transition-transform duration-300' />
                                            <span>Subscribe (Unlimited)</span>
                                            <SubscribeDropdown />
                                        </div>

                                        {/* Premium badge */}
                                        <div className='absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center'>
                                            <Crown className='w-3 h-3 text-white' />
                                        </div>
                                    </button>
                                }
                            />
                        </div>

                        <OneTapTopUp />
                    </div>
                </div>
            </section>

            {/* Ways to Earn Section */}
            <section className='relative px-4 pb-12'>
                <div className='max-w-lg mx-auto'>
                    <div className='text-center mb-8'>
                        <div className='inline-flex items-center gap-2 mb-4'>
                            <Zap className='w-6 h-6 text-yellow-400' />
                            <h2 className='text-3xl font-serif font-bold text-white'>
                                Ways to Earn Stars
                            </h2>
                            <Zap className='w-6 h-6 text-yellow-400' />
                        </div>
                        <p className='text-gray-300 max-w-2xl mx-auto'>
                            Explore multiple paths to accumulate cosmic energy
                            and unlock deeper mystical experiences
                        </p>
                    </div>

                    <Accordion className='space-y-4'>
                        <SignInAccordion />

                        {/* Purchase Stars */}
                        <AccordionItem className='group relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-yellow-400/15 via-amber-500/15 to-yellow-600/15 px-4 py-2 card-glow hover:from-yellow-400/20 hover:via-amber-500/20 hover:to-yellow-600/20 transition-all duration-300'>
                            <AccordionTrigger className='px-2 py-4 hover:no-underline'>
                                <div className='flex items-center gap-4 w-full'>
                                    <div className='relative'>
                                        <span className='h-12 w-12 rounded-full bg-gradient-to-r from-yellow-400/30 to-amber-500/30 border border-yellow-500/40 text-yellow-300 flex items-center justify-center group-hover:scale-110 transition-transform duration-300'>
                                            <Gift className='w-6 h-6' />
                                        </span>
                                        <div className='absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center'>
                                            <Star
                                                className='w-2.5 h-2.5 text-white'
                                                fill='currentColor'
                                            />
                                        </div>
                                    </div>
                                    <div className='flex-1 text-left'>
                                        <h3 className='text-lg font-semibold text-white group-hover:text-yellow-100 transition-colors'>
                                            Purchase Stars
                                        </h3>
                                        <p className='text-sm text-gray-300'>
                                            Instant cosmic energy for immediate
                                            use
                                        </p>
                                    </div>
                                    <span className='text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400/30 to-amber-500/30 border border-yellow-500/40 text-yellow-200 flex items-center gap-1.5 font-medium'>
                                        <Star
                                            className='w-3.5 h-3.5'
                                            fill='currentColor'
                                        />
                                        Instant
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className='px-2 pb-4'>
                                <div className='space-y-4 p-6 rounded-xl bg-gradient-to-br from-yellow-400/10 via-amber-500/10 to-yellow-600/10 border border-yellow-500/30 relative overflow-hidden'>
                                    <div className='pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-yellow-400/20 blur-3xl animate-pulse' />
                                    <div className='pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl animate-pulse delay-1000' />

                                    <div className='relative z-10'>
                                        <p className='text-gray-300 leading-relaxed mb-4'>
                                            Need stars instantly? Choose a plan that fits you.
                                        </p>
                                        <div className='flex flex-col sm:flex-row gap-3'>
                                            <Link href='/pricing' className='flex-1'>
                                                <Button
                                                    variant='outline'
                                                    className='w-full rounded-full border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 hover:border-yellow-400/60 py-3 transition-all duration-300'
                                                >
                                                    View Pricing
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Create Content */}
                        <AccordionItem className='group relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-400/15 via-pink-500/15 to-purple-600/15 px-4 py-2 hover:from-purple-400/20 hover:via-pink-500/20 hover:to-purple-600/20 transition-all duration-300'>
                            <AccordionTrigger className='px-2 py-4 hover:no-underline'>
                                <div className='flex items-center gap-4 w-full'>
                                    <div className='relative'>
                                        <span className='h-12 w-12 rounded-full bg-gradient-to-r from-purple-400/30 to-pink-500/30 border border-purple-500/40 text-purple-300 flex items-center justify-center group-hover:scale-110 transition-transform duration-300'>
                                            <Megaphone className='w-6 h-6' />
                                        </span>
                                        <div className='absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center'>
                                            <Star
                                                className='w-2.5 h-2.5 text-white'
                                                fill='currentColor'
                                            />
                                        </div>
                                    </div>
                                    <div className='flex-1 text-left'>
                                        <h3 className='text-lg font-semibold text-white group-hover:text-purple-100 transition-colors'>
                                            Create Content About Us
                                        </h3>
                                        <p className='text-sm text-gray-300'>
                                            Share your mystical experiences and
                                            earn rewards
                                        </p>
                                    </div>
                                    <span className='text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-400/30 to-pink-500/30 border border-purple-500/40 text-purple-200 flex items-center gap-1.5 font-medium'>
                                        <Star
                                            className='w-3.5 h-3.5'
                                            fill='currentColor'
                                        />
                                        15–50
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className='px-2 pb-4'>
                                <div className='space-y-4 p-6 rounded-xl bg-gradient-to-br from-purple-400/10 via-pink-500/10 to-purple-600/10 border border-purple-500/30 relative overflow-hidden'>
                                    <div className='pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-purple-400/20 blur-3xl animate-pulse' />
                                    <div className='pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-pink-400/15 blur-3xl animate-pulse delay-1000' />

                                    <div className='relative z-10'>
                                        <p className='text-gray-300 leading-relaxed mb-4'>
                                            Create content about us and get rewarded.
                                        </p>

                                        <div className='grid gap-3 mb-4'>
                                            <div className='flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10'>
                                                <div className='w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center'>
                                                    <span className='text-blue-300 text-sm font-bold'>
                                                        15
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className='text-white font-medium'>
                                                        Text article or blog
                                                        post
                                                    </p>
                                                    <p className='text-gray-400 text-sm'>
                                                        Share your insights in
                                                        writing
                                                    </p>
                                                </div>
                                            </div>
                                            <div className='flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10'>
                                                <div className='w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center'>
                                                    <span className='text-green-300 text-sm font-bold'>
                                                        25
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className='text-white font-medium'>
                                                        Image post (social
                                                        media)
                                                    </p>
                                                    <p className='text-gray-400 text-sm'>
                                                        Visual content with
                                                        captions
                                                    </p>
                                                </div>
                                            </div>
                                            <div className='flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10'>
                                                <div className='w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center'>
                                                    <span className='text-purple-300 text-sm font-bold'>
                                                        50
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className='text-white font-medium'>
                                                        Video content
                                                    </p>
                                                    <p className='text-gray-400 text-sm'>
                                                        YouTube, TikTok, or
                                                        Reels
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <p className='text-xs text-gray-400 mb-4 p-3 rounded-lg bg-white/5 border border-white/10'>
                                            💡 Share the public link to your
                                            content. We&apos;ll review and
                                            approve manually within 24-48 hours.
                                        </p>

                                        <div className='flex gap-3'>
                                        <Link href='/articles/create-content-about-us'>
                                            <Button
                                                variant='outline'
                                                className='w-full rounded-full border-purple-500/40 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400/60 py-3 transition-all duration-300'
                                            >
                                                Learn More
                                            </Button>
                                        </Link>
                                        <Link href='/stars/submit-content'>
                                            <Button
                                                variant='outline'
                                                className='w-full rounded-full border-purple-500/40 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400/60 py-3 transition-all duration-300'
                                            >
                                                Submit Content
                                            </Button>
                                        </Link>
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Share Reading */}
                        <AccordionItem className='group relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-400/15 via-cyan-500/15 to-blue-600/15 px-4 py-2 hover:from-blue-400/20 hover:via-cyan-500/20 hover:to-blue-600/20 transition-all duration-300'>
                            <AccordionTrigger className='px-2 py-4 hover:no-underline'>
                                <div className='flex items-center gap-4 w-full'>
                                    <div className='relative'>
                                        <span className='h-12 w-12 rounded-full bg-gradient-to-r from-blue-400/30 to-cyan-500/30 border border-blue-500/40 text-blue-300 flex items-center justify-center group-hover:scale-110 transition-transform duration-300'>
                                            <Share2 className='w-6 h-6' />
                                        </span>
                                        <div className='absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center'>
                                            <Star
                                                className='w-2.5 h-2.5 text-white'
                                                fill='currentColor'
                                            />
                                        </div>
                                    </div>
                                    <div className='flex-1 text-left'>
                                        <h3 className='text-lg font-semibold text-white group-hover:text-blue-100 transition-colors'>
                                            Share a Reading
                                        </h3>
                                        <p className='text-sm text-gray-300'>
                                            Spread the wisdom and earn cosmic
                                            energy
                                        </p>
                                    </div>
                                    <span className='text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-400/30 to-cyan-500/30 border border-blue-500/40 text-blue-200 flex items-center gap-1.5 font-medium'>
                                        <Star
                                            className='w-3.5 h-3.5'
                                            fill='currentColor'
                                        />
                                        1
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className='px-2 pb-4'>
                                <div className='space-y-4 p-6 rounded-xl bg-gradient-to-br from-blue-400/10 via-cyan-500/10 to-blue-600/10 border border-blue-500/30 relative overflow-hidden'>
                                    <div className='pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl animate-pulse' />
                                    <div className='pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl animate-pulse delay-1000' />

                                    <div className='relative z-10'>
                                        <p className='text-gray-300 leading-relaxed mb-4'>
                                            We grant +1 star for each unique visitor to your shared reading, up to 3 per day.
                                        </p>

                                        <Link href='/articles/share-rewards'>
                                            <Button
                                                variant='outline'
                                                className='w-full rounded-full border-blue-500/40 text-blue-300 hover:bg-blue-500/10 hover:border-blue-400/60 py-3 transition-all duration-300'
                                            >
                                                Learn More
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Refer Friend */}
                        <AccordionItem className='group relative overflow-hidden rounded-2xl border border-green-500/30 bg-gradient-to-r from-green-400/15 via-emerald-500/15 to-green-600/15 px-4 py-2 hover:from-green-400/20 hover:via-emerald-500/20 hover:to-green-600/20 transition-all duration-300'>
                            <AccordionTrigger className='px-2 py-4 hover:no-underline'>
                                <div className='flex items-center gap-4 w-full'>
                                    <div className='relative'>
                                        <span className='h-12 w-12 rounded-full bg-gradient-to-r from-green-400/30 to-emerald-500/30 border border-green-500/40 text-green-300 flex items-center justify-center group-hover:scale-110 transition-transform duration-300'>
                                            <Users className='w-6 h-6' />
                                        </span>
                                        <div className='absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center'>
                                            <Star
                                                className='w-2.5 h-2.5 text-white'
                                                fill='currentColor'
                                            />
                                        </div>
                                    </div>
                                    <div className='flex-1 text-left'>
                                        <h3 className='text-lg font-semibold text-white group-hover:text-green-100 transition-colors'>
                                            Refer a Friend
                                        </h3>
                                        <p className='text-sm text-gray-300'>
                                            Bring others to the cosmic journey
                                        </p>
                                    </div>
                                    <span className='text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-green-400/30 to-emerald-500/30 border border-green-500/40 text-green-200 flex items-center gap-1.5 font-medium'>
                                        <Star
                                            className='w-3.5 h-3.5'
                                            fill='currentColor'
                                        />
                                        5
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className='px-2 pb-4'>
                                <div className='space-y-4 p-6 rounded-xl bg-gradient-to-br from-green-400/10 via-emerald-500/10 to-green-600/10 border border-green-500/30 relative overflow-hidden'>
                                    <div className='pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-green-400/20 blur-3xl animate-pulse' />
                                    <div className='pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl animate-pulse delay-1000' />

                                    <div className='relative z-10'>
                                        <p className='text-gray-300 leading-relaxed mb-4'>
                                            You and your friend each earn 5 stars, max 10 friends/week. If 10 friends register in a week, you get a 10-star bonus. Stars grant when invited friends complete registration.
                                        </p>

                                        <div className='flex gap-3'>
                                        <Link href='/articles/referral-program'>
                                            <Button
                                                variant='outline'
                                                className='w-full rounded-full border-green-500/40 text-green-300 hover:bg-green-500/10 hover:border-green-400/60 py-3 transition-all duration-300'
                                            >
                                                Learn More
                                            </Button>
                                        </Link>
                                        <Link href='/referral'>
                                            <Button
                                                variant='outline'
                                                className='w-full rounded-full border-green-500/40 text-green-300 hover:bg-green-500/10 hover:border-green-400/60 py-3 transition-all duration-300'
                                            >
                                                View Referral Link
                                            </Button>
                                        </Link>
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </section>
        </div>
    )
}
