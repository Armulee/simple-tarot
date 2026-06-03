/**
 * Support topics surfaced by the chat decision engine.
 *
 * Whenever the user asks about a part of the AskingFate product (pricing,
 * contact, articles, tarot cards, account, etc.) the classifier emits a
 * `support` decision pointing at one of these topics. The client then resolves
 * the topic into a rich, in-session UI block ("tool block") that embeds a
 * snapshot of the destination page plus a CTA link to the full page.
 *
 * Adding a new topic only needs an entry in the `SUPPORT_TOPICS` map plus the
 * matching renderer in `components/chat/support`.
 */

import { TAROT_CARDS } from "@/lib/tarot/cards"

/** Identifier for a support topic the AI can pick. */
export type SupportTopic =
    | "pricing"
    | "star-packs"
    | "contact"
    | "help"
    | "faq"
    | "how-to-play"
    | "privacy-redaction"
    | "privacy-policy"
    | "terms-of-service"
    | "refer-a-friend"
    | "share-reading"
    | "create-content"
    | "tarot-card"
    | "tarot-cards-index"
    | "birth-chart"
    | "horoscope"
    | "calendar-year"
    | "account"
    | "settings"
    | "about"
    | "articles"
    | "sign-in"
    | "sign-up"

/** Tool block variants rendered inline in the chat for support answers. */
export type SupportBlockKind =
    | "plan"
    | "star-packs"
    | "contact"
    | "tarot-card"
    | "article"
    | "page"
    | "calendar-year"

export type SupportTopicMeta = {
    topic: SupportTopic
    /** Localized destination path (already prefixed by `/`; locale routing applied at render). */
    href: string
    /** Default headline used as a fallback when no translation is available. */
    title: string
    /** Default description used as a fallback when no translation is available. */
    description: string
    /** Block renderer to pick. Defaults to `"page"`. */
    block: SupportBlockKind
    /** Lucide icon name used by the page-block renderer when no richer block applies. */
    iconId?:
        | "sparkles"
        | "mail"
        | "help"
        | "faq"
        | "book"
        | "gamepad"
        | "share"
        | "users"
        | "shield"
        | "star"
        | "moon"
        | "user"
        | "settings"
        | "info"
        | "credit-card"
        | "compass"
        | "log-in"
        | "user-plus"
        | "calendar"
    /** Keywords used by the lightweight local fallback intent matcher. */
    keywords: readonly string[]
}

