"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useTranslations } from "next-intl"
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { StarsDialog } from "../star-consent"

type CheckoutMode = "pack" | "subscribe"

type CheckoutProps = {
    mode: CheckoutMode
    packId?: string
    plan?: "monthly" | "annual"
    infinityTerm?: "month" | "year"
    customTrigger?: ReactNode
}

export function Checkout({ mode, customTrigger }: CheckoutProps) {
    const { user } = useAuth()
    const t = useTranslations("Checkout")
    const [open, setOpen] = useState(false)

    if (!user) {
        const signinHref = `/signin?callbackUrl=${encodeURIComponent("/pricing")}`
        return customTrigger ? (
            <Link href={signinHref}>
                <span>{customTrigger}</span>
            </Link>
        ) : (
            <Link href={signinHref}>
                <Button className='w-full rounded-full bg-white text-black hover:brightness-90'>
                    {t("signInToSubscribe")}
                </Button>
            </Link>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {customTrigger ? (
                    <span onClick={() => setOpen(true)}>{customTrigger}</span>
                ) : (
                    <Button
                        className='w-full rounded-full bg-white text-black hover:brightness-90'
                        onClick={() => setOpen(true)}
                    >
                        {mode === "pack" ? t("purchase") : t("subscribe")}
                    </Button>
                )}
            </DialogTrigger>
            <StarsDialog className='relative space-y-4'>
                <DialogHeader className='space-y-2'>
                    <DialogTitle className='text-yellow-300 font-serif text-xl'>
                        {t("comingSoonTitle")}
                    </DialogTitle>
                    <DialogDescription className='text-white/85'>
                        {t("comingSoonDescription")}
                    </DialogDescription>
                </DialogHeader>
                <p className='text-sm text-white/70 leading-relaxed'>
                    {t("comingSoonHelper")}
                </p>
                <DialogFooter>
                    <Button
                        className='w-full rounded-full bg-white text-black hover:brightness-95'
                        onClick={() => setOpen(false)}
                    >
                        {t("close")}
                    </Button>
                </DialogFooter>
            </StarsDialog>
        </Dialog>
    )
}
