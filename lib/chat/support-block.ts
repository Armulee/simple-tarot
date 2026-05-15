/**
 * Build a concrete SupportBlockPayload from a chat decision + the user
 * question. Resolves tarot cards from the user message when the model did not
 * provide a slug, and falls back to a generic page block otherwise.
 */

import type { ChatDecision, SupportBlockPayload } from "@/components/chat/types"
import { TAROT_CARDS } from "@/lib/tarot/cards"
import {
    getSupportTopicMeta,
    matchSupportTopicLocally,
    matchTarotCardSlug,
    type SupportTopic,
    type SupportTopicMeta,
} from "./support-topics"

function findCardBySlug(slug: string | undefined | null) {
    if (!slug) return null
    const normalized = slug.toLowerCase().trim()
    return (
        TAROT_CARDS.find((c) => c.slug === normalized) ??
        TAROT_CARDS.find((c) => c.name.toLowerCase() === normalized) ??
        null
    )
}

function buildBlockFromMeta(
    meta: SupportTopicMeta,
    options: { question: string; supportCardSlug?: string | null } = {
        question: "",
    },
): SupportBlockPayload {
    const base = {
        topic: meta.topic,
        href: meta.href,
        title: meta.title,
        description: meta.description,
    }

    if (meta.block === "tarot-card") {
        const slug =
            findCardBySlug(options.supportCardSlug ?? undefined)?.slug ??
            matchTarotCardSlug(options.question ?? "")
        const card = findCardBySlug(slug)
        if (!card) {
            return {
                kind: "page",
                ...base,
                href: "/articles/tarot",
                title: "Tarot card meanings",
                description:
                    "Browse all 78 cards — Major Arcana and the four Minor Arcana suits.",
                iconId: meta.iconId,
            }
        }
        return {
            kind: "tarot-card",
            ...base,
            href: `/articles/tarot/${card.slug}`,
            title: card.name,
            description: card.description,
            cardSlug: card.slug,
            cardName: card.name,
            arcana: card.arcana,
            suit: card.suit,
            uprightKeywords: card.uprightKeywords,
            reversedKeywords: card.reversedKeywords,
        }
    }

    if (meta.block === "plan") {
        return { kind: "plan", ...base }
    }
    if (meta.block === "star-packs") {
        return { kind: "star-packs", ...base }
    }
    if (meta.block === "contact") {
        return { kind: "contact", ...base }
    }
    if (meta.block === "article") {
        return {
            kind: "article",
            ...base,
            iconId: meta.iconId,
        }
    }
    return {
        kind: "page",
        ...base,
        iconId: meta.iconId,
    }
}

export function buildSupportBlockFromDecision(
    decision: ChatDecision,
    question: string,
): SupportBlockPayload | null {
    if (decision.type !== "support") return null
    const topic = resolveTopicFromDecision(decision, question)
    if (!topic) return null
    const meta = getSupportTopicMeta(topic)
    if (!meta) return null
    return buildBlockFromMeta(meta, {
        question,
        supportCardSlug: decision.supportCardSlug,
    })
}

export function resolveTopicFromDecision(
    decision: ChatDecision,
    question: string,
): SupportTopic | null {
    if (decision.supportTopic) {
        const meta = getSupportTopicMeta(decision.supportTopic)
        if (meta) return meta.topic
    }
    return matchSupportTopicLocally(question)
}
