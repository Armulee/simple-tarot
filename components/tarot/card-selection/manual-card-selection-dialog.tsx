"use client"

import React, { useState, useCallback } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Check } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { TAROT_CARDS, type TarotCard } from "@/lib/tarot/cards"
import { cn } from "@/lib/utils"

type BasicCard = {
    name: string
    isReversed: boolean
}

function cardSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, "-")
}

function cardImagePath(name: string): string {
    return `/assets/rider-waite-tarot/${cardSlug(name)}.png`
}

const majorCards = TAROT_CARDS.filter((c) => c.arcana === "major")
const suitGroups: { key: string; suit: string; cards: TarotCard[] }[] = [
    { key: "cups", suit: "Cups", cards: TAROT_CARDS.filter((c) => c.suit === "cups") },
    { key: "wands", suit: "Wands", cards: TAROT_CARDS.filter((c) => c.suit === "wands") },
    { key: "swords", suit: "Swords", cards: TAROT_CARDS.filter((c) => c.suit === "swords") },
    { key: "pentacles", suit: "Pentacles", cards: TAROT_CARDS.filter((c) => c.suit === "pentacles") },
]

export function ManualCardSelectionDialog({
    open,
    onOpenChange,
    cardsToSelect,
    onCardsSelected,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    cardsToSelect: number
    onCardsSelected: (cards: BasicCard[]) => void
}) {
    const t = useTranslations("ReadingPage.chooseCards")
    const [selected, setSelected] = useState<BasicCard[]>([])
    const selectedNames = new Set(selected.map((c) => c.name))

    const toggleCard = useCallback(
        (card: TarotCard) => {
            setSelected((prev) => {
                const exists = prev.find((c) => c.name === card.name)
                if (exists) {
                    return prev.filter((c) => c.name !== card.name)
                }
                if (prev.length >= cardsToSelect) return prev
                const isReversed = Math.random() < 0.5
                const next = [...prev, { name: card.name, isReversed }]
                if (next.length === cardsToSelect) {
                    setTimeout(() => {
                        onCardsSelected(next)
                        onOpenChange(false)
                    }, 400)
                }
                return next
            })
        },
        [cardsToSelect, onCardsSelected, onOpenChange],
    )

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setSelected([])
        }
        onOpenChange(nextOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className='!max-w-3xl !max-h-[90vh] bg-gradient-to-b from-[#0a0a1a] to-[#1a0b2e] border-purple-500/20 text-white overflow-hidden flex flex-col !p-0'>
                <DialogHeader className='px-6 pt-6 pb-2 flex-shrink-0'>
                    <DialogTitle className='text-white text-center text-lg'>
                        {t("manualSelectTitle")}
                    </DialogTitle>
                    <DialogDescription className='text-center text-purple-200/70'>
                        {t("manualSelectDesc", { count: cardsToSelect })}
                    </DialogDescription>
                    <div className='flex items-center justify-center gap-2 mt-2'>
                        <div className='flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1'>
                            <span className='text-sm font-medium text-purple-200'>
                                {t("manualSelected", {
                                    selected: selected.length,
                                    total: cardsToSelect,
                                })}
                            </span>
                        </div>
                        {selected.length > 0 && (
                            <div className='flex gap-1'>
                                {selected.map((c) => (
                                    <div
                                        key={c.name}
                                        className='w-6 h-6 rounded-full bg-purple-500/30 border border-purple-400/50 flex items-center justify-center'
                                        title={c.name}
                                    >
                                        <span className='text-[8px] text-purple-200'>
                                            {selected.indexOf(c) + 1}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div className='flex-1 overflow-y-auto px-4 pb-6 space-y-6 scrollbar-thin'>
                    <CardSection
                        title={t("majorArcana")}
                        cards={majorCards}
                        selectedNames={selectedNames}
                        onToggle={toggleCard}
                        selectionFull={selected.length >= cardsToSelect}
                    />
                    {suitGroups.map((group) => (
                        <CardSection
                            key={group.key}
                            title={`${t("minorArcana")} — ${t(group.key as "cups" | "swords" | "wands" | "pentacles")}`}
                            cards={group.cards}
                            selectedNames={selectedNames}
                            onToggle={toggleCard}
                            selectionFull={selected.length >= cardsToSelect}
                        />
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}

function CardSection({
    title,
    cards,
    selectedNames,
    onToggle,
    selectionFull,
}: {
    title: string
    cards: TarotCard[]
    selectedNames: Set<string>
    onToggle: (card: TarotCard) => void
    selectionFull: boolean
}) {
    return (
        <div>
            <h3 className='text-sm font-semibold text-purple-300/80 mb-3 px-1 uppercase tracking-wider'>
                {title}
            </h3>
            <div className='grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2'>
                {cards.map((card) => {
                    const isSelected = selectedNames.has(card.name)
                    const isDisabled = !isSelected && selectionFull
                    return (
                        <button
                            key={card.slug}
                            type='button'
                            onClick={() => onToggle(card)}
                            disabled={isDisabled}
                            className={cn(
                                "group relative flex flex-col items-center rounded-xl p-1.5 transition-all duration-200",
                                "hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50",
                                isSelected &&
                                    "bg-purple-500/15 ring-2 ring-purple-400/60 shadow-[0_0_20px_rgba(139,92,246,0.3)]",
                                isDisabled && "opacity-40 cursor-not-allowed",
                            )}
                        >
                            <div className='relative w-full aspect-[2/3] rounded-lg overflow-hidden'>
                                <Image
                                    src={cardImagePath(card.name)}
                                    alt={card.name}
                                    fill
                                    className='object-cover transition-transform duration-200 group-hover:scale-105'
                                    sizes='(max-width: 640px) 80px, (max-width: 768px) 96px, 100px'
                                />
                                {isSelected && (
                                    <div className='absolute inset-0 bg-purple-600/30 flex items-center justify-center'>
                                        <div className='w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center shadow-lg'>
                                            <Check className='w-4 h-4 text-white' />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <span
                                className={cn(
                                    "mt-1 text-[10px] leading-tight text-center text-white/60 line-clamp-2 w-full",
                                    isSelected && "text-purple-200 font-medium",
                                )}
                            >
                                {card.name}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
