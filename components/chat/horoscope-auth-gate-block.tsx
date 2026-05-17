"use client"

import Link from "next/link"
import { useCallback, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { FaStar } from "react-icons/fa6"
import { LogIn } from "lucide-react"
import type { HoroscopeAuthGate } from "@/components/chat/types"
import { CARD_UI_TEXT, normalizeLocale } from "@/components/chat/card-ui"
import DrawCardSection from "@/components/chat/draw-card-section"
import { useAuth } from "@/hooks/use-auth"

type HoroscopeAuthGateBlockProps = {
    data: HoroscopeAuthGate
    onCardsSelected: (cards: { name: string; isReversed: boolean }[]) => void
}

/**
 * Inline assistant block shown when the AI classifies the question as a
 * horoscope reading but the visitor is not signed in. The message tells the
 * user that horoscope requires authentication, surfaces a sign-in link, and
 * offers a tarot fallback using the shared {@link DrawCardSection} component.
 */
export function HoroscopeAuthGateBlock({
    data,
    onCardsSelected,
}: HoroscopeAuthGateBlockProps) {
    const t = useTranslations("Home.horoscopeAuthGate")
    const locale = useLocale()
    const { user } = useAuth()
    const isAuthenticated = Boolean(user)
    const cardUi = useMemo(
        () => CARD_UI_TEXT[normalizeLocale(locale)],
        [locale],
    )

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
            onCardsSelected(cards)
            setHasSubmittedCards(true)
        },
        [onCardsSelected],
    )

    return (
        <div className='w-full md:max-w-[85%] space-y-4 text-white/90 leading-relaxed'>
            <div className='w-fit relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/[0.14] via-slate-950/50 to-blue-950/35 px-3 py-3 shadow-[0_12px_40px_-16px_rgba(59,130,246,0.25),0_8px_32px_-18px_rgba(99,102,241,0.2)] backdrop-blur-xl ring-1 ring-white/[0.06] sm:px-4 sm:py-4'>
                <div
                    aria-hidden
                    className='pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-blue-500/25 blur-3xl'
                />
                <div
                    aria-hidden
                    className='pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-cyan-400/12 blur-3xl'
                />
                <div
                    aria-hidden
                    className='pointer-events-none absolute left-1/2 top-0 h-px w-[min(100%,20rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent'
                />
                <p className='relative text-[12px] leading-[1.7] text-white/[0.9] sm:text-[13px]'>
                    {t.rich(isAuthenticated ? "introSignedIn" : "intro", {
                        pill: (chunks) => (
                            <span className='mx-0.5 inline-flex items-center gap-1 align-middle rounded-full border border-blue-400/45 bg-gradient-to-br from-blue-500/30 to-blue-600/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-blue-100 shadow-[0_0_16px_-6px_rgba(96,165,250,0.5)] ring-1 ring-blue-400/25 sm:text-xs'>
                                <FaStar
                                    aria-hidden
                                    className='size-3 shrink-0 text-blue-300'
                                />
                                {chunks}
                            </span>
                        ),
                    })}
                    {!isAuthenticated && (
                        <>
                            {" "}
                            <Link
                                href={data.signInHref}
                                className='mx-0.5 inline-flex items-center gap-1.5 align-middle rounded-full border border-violet-400/45 bg-gradient-to-r from-[#a78bfa]/28 via-indigo-500/22 to-purple-600/20 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-[0_6px_24px_-8px_rgba(139,92,246,0.45)] transition hover:scale-[1.02] hover:border-violet-300/55 hover:from-[#a78bfa]/35 hover:shadow-[0_10px_32px_-8px_rgba(139,92,246,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0a14] active:scale-[0.98] sm:text-xs'
                            >
                                <LogIn
                                    aria-hidden
                                    className='size-3 shrink-0 opacity-95'
                                />
                                {t("signInLabel")}
                            </Link>{" "}
                            {t("introSuffix")}
                        </>
                    )}
                </p>
            </div>

            <p className='leading-relaxed sm:text-xs'>{t("fallback")}</p>

            {!hasSubmittedCards && (
                <div className='[&_.text-muted-foreground]:text-white/55'>
                    <DrawCardSection
                        cardsToSelect={cardsToSelect}
                        shortQuestion={
                            data.question?.trim()
                                ? data.question.trim()
                                : t(
                                      isAuthenticated
                                          ? "deckCaptionSignedIn"
                                          : "deckCaption",
                                  )
                        }
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
            )}
        </div>
    )
}

export default HoroscopeAuthGateBlock
