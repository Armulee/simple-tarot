"use client"

import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { useStars } from "@/contexts/stars-context"
import { canUseManualCardPick } from "@/lib/payments/plan-limits"
import styles from "./card-article.module.css"

/**
 * Minimal CTA that bridges the meaning-only article chat to an actual reading.
 *
 *  - Paid subscribers (manual card pick unlocked) → reading flow with this
 *    exact card preselected, so they can ask an event question about it.
 *  - Everyone else → the normal tarot deck (random draw) reading entry.
 */
export function CardReadingCta({
    cardName,
    imageSrc,
    deckId,
    isReversed,
    meaning,
    labels,
}: {
    cardName: string
    imageSrc: string
    deckId: number
    isReversed: boolean
    meaning: string
    labels: { paid: string; free: string; note: string }
}) {
    const locale = useLocale()
    const router = useRouter()
    const { subscription } = useStars()
    const tier = subscription?.tier ?? "free"
    const canPreselect = canUseManualCardPick(tier) && deckId >= 0

    const go = () => {
        try {
            if (canPreselect) {
                // Preselect this exact card so the reading opens on it.
                localStorage.setItem(
                    "reading-state-v1",
                    JSON.stringify({
                        question: null,
                        readingType: "simple",
                        selectedCards: [
                            {
                                id: deckId,
                                name: cardName,
                                image: imageSrc,
                                meaning,
                                isReversed,
                            },
                        ],
                        currentStep: "card-selection",
                        interpretation: null,
                        isFollowUp: false,
                        followUpQuestion: null,
                    }),
                )
            } else {
                // Free tier → fresh normal reading (draw from the deck).
                localStorage.removeItem("reading-state-v1")
            }
        } catch {}
        router.push(`/${locale}`)
    }

    return (
        <div className={styles.cta}>
            <button type='button' className={styles.ctaButton} onClick={go}>
                <span>{canPreselect ? labels.paid : labels.free}</span>
                <ArrowRight className={styles.ctaArrow} aria-hidden='true' />
            </button>
            <p className={styles.ctaNote}>{labels.note}</p>
        </div>
    )
}
