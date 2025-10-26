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

const MEANINGS: Record<string, CardMeaning> = {
    "the-fool": {
        slug: "the-fool",
        upright: {
            overview: {
                keywords: [
                    "beginnings",
                    "trust",
                    "spontaneity",
                    "innocence",
                    "curiosity",
                    "openness",
                    "risk",
                    "play",
                ],
                text: "A fresh start. The Fool points to first steps, learning by doing, and keeping risk at a sensible level. If you are choosing between action and more planning, act with a small, safe step and review the result. Keep goals simple and practical so momentum can build.",
                yesNo: "Yes",
                zodiac: "Aquarius (Uranus)",
            },
            relationships: {
                keywords: [
                    "openness",
                    "play",
                    "adventure",
                    "vulnerability",
                    "fresh start",
                    "lightheartedness",
                ],
                text: "Upright in love, The Fool brings excitement, new experiences, and a relaxed pace. In a relationship, it shows a period of fun, trying new things together, and light travel (weekend trip, short getaway). It is positive for bonding but not a guarantee of immediate commitment. If you are single, expect a spontaneous connection or a casual romance that feels fresh and energizing. If you are asking specifically about commitment, this card suggests ‘not yet’—enjoy the connection and let clarity develop before defining the label.",
            },
            work: {
                keywords: [
                    "experiment",
                    "initiation",
                    "learning",
                    "prototype",
                    "momentum",
                    "iteration",
                ],
                text: "At work, this card favors a new role, project, or business. Start with a basic version (pilot, MVP) and learn from feedback. It is a good time to apply for internships, junior roles, or roles that require travel. If you asked about long‑term stability, it may be early; focus on building skills and producing small, visible results first.",
            },
            finance: {
                keywords: [
                    "start small",
                    "discipline",
                    "foundation",
                    "habits",
                    "buffer",
                    "simplicity",
                ],
                text: "Financially, begin with basics: make a small automatic transfer, track essential costs, and build a starter emergency fund. Avoid big impulsive buys and high‑risk investments. Modest, repeatable actions create stability faster than one‑off windfalls.",
            },
            health: {
                keywords: [
                    "routine",
                    "movement",
                    "fresh air",
                    "joy",
                    "gentleness",
                    "consistency",
                ],
                text: "Health improves with simple routines: a daily walk, stretching, regular meals, and basic sleep hygiene. This card also cautions against careless mishaps—watch your footing, warm up, and use proper equipment. Keep changes light and sustainable.",
            },
        },
        reversed: {
            overview: {
                keywords: [
                    "hesitation",
                    "risk",
                    "naivety",
                    "stalling",
                    "overthinking",
                    "course correction",
                ],
                text: "Two risks: either rushing in without basics or delaying so long that nothing starts. Reduce the scope to one safe step, confirm essentials, and proceed carefully. Avoid dramatic gestures; choose a small action that gives real information.",
                yesNo: "Not yet",
                zodiac: "Aquarius (Uranus)",
            },
            relationships: {
                keywords: [
                    "boundaries",
                    "expectations",
                    "clarity",
                    "slowness",
                    "safety",
                    "self‑respect",
                ],
                text: "In love, this can show mixed signals, on‑and‑off dynamics, or someone not ready to define the relationship. If partnered, watch for avoidant behavior or risky choices that ignore consequences. Talk about expectations and pace; agree on one concrete next step and review how it feels in a week.",
            },
            work: {
                keywords: [
                    "scope",
                    "basics",
                    "safety",
                    "assumptions",
                    "validation",
                    "focus",
                ],
                text: "Disorganization, skipped checklists, or frequent restarts may be slowing progress. Revisit the brief, confirm requirements, and deliver a narrower outcome first. If you plan to change jobs, prepare basics (portfolio, references) before leaping.",
            },
            finance: {
                keywords: [
                    "impulse",
                    "buffer",
                    "awareness",
                    "stability",
                    "review",
                    "control",
                ],
                text: "Avoid impulse spending and too‑good‑to‑be‑true offers. Rebuild your buffer, list fixed costs, and pause non‑essentials for now. Make decisions from clear numbers, not pressure.",
            },
            health: {
                keywords: [
                    "rest",
                    "grounding",
                    "consistency",
                    "nervous system",
                    "recovery",
                    "moderation",
                ],
                text: "Routine may be irregular or safety steps ignored. Return to basics: sleep schedule, hydration, gentle activity, and safe technique. If starting a new plan, choose low impact and increase gradually.",
            },
        },
    },
    "the-magician": {
        slug: "the-magician",
        upright: {
            overview: {
                keywords: [
                    "focus",
                    "skill",
                    "manifestation",
                    "will",
                    "resourcefulness",
                    "precision",
                    "initiative",
                ],
                text: "Clear execution. You have the tools and the timing to turn a plan into results. Choose one outcome, remove distractions, and work in short, measurable cycles. Show the result, get feedback, and improve.",
                yesNo: "Yes",
                zodiac: "Mercury (Gemini/Virgo)",
            },
            relationships: {
                keywords: [
                    "communication",
                    "initiative",
                    "attention",
                    "attunement",
                    "clarity",
                    "intentionality",
                ],
                text: "In relationships, strong communication creates progress. Be direct about intentions, listen for the other person’s needs, and agree on practical next steps. This is positive for defining labels, resolving confusion, or planning together. Avoid persuasion tactics—choose transparency and consistency.",
            },
            work: {
                keywords: [
                    "craft",
                    "leverage",
                    "execution",
                    "systems",
                    "evidence",
                    "ownership",
                ],
                text: "Excellent for pitching, presenting, selling, and negotiating. Use your tools well, prepare a focused demo, and show clear value. Automate repeatable parts so you can spend time on the work that moves the metric.",
            },
            finance: {
                keywords: [
                    "strategy",
                    "systems",
                    "value",
                    "efficiency",
                    "planning",
                    "review",
                ],
                text: "You can improve finances through planning and skill. Negotiate rates, compare providers, and automate key payments. Read terms carefully; a little preparation can save money quickly.",
            },
            health: {
                keywords: [
                    "intent",
                    "precision",
                    "habit",
                    "awareness",
                    "feedback",
                    "consistency",
                ],
                text: "Track one meaningful measure (sleep, steps, or stress) and make small adjustments based on the data. Coaching, physiotherapy, or a structured plan can be especially effective now.",
            },
        },
        reversed: {
            overview: {
                keywords: [
                    "scattered",
                    "doubt",
                    "misuse",
                    "misalignment",
                    "distraction",
                    "overextension",
                ],
                text: "Mixed signals or unclear goals reduce impact. Narrow your focus to one deliverable, slow multitasking, and complete tasks fully before starting new ones.",
                yesNo: "Maybe",
                zodiac: "Mercury (Gemini/Virgo)",
            },
            relationships: {
                keywords: [
                    "authenticity",
                    "listening",
                    "trust",
                    "transparency",
                    "repair",
                    "respect",
                ],
                text: "Be careful of charm without follow‑through. Avoid trying to ‘convince’ someone; aim for honest, specific conversation. If there has been confusion, restate intentions and align words with actions.",
            },
            work: {
                keywords: [
                    "overreach",
                    "priorities",
                    "ethics",
                    "constraints",
                    "boundaries",
                    "focus",
                ],
                text: "Watch for over‑promising or cutting corners. Revise the plan, confirm resources, and protect your reputation with accurate estimates. Quality and clarity matter more than speed right now.",
            },
            finance: {
                keywords: [
                    "leaks",
                    "review",
                    "control",
                    "overspend",
                    "efficiency",
                    "stability",
                ],
                text: "Check for hidden fees, odd renewals, or unclear terms. Do not sign contracts you have not read. A short review can stop small leaks and prevent larger issues.",
            },
            health: {
                keywords: [
                    "overexertion",
                    "signals",
                    "moderation",
                    "pacing",
                    "recovery",
                    "consistency",
                ],
                text: "Avoid quick fixes and miracle claims. If you feel drained, reduce intensity, pace activities, and schedule recovery. Professional guidance can help if symptoms persist.",
            },
        },
    },
}

export function getCardMeaning(slug: string): CardMeaning | undefined {
    return MEANINGS[slug]
}

// Rule-based generator for all cards to ensure full coverage with clear, direct wording
import type { TarotCard as CardMeta } from "@/lib/tarot/cards"

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
    if (!MEANINGS[c.slug]) {
        MEANINGS[c.slug] = buildMeaning(c)
    }
}
