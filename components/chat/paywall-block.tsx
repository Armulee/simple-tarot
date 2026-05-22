"use client"

import { useState } from "react"
import { HeartHandshake, Lock, WandSparkles } from "lucide-react"
import { useTranslations } from "next-intl"

import type { PaywallNotice } from "@/components/chat/types"
import { PaywallDialog } from "@/components/subscription/paywall-dialog"
import { PaywallBody } from "@/components/ui/paywall-dialog"

type PaywallBlockProps = {
    data: PaywallNotice
    /**
     * Triggered when the user picks the "Draw a card instead" secondary
     * action. Wired through message-list → session so the chat re-runs
     * the rejected question through the regular tarot draw flow (and
     * flips interpretation mode horoscope → auto on the way).
     */
    onDrawCardInstead?: () => void
}

export default function PaywallBlock({
    data,
    onDrawCardInstead,
}: PaywallBlockProps) {
    const t = useTranslations("HoroscopeChat")
    const [open, setOpen] = useState(false)

    const title =
        data.reason === "other_person"
            ? t("paywallOtherPersonTitle")
            : t("paywallOtherPersonTitle")
    const body =
        data.reason === "other_person"
            ? t("paywallOtherPersonBody")
            : t("paywallOtherPersonBody")

    const actions: Array<{
        key: string
        label: string
        onClick: () => void
        icon?: React.ReactNode
    }> = [
        {
            key: "upgrade",
            label: t("paywallUpgradeCta"),
            onClick: () => setOpen(true),
        },
    ]
    if (onDrawCardInstead) {
        actions.push({
            key: "draw",
            label: t("paywallOtherPersonDrawCardCta"),
            onClick: onDrawCardInstead,
            icon: <WandSparkles className='h-3.5 w-3.5' />,
        })
    }

    return (
        <>
            <PaywallBody
                tone='premium'
                icon={<Lock className='h-3.5 w-3.5' />}
                title={title}
                body={body}
                actions={actions}
            />
            <PaywallDialog
                open={open}
                onOpenChange={setOpen}
                requiredTier={data.requiredTier}
                title={t("paywallOtherPersonPaywallTitle")}
                description={t("paywallOtherPersonPaywallDesc")}
                feature={t("paywallOtherPersonPaywallFeature")}
                insufficientLabel={t("paywallOtherPersonPaywallInsufficient")}
                footnote={t("paywallOtherPersonPaywallNote")}
                icon={<HeartHandshake className='h-6 w-6 text-indigo-300' />}
            />
        </>
    )
}
