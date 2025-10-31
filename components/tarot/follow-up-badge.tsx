"use client"

import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"
import { useTarot } from "@/contexts/tarot-context"

export default function FollowUpBadge({ show }: { show?: boolean }) {
    const { isFollowUp } = useTarot()
    const t = useTranslations("ReadingPage")

    const shouldShow = typeof show === "boolean" ? show : isFollowUp
    if (!shouldShow) return null

    return (
        <Badge
            variant='secondary'
            className='absolute -top-6 -left-8 -rotate-12 bg-primary/20 text-white border-white/30'
        >
            {t("followUp.badge")}
        </Badge>
    )
}