export const SUPPORT_TOPICS: Record<SupportTopic, SupportTopicMeta> = {
    pricing: {
        topic: "pricing",
        href: "/pricing",
        title: "Pricing plans",
        description:
            "Pick a Basic or Pro subscription, see monthly vs annual stars, and continue to checkout.",
        block: "plan",
        iconId: "credit-card",
        keywords: [
            "price",
            "pricing",
            "plan",
            "plans",
            "subscription",
            "subscribe",
            "cost",
            "tier",
            "premium",
            "upgrade",
            "billing",
            "monthly",
            "annual",
            "yearly",
        ],
    },
    "star-packs": {
        topic: "star-packs",
        href: "/stars",
        title: "Stars & add-on packs",
        description:
            "See your star balance, refill rules, and one-time add-on packs for Pro subscribers.",
        block: "star-packs",
        iconId: "star",
        keywords: [
            "stars",
            "star",
            "pack",
            "packs",
            "balance",
            "refill",
            "top up",
            "topup",
            "buy stars",
            "add-on",
            "addon",
        ],
    },
    contact: {
        topic: "contact",
        href: "/contact",
        title: "Contact support",
        description:
            "Send us a message. We typically reply within 1 business day at admin@askingfate.com.",
        block: "contact",
        iconId: "mail",
        keywords: [
            "contact",
            "support",
            "help me",
            "talk to human",
            "human",
            "email",
            "reach out",
            "report bug",
            "issue",
            "problem",
            "complaint",
        ],
    },
    help: {
        topic: "help",
        href: "/articles/help-support",
        title: "Help & support",
        description:
            "Common troubleshooting for accounts, readings, billing, and stars.",
        block: "article",
        iconId: "help",
        keywords: [
            "help",
            "support article",
            "troubleshoot",
            "fix",
            "broken",
            "not working",
        ],
    },
    faq: {
        topic: "faq",
        href: "/articles/faq",
        title: "Frequently asked questions",
        description:
            "Quick answers about readings, stars, accuracy, and billing.",
        block: "article",
        iconId: "faq",
        keywords: ["faq", "questions", "common", "answers"],
    },
    "how-to-play": {
        topic: "how-to-play",
        href: "/articles/how-to-play",
        title: "How to play",
        description:
            "Ask a question, pick cards, and reflect on the meaning — step by step.",
        block: "article",
        iconId: "gamepad",
        keywords: [
            "how to use",
            "how do i play",
            "how to play",
            "how does it work",
            "how it works",
            "guide",
            "tutorial",
            "beginner",
            "getting started",
        ],
    },
    "privacy-redaction": {
        topic: "privacy-redaction",
        href: "/articles/privacy-redaction",
        title: "Privacy & PII redaction",
        description:
            "How AskingFate detects and removes personal details from your prompts.",
        block: "article",
        iconId: "shield",
        keywords: [
            "privacy",
            "pii",
            "redaction",
            "personal information",
            "redact",
            "anonymous",
            "anonymise",
        ],
    },
    "privacy-policy": {
        topic: "privacy-policy",
        href: "/privacy-policy",
        title: "Privacy policy",
        description: "How we collect, use, and protect your data.",
        block: "page",
        iconId: "shield",
        keywords: ["privacy policy", "data", "data protection", "gdpr"],
    },
    "terms-of-service": {
        topic: "terms-of-service",
        href: "/terms-of-service",
        title: "Terms of service",
        description: "Our terms, acceptable use, and payment policy.",
        block: "page",
        iconId: "info",
        keywords: ["terms", "tos", "rules", "policy"],
    },
    "refer-a-friend": {
        topic: "refer-a-friend",
        href: "/articles/refer-a-friend",
        title: "Refer a friend",
        description:
            "Invite friends to AskingFate. You both earn stars when they join.",
        block: "article",
        iconId: "users",
        keywords: [
            "refer",
            "referral",
            "invite friend",
            "invite a friend",
            "invite people",
        ],
    },
    "share-reading": {
        topic: "share-reading",
        href: "/articles/share-reading",
        title: "Share a reading",
        description:
            "Share your reading link and earn up to 3 stars per day from visits.",
        block: "article",
        iconId: "share",
        keywords: ["share", "share reading", "share link"],
    },
    "create-content": {
        topic: "create-content",
        href: "/articles/create-content",
        title: "Create content & earn stars",
        description:
            "Write, post, or film about AskingFate and earn stars when your content is approved.",
        block: "article",
        iconId: "book",
        keywords: [
            "create content",
            "make content",
            "earn stars",
            "creator",
            "blog",
            "video",
            "post about",
        ],
    },
    "tarot-card": {
        topic: "tarot-card",
        href: "/articles/tarot",
        title: "Tarot card",
        description:
            "Upright and reversed meanings with practical guidance.",
        block: "tarot-card",
        iconId: "moon",
        keywords: [
            "card mean",
            "card means",
            "what does",
            "tarot card",
            "meaning of",
        ],
    },
    "tarot-cards-index": {
        topic: "tarot-cards-index",
        href: "/articles/tarot",
        title: "All tarot cards",
        description:
            "Browse all 78 cards — Major Arcana and the four Minor Arcana suits.",
        block: "article",
        iconId: "book",
        keywords: [
            "all tarot cards",
            "list of cards",
            "every card",
            "tarot deck",
            "the deck",
        ],
    },
    "birth-chart": {
        topic: "birth-chart",
        href: "/birth-chart",
        title: "Birth chart",
        description:
            "See your personalized Swiss Ephemeris birth chart, planets, and houses.",
        block: "page",
        iconId: "compass",
        keywords: [
            "birth chart",
            "natal chart",
            "natal",
            "astrology chart",
            "houses",
            "planets",
        ],
    },
    "calendar-year": {
        topic: "calendar-year",
        href: "/calendar",
        title: "Your cosmic calendar",
        description:
            "See how the year unfolds month by month — favorable days, tense days, and major turning points at a glance.",
        block: "calendar-year",
        iconId: "calendar",
        keywords: [
            "calendar year",
            "calendar",
            "year ahead",
            "year-ahead",
            "yearly",
            "this year",
            "next year",
            "annual",
            "12 months",
            "year overview",
            "year forecast",
            "year outlook",
        ],
    },
    horoscope: {
        topic: "horoscope",
        href: "/articles/how-to-play",
        title: "Personalized horoscope",
        description:
            "Daily, monthly, and yearly horoscope readings based on your birth and today’s sky.",
        block: "page",
        iconId: "moon",
        keywords: [
            "horoscope feature",
            "horoscope page",
            "astrology reading",
            "sky",
            "transit",
        ],
    },
    account: {
        topic: "account",
        href: "/account",
        title: "Account",
        description: "Manage your profile, subscription, and saved birth info.",
        block: "page",
        iconId: "user",
        keywords: [
            "account",
            "my profile",
            "manage account",
            "delete account",
            "logout",
            "sign out",
        ],
    },
    settings: {
        topic: "settings",
        href: "/settings",
        title: "Settings",
        description:
            "Adjust appearance, locale, notifications, and reading preferences.",
        block: "page",
        iconId: "settings",
        keywords: ["settings", "preferences", "options"],
    },
    about: {
        topic: "about",
        href: "/about",
        title: "About AskingFate",
        description:
            "Our mission, how we built the product, and what makes our readings different.",
        block: "page",
        iconId: "info",
        keywords: ["about", "who are you", "what is askingfate", "team"],
    },
    articles: {
        topic: "articles",
        href: "/articles",
        title: "Articles & guides",
        description:
            "Documentation-style guides covering everything in AskingFate.",
        block: "page",
        iconId: "book",
        keywords: ["articles", "guides", "blog", "docs", "documentation"],
    },
    "sign-in": {
        topic: "sign-in",
        href: "/signin",
        title: "Sign in",
        description: "Sign in to save your readings, stars, and birth profile.",
        block: "page",
        iconId: "log-in",
        keywords: ["sign in", "log in", "login", "signin"],
    },
    "sign-up": {
        topic: "sign-up",
        href: "/signup",
        title: "Create an account",
        description:
            "Make a free account to keep your readings, stars, and birth profile.",
        block: "page",
        iconId: "user-plus",
        keywords: ["sign up", "signup", "register", "create account"],
    },
}

