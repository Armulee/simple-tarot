"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useState } from "react"
import {
    Dialog,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { StarsDialog } from "../star-consent"
import { useTranslations } from "next-intl"
import { Sparkles } from "lucide-react"

type CheckoutMode = "pack" | "subscribe"

export function Checkout({
    mode,
    packId: _packId,
    plan: _plan,
    infinityTerm: _infinityTerm,
    customTrigger,
}: {
    mode: CheckoutMode
    packId?: string
    plan?: "monthly" | "annual"
    infinityTerm?: "month" | "year"
    customTrigger?: React.ReactNode
}) {
    const { user } = useAuth()
    const t = useTranslations("Checkout")
    const [open, setOpen] = useState(false)

    if (user) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {customTrigger ? (
                        <span
                            onClick={() => {
                                setOpen(true)
                            }}
                        >
                            {customTrigger}
                        </span>
                    ) : (
                        <Button
                            className={`w-full rounded-full bg-white text-black hover:brightness-90`}
                            onClick={() => {
                                setOpen(true)
                            }}
                        >
                            {mode === "pack" ? t("purchase") : t("subscribe")}
                        </Button>
                    )}
                </DialogTrigger>
                <StarsDialog className="relative max-w-lg w-[92vw] border border-yellow-400/20 overflow-x-hidden bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(234,179,8,0.35)]">
                    <DialogHeader className='mb-3'>
                        <DialogTitle className='text-yellow-300 font-serif text-xl'>
                            {t("checkout")}
                        </DialogTitle>
                    </DialogHeader>

                    <div className='space-y-6 py-6'>
                        <div className='flex flex-col items-center justify-center text-center space-y-4'>
                            <div className='w-16 h-16 rounded-full bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center'>
                                <Sparkles className='w-8 h-8 text-yellow-300' />
                            </div>
                            <div className='space-y-2'>
                                <h3 className='text-xl font-semibold text-white'>
                                    Star Purchase Coming Soon
                                </h3>
                                <p className='text-sm text-white/80 max-w-sm'>
                                    We&apos;re working on bringing you a seamless star purchase experience. 
                                    Stay tuned for updates!
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            className='w-full rounded-full bg-white text-black hover:brightness-95 hover:bg-yellow-400 hover:text-black'
                            onClick={() => setOpen(false)}
                        >
                            {t("done")}
                        </Button>
                    </DialogFooter>
                </StarsDialog>
            </Dialog>
        )
    }
    return customTrigger ? (
        <Link href={`/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
            <span>{customTrigger}</span>
        </Link>
    ) : (
        <Link href={`/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
            <Button
                className={`w-full rounded-full bg-white text-black hover:brightness-90`}
            >
                {t("signInToSubscribe")}
            </Button>
        </Link>
    )
}
