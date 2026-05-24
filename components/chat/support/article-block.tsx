"use client"

import { useTranslations } from "next-intl"
import type { SupportBlockPayload } from "@/components/chat/types"
import { PageBlock } from "./page-block"

export function ArticleBlock({
    payload,
}: {
    payload: Extract<SupportBlockPayload, { kind: "article" }>
}) {
    const t = useTranslations("SupportBlock")
    return <PageBlock payload={payload} ctaLabel={t("readArticle")} />
}
