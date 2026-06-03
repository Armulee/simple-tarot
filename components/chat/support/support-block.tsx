"use client"

import type { SupportBlockPayload } from "@/components/chat/types"
import { PlanBlock } from "./plan-block"
import { StarPacksBlock } from "./star-packs-block"
import { ContactBlock } from "./contact-block"
import { TarotCardBlock } from "./tarot-card-block"
import { ArticleBlock } from "./article-block"
import { PageBlock } from "./page-block"
import { CalendarYearBlock } from "./calendar-year-block"

export function SupportBlock({ payload }: { payload: SupportBlockPayload }) {
    if (payload.kind === "plan") {
        return <PlanBlock payload={payload} />
    }
    if (payload.kind === "star-packs") {
        return <StarPacksBlock payload={payload} />
    }
    if (payload.kind === "contact") {
        return <ContactBlock payload={payload} />
    }
    if (payload.kind === "tarot-card") {
        return <TarotCardBlock payload={payload} />
    }
    if (payload.kind === "article") {
        return <ArticleBlock payload={payload} />
    }
    if (payload.kind === "calendar-year") {
        return <CalendarYearBlock payload={payload} />
    }
    return <PageBlock payload={payload} />
}
