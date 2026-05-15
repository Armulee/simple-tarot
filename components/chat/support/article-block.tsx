"use client"

import type { SupportBlockPayload } from "@/components/chat/types"
import { PageBlock } from "./page-block"

export function ArticleBlock({
    payload,
}: {
    payload: Extract<SupportBlockPayload, { kind: "article" }>
}) {
    return <PageBlock payload={payload} ctaLabel='Read article' />
}