export const SUPPORT_TOPIC_LIST = Object.values(SUPPORT_TOPICS)

export function getSupportTopicMeta(
    topic: SupportTopic | string | null | undefined,
): SupportTopicMeta | null {
    if (!topic) return null
    if (topic in SUPPORT_TOPICS) {
        return SUPPORT_TOPICS[topic as SupportTopic]
    }
    return null
}

/**
 * Lightweight local fallback intent matcher. Used only when the LLM did not
 * supply a topic explicitly. Picks the first topic with keyword overlap.
 */
export function matchSupportTopicLocally(
    text: string,
): SupportTopic | null {
    const lower = (text ?? "").toLowerCase()
    if (!lower.trim()) return null

    // Tarot card mentions trump generic keywords.
    const card = matchTarotCardSlug(lower)
    if (card) return "tarot-card"

    for (const meta of SUPPORT_TOPIC_LIST) {
        for (const keyword of meta.keywords) {
            if (lower.includes(keyword)) {
                return meta.topic
            }
        }
    }
    return null
}

/**
 * Try to recognise a tarot card name inside free text. Returns the canonical
 * card slug. Handles "the seven of cups", "seven of cups", "the fool", etc.
 */
export function matchTarotCardSlug(text: string): string | null {
    const lower = ` ${(text ?? "").toLowerCase()} `
    let best: { slug: string; score: number } | null = null
    for (const card of TAROT_CARDS) {
        const name = card.name.toLowerCase()
        const without = name.replace(/^the\s+/, "")
        const candidates = new Set<string>([
            name,
            without,
            name.replace(/\s+/g, " "),
        ])
        for (const candidate of candidates) {
            if (lower.includes(` ${candidate} `)) {
                const score = candidate.length
                if (!best || score > best.score) {
                    best = { slug: card.slug, score }
                }
            }
        }
    }
    return best ? best.slug : null
}
