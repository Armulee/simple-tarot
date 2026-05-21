"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Sparkles, WandSparkles } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { CARD_UI_TEXT, normalizeLocale } from "@/components/chat/card-ui"
import DrawCardSection from "@/components/chat/draw-card-section"
import type { PaywallNotice } from "@/components/chat/types"
import { PaywallDialog } from "@/components/subscription/paywall-dialog"

type PaywallBlockProps = {
    data: PaywallNotice
    /**
     * Called when the user picks the tarot fallback inside this block. Wired
     * up through message-list → session so the chat re-runs the original
     * question as a tarot reading. Optional — when absent, only the upgrade
     * pill is shown.
     */
    onCardsSelected?: (cards: { name: string; isReversed: boolean }[]) => void
}

/**
 * Inline assistant block shown when /api/horoscope/extract returns a
 * reply strategy of "rejected" (currently: free user asking about another
 * person's chart). The message reads as a friendly aside: a violet/indigo
 * gradient card with the "Upgrade" CTA inlined as a pill inside the
 * sentence and a sibling "draw a card instead" pill that swaps the body
 * for a {@link DrawCardSection}, mirroring the horoscope-auth-gate block.
 */
export default function PaywallBlock({
    data,
    onCardsSelected,
}: PaywallBlockProps) {
    const t = useTranslations("HoroscopeChat.paywallOtherPerson")
    const locale = useLocale()
    const cardUi = useMemo(
        () => CARD_UI_TEXT[normalizeLocale(locale)],
        [locale],
    )

    const [dialogOpen, setDialogOpen] = useState(false)
    const [showDraw, setShowDraw] = useState(false)

    const [selectedCount, setSelectedCount] = useState(0)
    const [cardsToSelect, setCardsToSelect] = useState(1)
    const [shuffleFn, setShuffleFn] = useState<(() => void) | null>(null)
    const [pickFn, setPickFn] = useState<((times?: number) => void) | null>(
        null,
    )
    const [hasSubmittedCards, setHasSubmittedCards] = useState(false)
    const selectByIndicesRef = useRef<((indices: number[]) => void) | null>(
        null,
    )
    const [selectionResetSignal, setSelectionResetSignal] = useState(0)

    const handleCardsToSelectChange = useCallback(
        (nextCount: number) => {
            const boundedCount = Math.max(
                1,
                Math.min(10, Math.floor(nextCount)),
            )
            setCardsToSelect(boundedCount)
            if (selectedCount > boundedCount) {
                setSelectedCount(0)
                setSelectionResetSignal((s) => s + 1)
            }
        },
        [selectedCount],
    )

    const handleFallbackCardsSelected = useCallback(
        (cards: { name: string; isReversed: boolean }[]) => {
            onCardsSelected?.(cards)
            setHasSubmittedCards(true)
        },
        [onCardsSelected],
    )

    const canOfferDrawFallback = Boolean(onCardsSelected)

    return (
        <div className='w-full md:max-w-[85%] space-y-4 text-white/90 leading-relaxed'>
            <div className='w-fit relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/[0.16] via-slate-950/50 to-indigo-950/35 px-3 py-3 shadow-[0_12px_40px_-16px_rgba(139,92,246,0.3),0_8px_32px_-18px_rgba(99,102,241,0.22)] backdrop-blur-xl ring-1 ring-white/[0.06] sm:px-4 sm:py-4'>
                <div
                    aria-hidden
                    className='pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-violet-500/25 blur-3xl'
                />
                <div
                    aria-hidden
                    className='pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-indigo-400/15 blur-3xl'
                />
                <div
                    aria-hidden
                    className='pointer-events-none absolute left-1/2 top-0 h-px w-[min(100%,20rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent'
                />
                <p className='relative text-[12px] leading-[1.75] text-white/[0.92] sm:text-[13px]'>
                    {t.rich("intro", {
                        upgradePill: (chunks) => (
                            <button
                                type='button'
                                onClick={() => setDialogOpen(true)}
                                className='mx-0.5 inline-flex items-center gap-1.5 align-middle rounded-full border border-violet-400/45 bg-gradient-to-r from-[#a78bfa]/28 via-indigo-500/22 to-purple-600/20 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-[0_6px_24px_-8px_rgba(139,92,246,0.45)] transition hover:scale-[1.02] hover:border-violet-300/55 hover:from-[#a78bfa]/35 hover:shadow-[0_10px_32px_-8px_rgba(139,92,246,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0a14] active:scale-[0.98] sm:text-xs'
                            >
                                <Sparkles
                                    aria-hidden
                                    className='size-3 shrink-0 opacity-95'
                                />
                                {chunks}
                            </button>
                        ),
                    })}
                    {canOfferDrawFallback && !showDraw && !hasSubmittedCards ? (
                        <>
                            {" "}
                            {t.rich("drawSuffix", {
                                drawPill: (chunks) => (
                                    <button
                                        type='button'
                                        onClick={() => setShowDraw(true)}
                                        className='mx-0.5 inline-flex items-center gap-1.5 align-middle rounded-full border border-amber-300/45 bg-gradient-to-r from-amber-400/25 via-amber-300/15 to-orange-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-50 shadow-[0_6px_24px_-8px_rgba(251,191,36,0.4)] transition hover:scale-[1.02] hover:border-amber-200/55 hover:from-amber-400/35 hover:shadow-[0_10px_32px_-8px_rgba(251,191,36,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0a14] active:scale-[0.98] sm:text-xs'
                                    >
                                        <WandSparkles
                                            aria-hidden
                                            className='size-3 shrink-0 opacity-95'
                                        />
                                        {chunks}
                                    </button>
                                ),
                            })}
                        </>
                    ) : null}
                </p>
            </div>

            {showDraw && !hasSubmittedCards && canOfferDrawFallback && (
                <>
                    <p className='leading-relaxed sm:text-xs'>
                        {t("fallback")}
                    </p>
                    <div className='[&_.text-muted-foreground]:text-white/55'>
                        <DrawCardSection
                            cardsToSelect={cardsToSelect}
                            shortQuestion={t("deckCaption")}
                            selectedCount={selectedCount}
                            cardUi={cardUi}
                            shuffleFn={shuffleFn}
                            pickFn={pickFn}
                            onCardsSelected={handleFallbackCardsSelected}
                            onSelectedCountChange={setSelectedCount}
                            onCardsToSelectChange={handleCardsToSelectChange}
                            onProvideShuffle={(fn) => {
                                setShuffleFn(() => fn)
                            }}
                            onProvideRandomPick={(fn) => {
                                setPickFn(() => fn)
                            }}
                            onProvideSelectByIndices={(fn) => {
                                selectByIndicesRef.current = fn
                            }}
                            selectionResetSignal={selectionResetSignal}
                        />
                    </div>
                </>
            )}

            <PaywallDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                requiredTier={data.requiredTier}
                title={t("paywallTitle")}
                description={t("paywallDesc")}
                feature={t("paywallFeature")}
                insufficientLabel={t("paywallInsufficient")}
                footnote={t("paywallNote")}
            />
        </div>
    )
}
