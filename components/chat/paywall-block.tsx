"use client"

import { useLocale, useTranslations } from "next-intl"
import type { PaywallNotice } from "@/components/chat/types"
import { PaywallBody } from "@/components/ui/paywall-dialog"

type PaywallBlockProps = {
    data: PaywallNotice
}

export default function PaywallBlock({ data }: PaywallBlockProps) {
    const t = useTranslations("HoroscopeChat")
    const locale = useLocale()
    const upgradeHref = `/${locale}/billing`

    const title =
        data.reason === "other_person"
            ? t("paywallOtherPersonTitle")
            : t("paywallOtherPersonTitle")
    const body =
        data.reason === "other_person"
            ? t("paywallOtherPersonBody")
            : t("paywallOtherPersonBody")

    return (
        <PaywallBody
            tone='danger'
            title={title}
            body={body}
            actions={[
                {
                    key: "upgrade",
                    label: t("paywallUpgradeCta"),
                    href: upgradeHref,
                },
            ]}
        />
    )
}
