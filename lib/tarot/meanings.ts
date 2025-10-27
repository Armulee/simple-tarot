export type SectionMeaning = {
    keywords: string[]
    text: string
    yesNo?: string
    zodiac?: string
}

export type CardMeaning = {
    slug: string
    upright: {
        overview: SectionMeaning
        relationships: SectionMeaning
        work: SectionMeaning
        finance: SectionMeaning
        health: SectionMeaning
    }
    reversed: {
        overview: SectionMeaning
        relationships: SectionMeaning
        work: SectionMeaning
        finance: SectionMeaning
        health: SectionMeaning
    }
}

// JSON override types: only overview fields may be provided per orientation
type OverviewOverride = Partial<SectionMeaning>
type CardMeaningOverviewOverrides = {
    slug?: string
    upright?: { overview?: OverviewOverride }
    reversed?: { overview?: OverviewOverride }
}

// Central meanings map; populated at module load by combining JSON overrides with structured defaults
const MEANINGS: Record<string, CardMeaning> = {}

export function getCardMeaning(slug: string): CardMeaning | undefined {
    return MEANINGS[slug]
}

// Rule-based generator for all cards to ensure full coverage with clear, direct wording
import type { TarotCard as CardMeta } from "@/lib/tarot/cards"
import OVERRIDES from "@/lib/tarot/meanings.json"

const MAJOR_YES_NO_ZODIAC: Record<string, { yesNo: string; zodiac: string }> = {
    "the-fool": { yesNo: "Yes", zodiac: "Aquarius (Uranus)" },
    "the-magician": { yesNo: "Yes", zodiac: "Mercury (Gemini/Virgo)" },
    "the-high-priestess": { yesNo: "Maybe", zodiac: "Cancer (Moon)" },
    "the-empress": { yesNo: "Yes", zodiac: "Venus (Taurus/Libra)" },
    "the-emperor": { yesNo: "Yes", zodiac: "Aries (Mars)" },
    "the-hierophant": { yesNo: "Maybe", zodiac: "Taurus (Venus)" },
    "the-lovers": { yesNo: "Yes", zodiac: "Gemini (Mercury)" },
    "the-chariot": { yesNo: "Yes", zodiac: "Cancer (Moon)" },
    strength: { yesNo: "Yes", zodiac: "Leo (Sun)" },
    "the-hermit": { yesNo: "Maybe", zodiac: "Virgo (Mercury)" },
    "wheel-of-fortune": { yesNo: "Yes", zodiac: "Jupiter" },
    justice: { yesNo: "Maybe", zodiac: "Libra (Venus)" },
    "the-hanged-man": { yesNo: "Not yet", zodiac: "Neptune" },
    death: { yesNo: "No", zodiac: "Scorpio (Pluto/Mars)" },
    temperance: { yesNo: "Yes", zodiac: "Sagittarius (Jupiter)" },
    "the-devil": { yesNo: "No", zodiac: "Capricorn (Saturn)" },
    "the-tower": { yesNo: "No", zodiac: "Mars" },
    "the-star": { yesNo: "Yes", zodiac: "Aquarius (Uranus/Saturn)" },
    "the-moon": { yesNo: "Maybe", zodiac: "Pisces (Moon/Neptune)" },
    "the-sun": { yesNo: "Yes", zodiac: "Sun (Leo)" },
    judgement: { yesNo: "Yes", zodiac: "Pluto" },
    "the-world": { yesNo: "Yes", zodiac: "Saturn" },
}

function suitElement(suit: NonNullable<CardMeta["suit"]>): {
    label: string
    yesNo: string
} {
    switch (suit) {
        case "wands":
            return { label: "Fire (Wands)", yesNo: "Yes" }
        case "cups":
            return { label: "Water (Cups)", yesNo: "Maybe" }
        case "swords":
            return { label: "Air (Swords)", yesNo: "No" }
        case "pentacles":
            return { label: "Earth (Pentacles)", yesNo: "Yes" }
    }
}

function rankTheme(rank?: string): string {
    switch (rank) {
        case "Ace":
            return "beginning; raw potential"
        case "Two":
            return "choice; balance"
        case "Three":
            return "growth; teamwork"
        case "Four":
            return "stability; consolidation"
        case "Five":
            return "disruption; challenge"
        case "Six":
            return "progress; support"
        case "Seven":
            return "assessment; perseverance"
        case "Eight":
            return "effort; movement"
        case "Nine":
            return "result; strain"
        case "Ten":
            return "completion; outcome"
        case "Page":
            return "message; learning"
        case "Knight":
            return "pursuit; change"
        case "Queen":
            return "maturity; care"
        case "King":
            return "authority; direction"
        default:
            return "theme"
    }
}

function simpleKeywords(...words: string[]): string[] {
    return words
}

