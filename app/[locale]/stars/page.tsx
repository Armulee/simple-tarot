import { Button } from "@/components/ui/button"
import { Star, Share2, Users, Megaphone } from "lucide-react"
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

export default function StarsPage() {
    return (
        <section className='relative z-10 max-w-4xl mx-auto px-6 py-10 space-y-4'>
            <StarsBalance />
            <OneTapTopUp />

            {/* Ways to earn - Accordion */}
            <div className='space-y-4 mt-6'>
                <h2 className='font-serif text-2xl font-semibold text-white text-center'>
                    Ways to earn stars
                </h2>
                <Accordion className='space-y-3'>
                    <SignInAccordion />
                    <AccordionItem className='relative overflow-hidden rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-400/15 to-yellow-600/15 px-2 card-glow'>
                        <AccordionTrigger className='px-2'>
                            <div className='flex items-center gap-3'>
                                <span className='h-8 w-8 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-500/30 text-yellow-300 flex items-center justify-center'>
                                    <Star
                                        className='w-4 h-4'
                                        fill='currentColor'
                                    />
                                </span>
                                <span className='text-white'>
                                    Purchase stars
                                </span>
                                <span className='ml-2 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-500/30 text-yellow-300 flex items-center gap-1'>
                                    <Star
                                        className='w-3.5 h-3.5'
                                        fill='currentColor'
                                    />
                                    Instant
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className='space-y-3 p-4 rounded-lg bg-card/20 border border-yellow-500/30 relative'>
                                <div className='pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-yellow-400/25 blur-3xl' />
                                <div className='pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl' />
                                <p>
                                    Need stars instantly? Buy star packs and use
                                    them right away.
                                </p>
                                <Link href='/stars/purchase'>
                                    <Button className='rounded-full'>
                                        Purchase Stars
                                    </Button>
                                </Link>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem className='rounded-xl border border-border/20 bg-card/10 px-2'>
                        <AccordionTrigger className='px-2'>
                            <div className='flex items-center gap-3'>
                                <span className='h-8 w-8 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center'>
                                    <Megaphone className='w-4 h-4' />
                                </span>
                                <span className='text-white'>
                                    Create content about us
                                </span>
                                <span className='ml-2 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-500/30 text-yellow-300 flex items-center gap-1'>
                                    <Star
                                        className='w-3.5 h-3.5'
                                        fill='currentColor'
                                    />
                                    15–50
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className='space-y-3 p-4 rounded-lg bg-card/20 border border-border/20'>
                                <ul className='list-disc list-inside space-y-1'>
                                    <li>
                                        Text article or blog post: +15 stars
                                    </li>
                                    <li>
                                        Image post (e.g. social media): +25
                                        stars
                                    </li>
                                    <li>
                                        Video content (YouTube/TikTok/Reels):
                                        +50 stars
                                    </li>
                                </ul>
                                <p className='text-xs'>
                                    Share the public link to your content. We
                                    will review and approve manually.
                                </p>
                                <Link href='/stars/submit-content'>
                                    <Button
                                        variant='outline'
                                        className='rounded-full'
                                    >
                                        Submit content
                                    </Button>
                                </Link>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem className='rounded-xl border border-border/20 bg-card/10 px-2'>
                        <AccordionTrigger className='px-2'>
                            <div className='flex items-center gap-3'>
                                <span className='h-8 w-8 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center'>
                                    <Share2 className='w-4 h-4' />
                                </span>
                                <span className='text-white'>
                                    Share a reading
                                </span>
                                <span className='ml-2 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-500/30 text-yellow-300 flex items-center gap-1'>
                                    <Star
                                        className='w-3.5 h-3.5'
                                        fill='currentColor'
                                    />
                                    1
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className='space-y-3 p-4 rounded-lg bg-card/20 border border-border/20'>
                                <p>
                                    Post or send your reading to earn +1 star.
                                </p>
                                <Link href='/'>
                                    <Button
                                        variant='outline'
                                        className='rounded-full'
                                    >
                                        Go to readings
                                    </Button>
                                </Link>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem className='rounded-xl border border-border/20 bg-card/10 px-2'>
                        <AccordionTrigger className='px-2'>
                            <div className='flex items-center gap-3'>
                                <span className='h-8 w-8 rounded-full bg-white/10 border border-white/20 text-white/80 flex items-center justify-center'>
                                    <Users className='w-4 h-4' />
                                </span>
                                <span className='text-white'>
                                    Refer a friend
                                </span>
                                <span className='ml-2 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-500/30 text-yellow-300 flex items-center gap-1'>
                                    <Star
                                        className='w-3.5 h-3.5'
                                        fill='currentColor'
                                    />
                                    5
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className='space-y-3 p-4 rounded-lg bg-card/20 border border-border/20'>
                                <p>
                                    You and your friend each get +5 stars when
                                    they join.
                                </p>
                                <Link href='/contact'>
                                    <Button
                                        variant='outline'
                                        className='rounded-full'
                                    >
                                        Get referral link
                                    </Button>
                                </Link>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </section>
    )
}
