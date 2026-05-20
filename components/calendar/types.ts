import type { DayData } from "@/lib/calendar-helper"
import type { PersonalizedTransitAspectsResult } from "@/lib/astrology/transit-aspects"

export type MonthKey = string
export type DaysMap = Record<string, DayData | null>

export type MonthFetchState =
    | { status: "idle" }
    | { status: "loading" }
    | {
          status: "ok"
          days: DaysMap
          source: "codex" | "swisseph_fallback"
      }
    | { status: "error"; message: string }

export type TransitDayFetchState =
    | { status: "loading" }
    | {
          status: "ok"
          chartData: Record<string, unknown>
          personalizedTransitAspects: PersonalizedTransitAspectsResult | null
      }
    | { status: "error"; message: string }