export function buildMeaning(card: CardMeta): CardMeaning {
    if (card.arcana === "major") {
        const meta = MAJOR_YES_NO_ZODIAC[card.slug] || {
            yesNo: "Maybe",
            zodiac: "",
        }
        // Very concise, direct wording per section
        const base = {
            relationships: {
                upright: `In relationships, ${card.name} indicates its core theme expressed positively (cooperation, clarity, or growth depending on the card).`,
                reversed: `In relationships, ${card.name} reversed indicates the core theme blocked or excessive (misunderstanding, delay, or imbalance).`,
            },
            work: {
                upright: `${card.name} at work indicates the card’s strength applied to goals (focus, discipline, or opportunity).`,
                reversed: `${card.name} reversed at work indicates inefficiency or misalignment; fix the basics and reduce friction.`,
            },
            finance: {
                upright: `${card.name} in finance indicates steady, practical steps aligned with the card’s strength.`,
                reversed: `${card.name} reversed in finance indicates scattered effort or risk; simplify and verify details.`,
            },
            health: {
                upright: `${card.name} in health indicates consistent routines and measured progress.`,
                reversed: `${card.name} reversed in health indicates overload or neglect; return to simple routines.`,
            },
        }
        return {
            slug: card.slug,
            upright: {
                overview: {
                    keywords: simpleKeywords(
                        "core theme",
                        "positive expression"
                    ),
                    text: `${card.name} indicates its central theme in a helpful form. Progress comes from clear, practical steps that match the situation.`,
                    yesNo: meta.yesNo,
                    zodiac: meta.zodiac,
                },
                relationships: {
                    keywords: ["clarity", "cooperation", "growth"],
                    text: base.relationships.upright,
                },
                work: {
                    keywords: ["focus", "discipline", "delivery"],
                    text: base.work.upright,
                },
                finance: {
                    keywords: ["planning", "stability", "evidence"],
                    text: base.finance.upright,
                },
                health: {
                    keywords: ["routine", "balance", "consistency"],
                    text: base.health.upright,
                },
            },
            reversed: {
                overview: {
                    keywords: simpleKeywords("block", "imbalance"),
                    text: `${card.name} reversed shows the theme is blocked or overdone. Reduce scope, correct the cause, and proceed in small steps.`,
                    yesNo: meta.yesNo === "Yes" ? "Not yet" : meta.yesNo,
                    zodiac: meta.zodiac,
                },
                relationships: {
                    keywords: ["misalignment", "delay", "repair"],
                    text: base.relationships.reversed,
                },
                work: {
                    keywords: ["misalignment", "friction", "rework"],
                    text: base.work.reversed,
                },
                finance: {
                    keywords: ["leaks", "risk", "check"],
                    text: base.finance.reversed,
                },
                health: {
                    keywords: ["overload", "neglect", "reset"],
                    text: base.health.reversed,
                },
            },
        }
    }

    // Minor Arcana generation
    const element = suitElement(card.suit!)
    const theme = rankTheme(card.rank)
    const suitNoun =
        card.suit === "wands"
            ? "initiative"
            : card.suit === "cups"
              ? "emotion"
              : card.suit === "swords"
                ? "thought"
                : "resources"

    return {
        slug: card.slug,
        upright: {
            overview: {
                keywords: simpleKeywords(
                    card.rank || "",
                    suitNoun,
                    element.label
                ),
                text: `${card.name} upright indicates ${theme} expressed clearly within ${suitNoun}. Expect direct, practical movement in this area.`,
                yesNo: element.yesNo,
                zodiac: element.label,
            },
            relationships: {
                keywords: [suitNoun, "directness", "progress"],
                text: `${card.name} in relationships indicates ${theme} applied to connection. Expect straightforward developments matching the situation.`,
            },
            work: {
                keywords: [suitNoun, "delivery", "steps"],
                text: `${card.name} at work indicates ${theme} focused on results. Use clear tasks and measured follow‑through.`,
            },
            finance: {
                keywords: [suitNoun, "planning", "stability"],
                text: `${card.name} in finance indicates ${theme} leading to practical decisions. Keep budgets simple and evidence‑based.`,
            },
            health: {
                keywords: [suitNoun, "routine", "consistency"],
                text: `${card.name} in health indicates ${theme} supported by steady routines. Favor small, repeatable actions.`,
            },
        },
        reversed: {
            overview: {
                keywords: simpleKeywords("block", suitNoun, element.label),
                text: `${card.name} reversed indicates ${theme} blocked or excessive within ${suitNoun}. Reduce friction and restore basics.`,
                yesNo: element.yesNo === "Yes" ? "Not yet" : element.yesNo,
                zodiac: element.label,
            },
            relationships: {
                keywords: ["misalignment", suitNoun, "repair"],
                text: `${card.name} reversed in relationships indicates delay or mixed signals. Clarify expectations and pace.`,
            },
            work: {
                keywords: ["friction", suitNoun, "rework"],
                text: `${card.name} reversed at work indicates inefficiency or scope drift. Tighten plan and sequence tasks.`,
            },
            finance: {
                keywords: ["leaks", suitNoun, "review"],
                text: `${card.name} reversed in finance indicates scattered spending or unclear terms. Audit and simplify.`,
            },
            health: {
                keywords: ["overload", suitNoun, "reset"],
                text: `${card.name} reversed in health indicates irregular routines. Return to simple, steady habits.`,
            },
        },
    }
}

// Ensure all 78 cards have meanings available at runtime
import { getAllCards } from "@/lib/tarot/cards"
for (const c of getAllCards()) {
    const base = buildMeaning(c)
    const override = (OVERRIDES as unknown as Record<
        string,
        CardMeaningOverviewOverrides
    >)[
        c.slug
    ]
    if (override?.upright?.overview) {
        base.upright.overview = {
            keywords:
                override.upright.overview.keywords ?? base.upright.overview.keywords,
            text: override.upright.overview.text ?? base.upright.overview.text,
            yesNo: override.upright.overview.yesNo ?? base.upright.overview.yesNo,
            zodiac:
                override.upright.overview.zodiac ?? base.upright.overview.zodiac,
        }
    }
    if (override?.reversed?.overview) {
        base.reversed.overview = {
            keywords:
                override.reversed.overview.keywords ??
                base.reversed.overview.keywords,
            text:
                override.reversed.overview.text ?? base.reversed.overview.text,
            yesNo:
                override.reversed.overview.yesNo ?? base.reversed.overview.yesNo,
            zodiac:
                override.reversed.overview.zodiac ??
                base.reversed.overview.zodiac,
        }
    }
    MEANINGS[c.slug] = base
}
