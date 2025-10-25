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
    return (
        <AccordionItem className='rounded-xl border border-border/20 bg-card/10 px-2'>
            <AccordionTrigger className='px-2'>
                <div className='flex items-center gap-3'>
                    <span
                        className={`h-8 w-8 rounded-full flex items-center justify-center border ${
                            firstLoginBonusGranted
                                ? "bg-green-500/20 border-green-400/40 text-green-300"
                                : "bg-white/10 border-white/20 text-white/80"
                        }`}
                    >
                        {firstLoginBonusGranted ? (
                            <Check className='w-4 h-4' />
                        ) : (
                            <Gift className='w-4 h-4' />
                        )}
                    </span>
                    <span className='text-white'>{t("title")}</span>
                    <span className='ml-2 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-500/30 text-yellow-300 flex items-center gap-1'>
                        <Star className='w-3.5 h-3.5' fill='currentColor' />
                        12
                    </span>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <div className='space-y-3 p-4 rounded-lg bg-card/20 border border-border/20'>
                    <p>{t("description", { cap: refillCap })}</p>
                    {!(user && firstLoginBonusGranted) && (
                        <Link
                            href={`/signin?callbackUrl=${encodeURIComponent(
                                pathname || "/stars"
                            )}`}
                        >
                            <Button className='rounded-full'>
                                {t("button")}
                            </Button>
                        </Link>
                    )}
                </div>
            </AccordionContent>
        </AccordionItem>
    )
}
