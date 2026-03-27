"use client"

import React, { useState, useCallback } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Check, RotateCcw } from "lucide-react"
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
    return name.toLowerCase().replace(/\s+/g, "-")
}

function cardImagePath(name: string): string {
    return `/assets/rider-waite-tarot/${cardSlug(name)}.png`
}

const majorCards = TAROT_CARDS.filter((c) => c.arcana === "major")
const suitGroups: { key: string; suit: string; cards: TarotCard[] }[] = [
    {
        key: "cups",
        suit: "Cups",
        cards: TAROT_CARDS.filter((c) => c.suit === "cups"),
    },
    {
        key: "wands",
        suit: "Wands",
        cards: TAROT_CARDS.filter((c) => c.suit === "wands"),
    },
    {
        key: "swords",
        suit: "Swords",
        cards: TAROT_CARDS.filter((c) => c.suit === "swords"),
    },
    {
        key: "pentacles",
        suit: "Pentacles",
        cards: TAROT_CARDS.filter((c) => c.suit === "pentacles"),
    },
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
    const [isReversedMode, setIsReversedMode] = useState(false)
    const selectedNames = new Set(selected.map((c) => c.name))

    const toggleCard = useCallback(
        (card: TarotCard) => {
            setSelected((prev) => {
                const exists = prev.find((c) => c.name === card.name)
                if (exists) {
                    return prev.filter((c) => c.name !== card.name)
                }
                if (prev.length >= cardsToSelect) return prev
                const next = [
                    ...prev,
                    { name: card.name, isReversed: isReversedMode },
                ]
                if (next.length === cardsToSelect) {
                    setTimeout(() => {
                        onCardsSelected(next)
                        onOpenChange(false)
                    }, 400)
                }
                return next
            })
        },
        [cardsToSelect, onCardsSelected, onOpenChange, isReversedMode],
    )

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setSelected([])
            setIsReversedMode(false)
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

                    <div className='flex items-center justify-center mt-3'>
                        <div className='inline-flex rounded-full bg-white/5 border border-white/10 p-0.5'>
                            <button
                                type='button'
                                onClick={() => setIsReversedMode(false)}
                                className={cn(
                                    "relative px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                                    !isReversedMode
                                        ? "bg-purple-500/80 text-white shadow-lg shadow-purple-500/25"
                                        : "text-white/50 hover:text-white/80",
                                )}
                            >
                                {t("upright")}
                            </button>
                            <button
                                type='button'
                                onClick={() => setIsReversedMode(true)}
                                className={cn(
                                    "relative flex items-center gap-1.5 px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                                    isReversedMode
                                        ? "bg-red-500/70 text-white shadow-lg shadow-red-500/25"
                                        : "text-white/50 hover:text-white/80",
                                )}
                            >
                                <RotateCcw className='w-3.5 h-3.5' />
                                {t("reversedTab")}
                            </button>
                        </div>
                    </div>

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
                                {selected.map((c, idx) => (
                                    <div
                                        key={c.name}
                                        className={cn(
                                            "w-6 h-6 rounded-full border flex items-center justify-center",
                                            c.isReversed
                                                ? "bg-red-500/30 border-red-400/50"
                                                : "bg-purple-500/30 border-purple-400/50",
                                        )}
                                        title={`${c.name}${c.isReversed ? " (Reversed)" : ""}`}
                                    >
                                        <span
                                            className={cn(
                                                "text-[8px]",
                                                c.isReversed
                                                    ? "text-red-200"
                                                    : "text-purple-200",
                                            )}
                                        >
                                            {idx + 1}
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
                        selected={selected}
                        selectedNames={selectedNames}
                        onToggle={toggleCard}
                        selectionFull={selected.length >= cardsToSelect}
                        isReversedMode={isReversedMode}
                    />
                    {suitGroups.map((group) => (
                        <CardSection
                            key={group.key}
                            title={`${t("minorArcana")} — ${t(group.key as "cups" | "swords" | "wands" | "pentacles")}`}
                            cards={group.cards}
                            selected={selected}
                            selectedNames={selectedNames}
                            onToggle={toggleCard}
                            selectionFull={selected.length >= cardsToSelect}
                            isReversedMode={isReversedMode}
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
    selected,
    selectedNames,
    onToggle,
    selectionFull,
    isReversedMode,
}: {
    title: string
    cards: TarotCard[]
    selected: BasicCard[]
    selectedNames: Set<string>
    onToggle: (card: TarotCard) => void
    selectionFull: boolean
    isReversedMode: boolean
}) {
    return (
        <div>
            <h3 className='text-sm font-semibold text-purple-300/80 mb-3 px-1 uppercase tracking-wider'>
                {title}
            </h3>
            <div className='grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2'>
                {cards.map((card) => {
                    const isSelected = selectedNames.has(card.name)
                    const selectedCard = selected.find(
                        (c) => c.name === card.name,
                    )
                    const isDisabled = !isSelected && selectionFull
                    const showReversed = isSelected
                        ? selectedCard?.isReversed
                        : isReversedMode
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
                                    !selectedCard?.isReversed &&
                                    "bg-purple-500/15 ring-2 ring-purple-400/60 shadow-[0_0_20px_rgba(139,92,246,0.3)]",
                                isSelected &&
                                    selectedCard?.isReversed &&
                                    "bg-red-500/15 ring-2 ring-red-400/60 shadow-[0_0_20px_rgba(239,68,68,0.3)]",
                                isDisabled && "opacity-40 cursor-not-allowed",
                            )}
                        >
                            <div className='relative w-full aspect-[2/3] rounded-lg overflow-hidden'>
                                <Image
                                    src={cardImagePath(card.name)}
                                    alt={card.name}
                                    fill
                                    className={cn(
                                        "object-cover transition-transform duration-300 group-hover:scale-105",
                                        showReversed && "rotate-180",
                                    )}
                                    sizes='(max-width: 640px) 80px, (max-width: 768px) 96px, 100px'
                                />
                                {isSelected && (
                                    <div
                                        className={cn(
                                            "absolute inset-0 flex items-center justify-center",
                                            selectedCard?.isReversed
                                                ? "bg-red-600/30"
                                                : "bg-purple-600/30",
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "w-7 h-7 rounded-full flex items-center justify-center shadow-lg",
                                                selectedCard?.isReversed
                                                    ? "bg-red-500"
                                                    : "bg-purple-500",
                                            )}
                                        >
                                            <Check className='w-4 h-4 text-white' />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <span
                                className={cn(
                                    "mt-1 text-[10px] leading-tight text-center text-white/60 line-clamp-2 w-full",
                                    isSelected &&
                                        !selectedCard?.isReversed &&
                                        "text-purple-200 font-medium",
                                    isSelected &&
                                        selectedCard?.isReversed &&
                                        "text-red-200 font-medium",
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
