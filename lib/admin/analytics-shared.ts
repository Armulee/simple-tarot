/** Server-free analytics types shared between the API route and the client. */

export type TrendPoint = { date: string; value: number }

export type ReturningAnalytics = {
    returningUsers: number
    returnRate: number
    repeatRate: number
    avgReturnIntervalDays: number
    trend: TrendPoint[]
}

export type ActiveAnalytics = {
    dau: number
    wau: number
    mau: number
    stickiness: number
    trend: TrendPoint[]
}

export type ReadingAnalytics = {
    total: number
    avgPerUser: number
    median: number
    distribution: { one: number; twoToFive: number; sixPlus: number }
    trend: TrendPoint[]
}

export type EngagementAnalytics = {
    totalSessions: number
    totalMessages: number
    avgQuestionsPerSession: number
    avgSessionDurationSec: number
    trend: TrendPoint[]
}

export type RetentionCurvePoint = {
    day: number
    rate: number | null
    rolling: number | null
}
export type RetentionCohort = {
    week: string
    size: number
    weeks: { n: number; rate: number }[]
}
export type RetentionAnalytics = {
    d1: number
    d7: number
    d30: number
    rollingD1: number
    rollingD7: number
    rollingD30: number
    curve: RetentionCurvePoint[]
    cohorts: RetentionCohort[]
}

export type FunnelStage = { key: string; count: number; pct: number }
export type ConversionAnalytics = { stages: FunnelStage[] }

export type HeatmapAnalytics = {
    /** 7 counts, Monday → Sunday. */
    byDay: number[]
    /** 24 counts, 00:00 → 23:00 (Asia/Bangkok). */
    byHour: number[]
}

export type AnalyticsContext = {
    totalUsers: number
    totalUsersPrev: number
    subscribers: number
    subscribersPrev: number
    revenueAvailable: boolean
    revenueUsd: number
    revenuePrev: number
    newUsersTrend: TrendPoint[]
    subscribersTrend: TrendPoint[]
    revenueTrend: TrendPoint[]
}

/** All-time summary numbers for the top "Data" cards (no date range). */
export type AnalyticsTotals = {
    totalUsers: number
    returningUsers: number
    totalReadings: number
    totalSessions: number
    totalMessages: number
    subscribers: number
    revenueAvailable: boolean
    revenueUsd: number
}

export type KpiFormat = "percent" | "number" | "currency"

export type HeroKpi = {
    key: string
    value: number
    prevValue: number | null
    /** Fractional change vs the previous equal period; null when not comparable. */
    changePct: number | null
    format: KpiFormat
    spark: number[]
    available: boolean
}

export type AdminAnalyticsResponse = {
    hero: HeroKpi[]
    returning: ReturningAnalytics
    active: ActiveAnalytics
    reading: ReadingAnalytics
    engagement: EngagementAnalytics
    retention: RetentionAnalytics
    conversion: ConversionAnalytics
    heatmap: HeatmapAnalytics
    context: AnalyticsContext
    flags: {
        revenueAvailable: boolean
        categoriesAvailable: boolean
        mrrAvailable: boolean
    }
}
