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

// Cache so pages don’t regenerate on every call
const MEANINGS: Record<string, CardMeaning> = {}

// Rule-based generator with long-form, card-aware paragraphs (~180–220 words each)
import type { TarotCard as CardMeta } from "@/lib/tarot/cards"
import { getCardBySlug, getAllCards } from "@/lib/tarot/cards"

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

function listKeywords(words: string[], max: number = 4): string {
    return words.slice(0, max).join(", ")
}

function composeLongText(sentences: string[]): string {
    return sentences.filter(Boolean).join(" ")
}

function capitalizeFirst(input: string): string {
    if (!input) return input
    return input.charAt(0).toUpperCase() + input.slice(1)
}

export function buildMeaning(card: CardMeta): CardMeaning {
    if (card.arcana === "major") {
        const meta = MAJOR_YES_NO_ZODIAC[card.slug] || {
            yesNo: "Maybe",
            zodiac: "",
        }

        const uprightKeywordsList = listKeywords(card.uprightKeywords)
        const reversedKeywordsList = listKeywords(card.reversedKeywords)

        const uprightOverviewText = composeLongText([
            `${card.name} upright highlights the archetype at the heart of this card, expressed in a supportive and constructive way.`,
            `Common themes include ${uprightKeywordsList}.`,
            `${card.description} In everyday terms, this points to decisions and behaviors that are simple, honest, and proportionate to the moment.`,
            `Momentum comes from taking one clear step, observing what changes, and then taking the next step rather than trying to solve everything at once.`,
            `Trust your direct experience more than speculation; when feedback arrives, adjust calmly and continue.`,
            `Where uncertainty is high, reduce scope and favor repeatable habits that create steady improvement.`,
            `If you are weighing options, choose the path that keeps you resourced, connected, and able to learn in small loops.`,
            `Astrologically this card correlates with ${meta.zodiac || "its traditional associations"}, and its overall yes/no tendency is ${meta.yesNo.toLowerCase()}.`,
            `The essence of the card is not dramatic heroism but practical alignment: the right amount of effort, in the right place, at the right time.`,
        ])

        const reversedOverviewText = composeLongText([
            `${card.name} reversed shows the archetype under strain or expressed in an unbalanced way.`,
            `Typical patterns include ${reversedKeywordsList}.`,
            `The core meaning is still present, but it is blocked, over‑amplified, or misdirected.`,
            `Slow down, identify the single source of friction you can actually influence, and correct that first.`,
            `Avoid big swings and all‑or‑nothing thinking; prefer small reversible actions that give reliable information.`,
            `Name assumptions, check facts, and remove one dependency at a time.`,
            `If you feel pressure to decide quickly, buy time and restore basics before you commit.`,
            `Astrologically this card aligns with ${meta.zodiac || "its traditional associations"}. The yes/no tendency when reversed is ${meta.yesNo === "Yes" ? "not yet" : meta.yesNo.toLowerCase()}.`,
            `Progress returns when you reduce noise, respect constraints, and let results—not fear—shape your next step.`,
        ])

        const uprightRelationshipsText = composeLongText([
            `In relationships, ${card.name} upright favors clarity, goodwill, and mutual growth.`,
            `Lead with straightforward communication and small acts of reliability; connection deepens when words and actions match.`,
            `If you are dating, pursue conversations that are present‑tense and specific—what you both enjoy, what pace feels comfortable, and what the next concrete plan is.`,
            `If partnered, align on a near‑term, shared focus (a repair, a routine, or a plan) and make it easy to succeed together.`,
            `Give each person the benefit of the doubt while remaining honest about needs and boundaries.`,
            `When old stories arise, return to the present and ask for evidence; let today’s behavior carry more weight than assumptions.`,
            `This card encourages affection that is steady rather than theatrical—small rituals that make each other’s day simpler and safer.`,
        ])

        const reversedRelationshipsText = composeLongText([
            `Reversed, ${card.name} may show mixed signals, uneven effort, or a mismatch of timing.`,
            `Slow the tempo so nervous systems can settle and communication can become honest again.`,
            `Clarify one boundary, one request, and one next check‑in; avoid trying to resolve the entire relationship in a single conversation.`,
            `If you notice persuasion without follow‑through, center self‑respect and step back from dynamics that reward inconsistency.`,
            `Repair is possible when accountability is real, not performative.`,
            `For new connections, be curious but cautious; let patterns—not promises—decide how much you invest.`,
        ])

        const uprightWorkText = composeLongText([
            `At work, ${card.name} upright supports focused execution and the skillful use of tools.`,
            `Frame a clear outcome, break it into visible milestones, and deliver a thin slice soon to gather feedback.`,
            `Protect time for deep work, automate small chores, and remove one distraction that dilutes impact.`,
            `Collaborate by agreeing on definitions of done, decision owners, and review cadence.`,
            `If you are seeking a role, showcase evidence: working demos, concrete results, and quantified improvements.`,
            `Your edge now is clarity plus momentum, not perfection.`,
        ])

        const reversedWorkText = composeLongText([
            `Reversed, ${card.name} points to misalignment, over‑promising, or scattered priorities.`,
            `Pause to re‑negotiate scope, confirm resources, and decide what will not be done.`,
            `Replace vague tasks with small, testable deliverables and time‑boxes; complete them fully before starting new work.`,
            `Guard your reputation—accuracy and ethics matter more than speed.`,
            `If burnout is near, lower intensity and rebuild consistent, humane rhythms.`,
        ])

        const uprightFinanceText = composeLongText([
            `In finances, ${card.name} upright encourages practical planning and visible value.`,
            `Map fixed costs, automate essential payments, and set one small recurring transfer toward savings or debt.`,
            `Compare providers, negotiate fees, and read terms carefully—modest optimizations compound quickly.`,
            `Invest in tools or education that measurably improve earning power or reduce friction.`,
            `Choose steadiness over drama; resilience is built by routines you can sustain on a hard day.`,
        ])

        const reversedFinanceText = composeLongText([
            `Reversed, ${card.name} warns of leaks, unclear terms, or decisions driven by urgency rather than numbers.`,
            `Freeze non‑essential spending, inventory subscriptions, and cancel what you do not use.`,
            `Check statements, interest rates, and renewal dates; a short review can stop losses fast.`,
            `If tempted by high‑risk moves, step back and choose options that protect runway and optionality.`,
        ])

        const uprightHealthText = composeLongText([
            `For health, ${card.name} upright supports consistent, gentle routines that respect your current capacity.`,
            `Prioritize sleep hygiene, hydration, and regular movement; track one meaningful signal and let data guide small changes.`,
            `Skillful coaching or a clear protocol can accelerate progress when the basics are in place.`,
            `Favour form over intensity and sustainability over novelty.`,
        ])

        const reversedHealthText = composeLongText([
            `Reversed, ${card.name} can reflect irregular routines, overexertion, or ignoring early warning signs.`,
            `Reduce load, pace activities, and schedule recovery before adding more effort.`,
            `If a plan feels complicated, simplify to one or two daily keystone habits and rebuild confidence from there.`,
            `Seek professional input where appropriate and be patient with the healing timeline.`,
        ])

        return {
            slug: card.slug,
            upright: {
                overview: {
                    keywords: simpleKeywords("core theme", "positive expression"),
                    text: uprightOverviewText,
                    yesNo: meta.yesNo,
                    zodiac: meta.zodiac,
                },
                relationships: {
                    keywords: ["clarity", "cooperation", "growth"],
                    text: uprightRelationshipsText,
                },
                work: {
                    keywords: ["focus", "discipline", "delivery"],
                    text: uprightWorkText,
                },
                finance: {
                    keywords: ["planning", "stability", "evidence"],
                    text: uprightFinanceText,
                },
                health: {
                    keywords: ["routine", "balance", "consistency"],
                    text: uprightHealthText,
                },
            },
            reversed: {
                overview: {
                    keywords: simpleKeywords("block", "imbalance"),
                    text: reversedOverviewText,
                    yesNo: meta.yesNo === "Yes" ? "Not yet" : meta.yesNo,
                    zodiac: meta.zodiac,
                },
                relationships: {
                    keywords: ["misalignment", "delay", "repair"],
                    text: reversedRelationshipsText,
                },
                work: {
                    keywords: ["misalignment", "friction", "rework"],
                    text: reversedWorkText,
                },
                finance: {
                    keywords: ["leaks", "risk", "check"],
                    text: reversedFinanceText,
                },
                health: {
                    keywords: ["overload", "neglect", "reset"],
                    text: reversedHealthText,
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

    const rankLabel = card.rank ? card.rank.toLowerCase() : "card"
    const suitLabel = capitalizeFirst(card.suit!)
    const elementLabel = element.label

    const uprightOverviewText = composeLongText([
        `${card.name} upright expresses ${theme} within the realm of ${suitNoun}.`,
        `This ${rankLabel} channels the ${elementLabel.toLowerCase()} qualities of the suit into practical, observable movement.`,
        `Expect developments to be direct and proportional—neither forced nor delayed—when you keep actions small, specific, and consistent.`,
        `Let the situation teach you: take a step, measure the effect, and refine.`,
        `Where choices appear complicated, simplify to the next honest action that protects your energy, time, and relationships.`,
        `The card favors routines you can sustain on a difficult day and clear criteria for success you can check quickly.`,
        `In essence, progress is the outcome of attention plus repetition in the area of ${suitNoun}.`,
    ])

    const reversedOverviewText = composeLongText([
        `${card.name} reversed shows ${theme} blocked, exaggerated, or misapplied within ${suitNoun}.`,
        `Friction tends to come from avoidable complexity, unclear boundaries, or skipping basics.`,
        `Reduce scope, re‑establish a simple baseline, and take one corrective action before adding anything else.`,
        `Audit assumptions and remove a single bottleneck you can influence today; small wins return momentum.`,
        `When pressure rises, slow down decisions and anchor them in present‑tense facts rather than fear.`,
    ])

    const uprightRelationshipsText = composeLongText([
        `In relationships, ${card.name} upright translates ${theme} into tangible connection.`,
        `Name what you enjoy together, set a comfortable tempo, and keep promises small and reliable.`,
        `If dating, prefer plans that let you learn gently about each other—short meet‑ups, honest check‑ins, and clear follow‑ups.`,
        `If partnered, choose one routine that makes daily life easier and protect it like a shared asset.`,
        `Kindness now is practical, not performative; consistency builds trust and desire.`,
    ])

    const reversedRelationshipsText = composeLongText([
        `Reversed, ${card.name} can present mixed signals or mis‑timed effort in matters of the heart.`,
        `Avoid mind‑reading. Ask directly, listen fully, and reflect back what you hear before deciding next steps.`,
        `Repair begins with a boundary or an apology that changes behavior, not just words.`,
        `If interest and effort remain uneven, protect your self‑respect and step back from chasing.`,
    ])

    const uprightWorkText = composeLongText([
        `At work, ${card.name} upright supports ${theme} focused on outcomes.`,
        `Translate strategy into clear tasks, time‑box them, and deliver a working slice soon to invite feedback.`,
        `Use checklists, definitions of done, and brief demos to keep alignment high.`,
        `Automate repetitive chores so skilled attention goes where it matters most.`,
        `This card rewards evidence over rhetoric; show value, then iterate.`,
    ])

    const reversedWorkText = composeLongText([
        `Reversed, ${card.name} flags drift, over‑commitment, or unclear ownership.`,
        `Re‑prioritize ruthlessly: what will you deliver, by when, and what will not be attempted now?`,
        `Replace vague tickets with small testable tasks and ship them in sequence.`,
        `Protect reputation and health by choosing accuracy and humane pace over hurried promises.`,
    ])

    const uprightFinanceText = composeLongText([
        `Financially, ${card.name} upright channels ${theme} into thoughtful planning and stable habits.`,
        `List fixed costs, automate essentials, and schedule a modest transfer toward savings or debt.`,
        `Compare providers, renegotiate where possible, and read terms carefully to prevent hidden costs.`,
        `Spend on tools or education that improve capability within ${suitNoun}; let data verify ROI.`,
        `Steady, boring progress outperforms dramatic swings.`,
    ])

    const reversedFinanceText = composeLongText([
        `Reversed, ${card.name} points to leaks, confusing terms, or spending driven by stress.`,
        `Pause non‑essentials, audit subscriptions, and correct the single largest source of waste first.`,
        `Make choices from clear numbers and enough sleep, not urgency.`,
        `Prefer optionality: preserve cash runway and avoid commitments you cannot exit cleanly.`,
    ])

    const uprightHealthText = composeLongText([
        `For health, ${card.name} upright supports ${theme} through simple, sustainable routines.`,
        `Prioritize sleep, hydration, and regular movement; track one signal and adjust slowly.`,
        `Technique and form beat intensity; capacity grows when you respect today’s limits.`,
        `If starting anew, begin light and celebrate small consistency streaks.`,
    ])

    const reversedHealthText = composeLongText([
        `Reversed, ${card.name} suggests irregular habits, overreaching, or ignoring feedback from the body.`,
        `Lower the bar, shorten sessions, and protect recovery windows.`,
        `If confusion persists, seek professional input and commit to basics for two steady weeks before reassessing.`,
    ])

    return {
        slug: card.slug,
        upright: {
            overview: {
                keywords: simpleKeywords(card.rank || "", suitNoun, element.label),
                text: uprightOverviewText,
                yesNo: element.yesNo,
                zodiac: element.label,
            },
            relationships: {
                keywords: [suitNoun, "directness", "progress"],
                text: uprightRelationshipsText,
            },
            work: {
                keywords: [suitNoun, "delivery", "steps"],
                text: uprightWorkText,
            },
            finance: {
                keywords: [suitNoun, "planning", "stability"],
                text: uprightFinanceText,
            },
            health: {
                keywords: [suitNoun, "routine", "consistency"],
                text: uprightHealthText,
            },
        },
        reversed: {
            overview: {
                keywords: simpleKeywords("block", suitNoun, element.label),
                text: reversedOverviewText,
                yesNo: element.yesNo === "Yes" ? "Not yet" : element.yesNo,
                zodiac: element.label,
            },
            relationships: {
                keywords: ["misalignment", suitNoun, "repair"],
                text: reversedRelationshipsText,
            },
            work: {
                keywords: ["friction", suitNoun, "rework"],
                text: reversedWorkText,
            },
            finance: {
                keywords: ["leaks", suitNoun, "review"],
                text: reversedFinanceText,
            },
            health: {
                keywords: ["overload", suitNoun, "reset"],
                text: reversedHealthText,
            },
        },
    }
}

// Build on demand and cache, ensuring all 78 cards resolve to long‑form meanings
export function getCardMeaning(slug: string): CardMeaning | undefined {
    if (MEANINGS[slug]) return MEANINGS[slug]
    const card = getCardBySlug(slug)
    if (!card) return undefined
    const meaning = buildMeaning(card)
    MEANINGS[slug] = meaning
    return meaning
}

// Pre‑warm cache at module load to avoid runtime surprises in static generation
for (const c of getAllCards()) {
    if (!MEANINGS[c.slug]) MEANINGS[c.slug] = buildMeaning(c)
}
