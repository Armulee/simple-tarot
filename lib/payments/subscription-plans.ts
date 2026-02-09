export type BillingCycle = "monthly" | "annual"
export type SubscriptionPlanId = "basic" | "pro" | "custom"
export type SubscriptionPlanTier = "basic" | "pro"
export type SubscriptionPlanKey = `${SubscriptionPlanTier}_${BillingCycle}`

type BillingDetails = {
    priceUsd: number
    stars: number
}

type SubscriptionPlan = {
    id: SubscriptionPlanId
    nameKey: "basicPlan" | "proPlan" | "customPlan"
    descriptionKey:
        | "basicDescription"
        | "proDescription"
        | "customDescription"
    badgeKey?: "mostPopular"
    billing?: Record<BillingCycle, BillingDetails>
    priceIds?: Record<BillingCycle, string>
    ctaKey: "subscribeNow" | "requestQuote"
    link?: string
}

const BASIC_MONTHLY_STARS = 100
const PRO_MONTHLY_STARS = 599

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
        id: "basic",
        nameKey: "basicPlan",
        descriptionKey: "basicDescription",
        billing: {
            monthly: { priceUsd: 2.99, stars: BASIC_MONTHLY_STARS },
            annual: { priceUsd: 29.99, stars: BASIC_MONTHLY_STARS * 12 },
        },
        priceIds: {
            monthly: process.env.NEXT_PUBLIC_BASIC_MONTHLY_PRICE_ID ?? "",
            annual: process.env.NEXT_PUBLIC_BASIC_ANNUAL_PRICE_ID ?? "",
        },
        ctaKey: "subscribeNow",
    },
    {
        id: "pro",
        nameKey: "proPlan",
        descriptionKey: "proDescription",
        badgeKey: "mostPopular",
        billing: {
            monthly: { priceUsd: 14.99, stars: PRO_MONTHLY_STARS },
            annual: { priceUsd: 149.99, stars: PRO_MONTHLY_STARS * 12 },
        },
        priceIds: {
            monthly: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID ?? "",
            annual: process.env.NEXT_PUBLIC_PRO_ANNUAL_PRICE_ID ?? "",
        },
        ctaKey: "subscribeNow",
    },
    {
        id: "custom",
        nameKey: "customPlan",
        descriptionKey: "customDescription",
        ctaKey: "requestQuote",
        link: "/custom-plan",
    },
]

const PLAN_PRICE_USD: Record<SubscriptionPlanKey, number> = {
    basic_monthly: 2.99,
    basic_annual: 29.99,
    pro_monthly: 14.99,
    pro_annual: 149.99,
}

const PLAN_PRICE_ID_MAP: Record<SubscriptionPlanKey, string> = {
    basic_monthly: process.env.NEXT_PUBLIC_BASIC_MONTHLY_PRICE_ID ?? "",
    basic_annual: process.env.NEXT_PUBLIC_BASIC_ANNUAL_PRICE_ID ?? "",
    pro_monthly: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID ?? "",
    pro_annual: process.env.NEXT_PUBLIC_PRO_ANNUAL_PRICE_ID ?? "",
}

export function getPlanPriceUsd(
    tier: SubscriptionPlanTier,
    cycle: BillingCycle
): number {
    return PLAN_PRICE_USD[`${tier}_${cycle}`]
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
    const match = Object.entries(PLAN_PRICE_ID_MAP).find(
        ([, value]) => value && value === priceId
    )
    return (match?.[0] as SubscriptionPlanKey) ?? null
}

export function getSubscriptionPriceId(
    planId: SubscriptionPlanId,
    cycle: BillingCycle
): string | undefined {
    const plan = SUBSCRIPTION_PLANS.find((item) => item.id === planId)
    return plan?.priceIds?.[cycle]
}
