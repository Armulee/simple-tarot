"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"
import InterpretationProse from "@/components/tarot/interpretation/prose"

type CardFull = {
    id: number
    name: string
    image: string
    meaning: string
    isReversed: boolean
}

type SharedTarotData = {
    id: string
    question: string
    cards: string[]
    interpretation: string
    assistant_text: string | null
    insights: string[] | null
    conclusion: string | null
    spread_type: string | null
    cards_full: CardFull[] | null
    created_at: string
}

const SPREAD_LABELS: Record<string, string[]> = {
    simple: ["Card"],
    general: ["Past", "Present", "Future"],
    detailed: ["Situation", "Challenge", "Advice", "Outcome", "Potential"],
    expanded: [
        "Past",
        "Present",
        "Future",
        "Reason",
        "Potential",
        "Near Future",
        "Outcome",
    ],
    celtic: [
        "Present",
        "Challenge",
        "Past",
        "Future",
        "Above",
        "Below",
        "Advice",
        "Environment",
        "Hopes/Fears",
        "Outcome",
    ],
}

function getSpreadKey(count: number): string {
    if (count === 1) return "simple"
    if (count === 3) return "general"
    if (count === 5) return "detailed"
    if (count === 7) return "expanded"
    if (count === 10) return "celtic"
    return "unknown"
}

function CardDisplay({
    card,
    index,
    label,
    insight,
}: {
    card: CardFull
    index: number
    label: string
    insight?: string
}) {
    const slug = card.name.toLowerCase().replace(/\s+/g, "-")
    const src = `/assets/rider-waite-tarot/${slug}.png`

    return (
        <div className='bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/5 w-full md:max-w-sm'>
            <div className='flex flex-row items-start gap-4 p-4'>
                <div className='shrink-0 flex flex-col items-center relative'>
                    <div className='absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white z-10 shadow-lg border border-white/10'>
                        {index + 1}
                    </div>
                    <div
                        className='w-16 h-28 shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-inner'
                        style={
                            card.isReversed
                                ? { transform: "rotate(180deg)" }
                                : undefined
                        }
                    >
                        <Image
                            src={src}
                            alt={card.name}
                            width={64}
                            height={112}
                            className='w-full h-full object-cover'
                        />
                    </div>
                </div>
                <div className='flex-1 min-w-0 flex flex-col py-0.5'>
                    <div className='text-left mb-2'>
                        <p className='text-[10px] text-white/50 font-bold uppercase tracking-wider mb-0.5'>
                            {label}
                        </p>
                        <Badge
                            variant='secondary'
                            className='bg-white/20 text-white/90 border-indigo-500/30 truncate block max-w-full text-[10px]'
                        >
                            {card.meaning}
                        </Badge>
                    </div>
                    {insight && (
                        <div className='w-fit px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md'>
                            <p className='text-[10px] font-serif italic text-indigo-100 leading-relaxed'>
                                &ldquo;{insight}&rdquo;
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function SharedTarotView({ data }: { data: SharedTarotData }) {
    const cards = data.cards_full ?? []
    const spreadKey = getSpreadKey(cards.length)
    const labels = SPREAD_LABELS[spreadKey] ?? []
    const insights = data.insights ?? []

    return (
        <div className='min-h-screen text-white'>
            <div className='mx-auto max-w-3xl px-4 py-8 space-y-6'>
                {/* User question */}
                <div className='flex justify-end'>
                    <div className='max-w-[80%] rounded-2xl bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl border border-white/10 px-4 py-3 text-white shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)]'>
                        {data.question}
                    </div>
                </div>

                {/* Assistant decision text */}
                {data.assistant_text && (
                    <div className='flex flex-col items-start'>
                        <div className='w-full md:max-w-[85%] text-white/90 leading-relaxed whitespace-pre-wrap'>
                            {data.assistant_text}
                        </div>
                    </div>
                )}

                {/* Cards with insights */}
                {cards.length > 0 && (
                    <div className='flex flex-wrap gap-6 w-full md:max-w-[85%]'>
                        {cards.map((card, i) => (
                            <CardDisplay
                                key={card.id}
                                card={card}
                                index={i}
                                label={labels[i] ?? `Card ${i + 1}`}
                                insight={insights[i]}
                            />
                        ))}
                    </div>
                )}

                {/* Interpretation box */}
                <div className='w-full md:max-w-[85%] rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg space-y-6'>
                    <div className='flex items-center space-x-3'>
                        <div className='w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center'>
                            <Sparkles className='w-5 h-5 text-indigo-400' />
                        </div>
                        <div>
                            <h2 className='font-serif font-semibold text-xl text-white'>
                                Interpretation
                            </h2>
                            <p className='text-sm text-white/40'>
                                AI-powered tarot reading
                            </p>
                        </div>
                    </div>
                    {(() => {
                        const parts = (data.interpretation ?? "").split("\n\n")
                        const keywords = parts[0] ?? ""
                        const body = parts.slice(1).join("\n\n").trim()
                        const looksLikeKeywords =
                            keywords.length > 0 &&
                            keywords.length < 120 &&
                            keywords.includes(",") &&
                            body.length > 0
                        const keywordList = looksLikeKeywords
                            ? keywords.split(",").map((k) => k.trim()).filter(Boolean)
                            : []
                        const proseText = looksLikeKeywords
                            ? body
                            : data.interpretation
                        return (
                            <>
                                {keywordList.length > 0 && (
                                    <div className='flex flex-wrap gap-2'>
                                        {keywordList.map((k, i) => (
                                            <span
                                                key={i}
                                                className='px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-white border border-white/20'
                                            >
                                                {k.charAt(0).toUpperCase() + k.slice(1)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <InterpretationProse
                                    text={proseText}
                                    variant='muted'
                                />
                            </>
                        )
                    })()}
                </div>

                {/* Conclusion */}
                {data.conclusion && (
                    <div className='w-full md:max-w-[85%] space-y-2 pt-2'>
                        <p className='text-white leading-relaxed'>
                            {data.conclusion}
                        </p>
                    </div>
                )}

                {/* Read-only indicator */}
                <div className='mt-6 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/50'>
                    <span className='size-2 rounded-full bg-white/40' aria-hidden />
                    <span>Read only</span>
                </div>
            </div>
        </div>
    )
}
