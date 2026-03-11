"use client"

import { Check, Gift, Star } from "lucide-react"
import {
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "../ui/accordion"
import { useStars } from "@/contexts/stars-context"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { usePathname } from "next/navigation"
import { Button } from "../ui/button"
import { useTranslations } from "next-intl"

export default function SignInAccordion() {
    const { user } = useAuth()
    const pathname = usePathname()
    const { refillCap, firstLoginBonusGranted } = useStars()
    const t = useTranslations("SignInAccordion")
    const claimed = Boolean(user && firstLoginBonusGranted)
    return (
        <AccordionItem className='group relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-400/15 via-pink-500/15 to-fuchsia-500/15 px-4 py-2 hover:from-rose-400/20 hover:via-pink-500/20 hover:to-fuchsia-500/20 transition-all duration-300'>
            <AccordionTrigger className='px-2 py-4 hover:no-underline'>
                <div className='flex items-center gap-4 w-full'>
                    <div className='relative'>
                        <span
                            className={`h-12 w-12 rounded-full border flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${
                                claimed
                                    ? "bg-green-500/20 border-green-400/40 text-green-300"
                                    : "bg-gradient-to-r from-rose-500/30 via-pink-500/30 to-fuchsia-500/30 border-rose-500/40 text-rose-100"
                            }`}
                        >
                            {claimed ? (
                                <Check className='w-6 h-6' />
                            ) : (
                                <Gift className='w-6 h-6' />
                            )}
                        </span>
                        <div className='absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center'>
                            <Star
                                className='w-2.5 h-2.5 text-white'
                                fill='currentColor'
                            />
                        </div>
                    </div>
                    <div className='flex-1 text-left'>
                        <h3 className='text-lg font-semibold text-white group-hover:text-rose-100 transition-colors'>
                            {t("title")}
                        </h3>
                        <p className='text-sm text-gray-300'>
                            {claimed
                                ? "Your first-login stars are already active."
                                : "Unlock your starter stars and faster refills."}
                        </p>
                    </div>
                    <span className='text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-rose-400/30 via-pink-500/30 to-fuchsia-500/30 border border-rose-500/40 text-rose-200 flex items-center gap-1.5 font-medium'>
                        <Star className='w-3.5 h-3.5' fill='currentColor' />
                        +12
                    </span>
                </div>
            </AccordionTrigger>
            <AccordionContent className='px-2 pb-4'>
                <div className='space-y-4 p-6 rounded-xl bg-gradient-to-br from-rose-400/10 via-pink-500/10 to-fuchsia-500/10 border border-rose-500/30 relative overflow-hidden'>
                    <div className='pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-rose-400/20 blur-3xl animate-pulse' />
                    <div className='pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-fuchsia-400/15 blur-3xl animate-pulse delay-1000' />

                    <div className='relative z-10 space-y-4'>
                        <p className='text-gray-300 leading-relaxed'>
                            {t("description", { cap: refillCap })}
                        </p>
                        {!claimed && (
                            <Link
                                href={`/signin?callbackUrl=${encodeURIComponent(
                                    pathname || "/stars"
                                )}`}
                            >
                                <Button className='w-full rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-fuchsia-600 text-white hover:from-rose-300 hover:via-pink-400 hover:to-fuchsia-500 transition-all duration-300'>
                                    {t("button")}
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </AccordionContent>
        </AccordionItem>
    )
}
