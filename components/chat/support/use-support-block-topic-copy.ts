"use client"

import { useTranslations } from "next-intl"
import type { SupportBlockPayload } from "@/components/chat/types"

/**
 * Localized title/description for support tool blocks. English fallbacks live
 * in `lib/chat/support-topics`; this hook overlays translations per locale.
 */
export function useSupportBlockTopicCopy(payload: SupportBlockPayload): {
    title: string
    description: string
} {
    const t = useTranslations("SupportBlock")

    if (
        payload.kind === "page" &&
        payload.topic === "tarot-card" &&
        payload.href === "/articles/tarot"
    ) {
        return {
            title: t("topics.tarot-card.indexListing.title"),
            description: t("topics.tarot-card.indexListing.description"),
        }
    }

    if (payload.kind === "tarot-card") {
        return { title: payload.title, description: payload.description }
    }

    return {
        title: t(`topics.${payload.topic}.title`),
        description: t(`topics.${payload.topic}.description`),
    }
}
