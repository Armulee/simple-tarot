import type { SubscriptionPlanTier } from "@/lib/payments/subscription-plans"

export type PlanTier = SubscriptionPlanTier | "free"

export const FREE_TIER_MAX_CARDS = 3
export const PAID_TIER_MAX_CARDS = 10

export function getMaxCardsForTier(tier: PlanTier | null | undefined): number {
    if (!tier || tier === "free") return FREE_TIER_MAX_CARDS
    return PAID_TIER_MAX_CARDS
}

export function canUseManualCardPick(
    tier: PlanTier | null | undefined,
): boolean {
    return tier === "basic" || tier === "pro"
}

/**
 * Adding a "character" (a saved person with birth data, used for synastry and
 * the life monitor) is a paid feature. Listing/reading existing characters is
 * not gated — only creating new ones.
 */
export function canManageCharacters(
    tier: PlanTier | null | undefined,
): boolean {
    return tier === "basic" || tier === "pro"
}

export function clampCardCountToTier(
    count: number,
    tier: PlanTier | null | undefined,
): number {
    const max = getMaxCardsForTier(tier)
    if (!Number.isFinite(count) || count <= 0) return count
    return Math.min(count, max)
}
