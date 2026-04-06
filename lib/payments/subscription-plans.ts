import type { CurrencyCode } from "@/lib/payments/currency-utils"

export type BillingCycle = "monthly" | "annual"
export type SubscriptionPlanId = "basic" | "pro"
export type SubscriptionPlanTier = "basic" | "pro"
export type SubscriptionPlanKey = `${SubscriptionPlanTier}_${BillingCycle}`

type BillingDetails = {
    priceUsd: number
    priceThb: number
    stars: number
}

type SubscriptionPlan = {
    id: SubscriptionPlanId
    nameKey: "basicPlan" | "proPlan"
    descriptionKey: "basicDescription" | "proDescription"
    badgeKey?: "mostPopular"
    billing?: Record<BillingCycle, BillingDetails>
    priceIds?: Record<BillingCycle, string>
    priceIdsThb?: Record<BillingCycle, string>
    ctaKey: "subscribeNow"
}

const BASIC_MONTHLY_STARS = 100
const PRO_MONTHLY_STARS = 599

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
        id: "basic",
        nameKey: "basicPlan",
        descriptionKey: "basicDescription",
        billing: {
            monthly: { priceUsd: 2.99, priceThb: 109, stars: BASIC_MONTHLY_STARS },
            annual: { priceUsd: 29.99, priceThb: 1099, stars: BASIC_MONTHLY_STARS * 12 },
        },
        priceIds: {
            monthly: process.env.NEXT_PUBLIC_BASIC_MONTHLY_PRICE_ID ?? "",
            annual: process.env.NEXT_PUBLIC_BASIC_ANNUAL_PRICE_ID ?? "",
        },
        priceIdsThb: {
            monthly: process.env.NEXT_PUBLIC_BASIC_MONTHLY_PRICE_ID_THB ?? "",
            annual: process.env.NEXT_PUBLIC_BASIC_ANNUAL_PRICE_ID_THB ?? "",
        },
        ctaKey: "subscribeNow",
    },
    {
        id: "pro",
        nameKey: "proPlan",
        descriptionKey: "proDescription",
        badgeKey: "mostPopular",
        billing: {
            monthly: { priceUsd: 14.99, priceThb: 539, stars: PRO_MONTHLY_STARS },
            annual: { priceUsd: 149.99, priceThb: 5399, stars: PRO_MONTHLY_STARS * 12 },
        },
        priceIds: {
            monthly: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID ?? "",
            annual: process.env.NEXT_PUBLIC_PRO_ANNUAL_PRICE_ID ?? "",
        },
        priceIdsThb: {
            monthly: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID_THB ?? "",
            annual: process.env.NEXT_PUBLIC_PRO_ANNUAL_PRICE_ID_THB ?? "",
        },
        ctaKey: "subscribeNow",
    },
]

const PLAN_PRICE_USD: Record<SubscriptionPlanKey, number> = {
    basic_monthly: 2.99,
    basic_annual: 29.99,
    pro_monthly: 14.99,
    pro_annual: 149.99,
}

const PLAN_PRICE_THB: Record<SubscriptionPlanKey, number> = {
    basic_monthly: 109,
    basic_annual: 1099,
    pro_monthly: 539,
    pro_annual: 5399,
}

const PLAN_PRICE_ID_MAP: Record<SubscriptionPlanKey, string> = {
    basic_monthly: process.env.NEXT_PUBLIC_BASIC_MONTHLY_PRICE_ID ?? "",
    basic_annual: process.env.NEXT_PUBLIC_BASIC_ANNUAL_PRICE_ID ?? "",
    pro_monthly: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID ?? "",
    pro_annual: process.env.NEXT_PUBLIC_PRO_ANNUAL_PRICE_ID ?? "",
}

const PLAN_PRICE_ID_THB_MAP: Record<SubscriptionPlanKey, string> = {
    basic_monthly: process.env.NEXT_PUBLIC_BASIC_MONTHLY_PRICE_ID_THB ?? "",
    basic_annual: process.env.NEXT_PUBLIC_BASIC_ANNUAL_PRICE_ID_THB ?? "",
    pro_monthly: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID_THB ?? "",
    pro_annual: process.env.NEXT_PUBLIC_PRO_ANNUAL_PRICE_ID_THB ?? "",
}

export function getPlanPrice(
    tier: SubscriptionPlanTier,
    cycle: BillingCycle,
    currency: CurrencyCode = "USD",
): number {
    const key: SubscriptionPlanKey = `${tier}_${cycle}`
    if (currency === "THB") return PLAN_PRICE_THB[key]
    return PLAN_PRICE_USD[key]
}

export function getPlanPriceUsd(
    tier: SubscriptionPlanTier,
    cycle: BillingCycle
): number {
    return PLAN_PRICE_USD[`${tier}_${cycle}`]
}

export function getPlanStars(
    tier: SubscriptionPlanTier,
    cycle: BillingCycle
): number {
    const plan = SUBSCRIPTION_PLANS.find((item) => item.id === tier)
    return plan?.billing?.[cycle]?.stars ?? 0
}

export function parseSubscriptionPlanKey(
    raw?: string | null
): { tier: SubscriptionPlanTier; cycle: BillingCycle } | null {
    if (!raw) return null
    const match = raw.toLowerCase().match(/(basic|pro)[-_ ]?(monthly|annual)/)
    if (!match) return null
    return { tier: match[1] as SubscriptionPlanTier, cycle: match[2] as BillingCycle }
}

export function getPlanKeyFromPriceId(
    priceId?: string | null
): SubscriptionPlanKey | null {
    if (!priceId) return null
    const usdMatch = Object.entries(PLAN_PRICE_ID_MAP).find(
        ([, value]) => value && value === priceId
    )
    if (usdMatch) return usdMatch[0] as SubscriptionPlanKey
    const thbMatch = Object.entries(PLAN_PRICE_ID_THB_MAP).find(
        ([, value]) => value && value === priceId
    )
    return (thbMatch?.[0] as SubscriptionPlanKey) ?? null
}

export function getSubscriptionPriceId(
    planId: SubscriptionPlanId,
    cycle: BillingCycle,
    currency: CurrencyCode = "USD",
): string | undefined {
    const plan = SUBSCRIPTION_PLANS.find((item) => item.id === planId)
    if (!plan) return undefined
    if (currency === "THB") {
        const thbId = plan.priceIdsThb?.[cycle]
        if (thbId) return thbId
    }
    return plan.priceIds?.[cycle]
}

export function resolvePlanPriceId(
    plan: (typeof SUBSCRIPTION_PLANS)[number],
    cycle: BillingCycle,
    currency: CurrencyCode,
): string {
    if (currency === "THB") {
        const thbId = plan.priceIdsThb?.[cycle]
        if (thbId) return thbId
    }
    return plan.priceIds?.[cycle] ?? ""
}

export function resolvePlanBillingPrice(
    plan: (typeof SUBSCRIPTION_PLANS)[number],
    cycle: BillingCycle,
    currency: CurrencyCode,
): number | null {
    const billing = plan.billing?.[cycle]
    if (!billing) return null
    return currency === "THB" ? billing.priceThb : billing.priceUsd
}
