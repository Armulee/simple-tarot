import type { DayData } from "@/lib/calendar-helper"

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
