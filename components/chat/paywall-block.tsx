"use client"

import { useState } from "react"
import { HeartHandshake } from "lucide-react"
import { useTranslations } from "next-intl"

import type { PaywallNotice } from "@/components/chat/types"
import { PaywallDialog } from "@/components/subscription/paywall-dialog"
import { PaywallBody } from "@/components/ui/paywall-dialog"

type PaywallBlockProps = {
    data: PaywallNotice
}

export default function PaywallBlock({ data }: PaywallBlockProps) {
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

    return (
        <>
            <PaywallBody
                tone='danger'
                title={title}
                body={body}
                actions={[
                    {
                        key: "upgrade",
                        label: t("paywallUpgradeCta"),
                        onClick: () => setOpen(true),
                    },
                ]}
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
