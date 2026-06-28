/** Shared, server-free types + constants for the admin activity chart. */

export type ActivityGranularity = "day" | "week" | "month"

/** The stat dimensions mirror the dashboard cards. */
export type MetricKey =
    | "totalUsers"
    | "anonymousUsers"
    | "authenticatedUsers"
    | "interpretations"
    | "paidSubscribers"

export const METRIC_KEYS: MetricKey[] = [
    "totalUsers",
    "anonymousUsers",
    "authenticatedUsers",
    "interpretations",
    "paidSubscribers",
]

export type ActivityPoint = {
    /** Bucket start as an ISO date (UTC midnight / month start). */
    date: string
} & Record<MetricKey, number>

export type AdminActivityResponse = {
    granularity: ActivityGranularity
    points: ActivityPoint[]
    totals: Record<MetricKey, number>
}
