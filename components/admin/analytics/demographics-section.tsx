"use client"

import { UsersRound } from "lucide-react"
import { useTranslations } from "next-intl"
import type { DemographicsAnalytics } from "@/lib/admin/analytics-shared"
import { AnalyticsSection } from "./section-card"
import { HBars, type HBarItem } from "./h-bars"

// Age and location are magnitude across ordered / ranked categories, so each
// gets one hue — a second hue there would imply an identity that isn't real.
const AGE_COLOR = "#fbbf24"
const LOCATION_COLOR = "#38bdf8"

// Gender is identity, so it gets categorical hues, assigned in a fixed order
// and never recycled. Validated for CVD separation against this dark surface
// (worst adjacent pair ΔE 17.6 protan / 15.4 tritan, all >= 3:1 contrast).
// Deliberately not pink-for-female / blue-for-male. "Prefer not to say" and
// "not set" are absence of an answer rather than identities, so they stay
// neutral. Every bar is direct-labelled, so colour is never the only cue.
const GENDER_COLORS: Record<string, string> = {
    male: "#fb7185",
    female: "#a78bfa",
    "non-binary": "#34d399",
    other: "#94a3b8",
    "prefer-not-to-say": "#64748b",
    unknown: "#475569",
}

const AGE_KEYS = [
    "under18",
    "18to24",
    "25to34",
    "35to44",
    "45to54",
    "55to64",
    "65plus",
] as const

/** "N of M (x%)" — the denominator each breakdown was actually measured over. */
function coverage(known: number, total: number): string {
    const pct = total > 0 ? Math.round((known / total) * 100) : 0
    return `${known.toLocaleString()} / ${total.toLocaleString()} · ${pct}%`
}

export function DemographicsSection({
    demographics,
    loading,
    error,
    errorDetail,
}: {
    demographics: DemographicsAnalytics | null
    loading: boolean
    error: boolean
    errorDetail?: string | null
}) {
    const t = useTranslations("Admin")

    const ageTotal = demographics
        ? demographics.age.known + demographics.age.unknown
        : 0
    const genderTotal = demographics
        ? demographics.gender.known + demographics.gender.unknown
        : 0
    const locationTotal = demographics
        ? demographics.location.known + demographics.location.unknown
        : 0

    const ageItems: HBarItem[] = AGE_KEYS.map((key) => ({
        key,
        label: t(`demoAge.${key}`),
        value:
            demographics?.age.buckets.find((b) => b.key === key)?.count ?? 0,
        color: AGE_COLOR,
    }))

    // Only render gender rows that exist; an all-zero row is noise.
    const genderItems: HBarItem[] = (demographics?.gender.buckets ?? [])
        .filter((b) => b.count > 0)
        .map((b) => ({
            key: b.key,
            label: t(`demoGender.${b.key}`),
            value: b.count,
            color: GENDER_COLORS[b.key] ?? GENDER_COLORS.other,
        }))

    const locationItems: HBarItem[] = (demographics?.location.top ?? []).map(
        (c) => ({
            key: c.country,
            label: c.country,
            value: c.count,
            color: LOCATION_COLOR,
        }),
    )

    const hasAge = (demographics?.age.known ?? 0) > 0
    const hasGender = genderItems.some((g) => g.key !== "unknown")
    const hasLocation = locationItems.length > 0

    return (
        <AnalyticsSection
            label={t("demoSectionLabel")}
            title={t("demoTitle")}
            icon={<UsersRound className="h-4 w-4" />}
            loading={loading}
            error={error}
            errorDetail={errorDetail}
            empty={!demographics || demographics.actors === 0}
            emptyHint={t("demoEmptyHint")}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                    <Stat
                        label={t("demoKnownPeople")}
                        value={(demographics?.actors ?? 0).toLocaleString()}
                        sub={t("demoKnownPeopleSub")}
                    />
                    <Stat
                        label={t("demoMedianAge")}
                        value={
                            demographics?.age.median != null
                                ? Math.round(demographics.age.median).toString()
                                : "—"
                        }
                        sub={coverage(
                            demographics?.age.known ?? 0,
                            ageTotal,
                        )}
                    />
                    <Stat
                        label={t("demoCountries")}
                        value={(
                            demographics?.location.distinct ?? 0
                        ).toLocaleString()}
                        sub={coverage(
                            demographics?.location.known ?? 0,
                            locationTotal,
                        )}
                    />
                </div>

                {hasAge ? (
                    <Card
                        title={t("demoAgeTitle")}
                        note={t("demoCoverage", {
                            coverage: coverage(
                                demographics?.age.known ?? 0,
                                ageTotal,
                            ),
                        })}
                    >
                        <HBars items={ageItems} defaultColor={AGE_COLOR} />
                    </Card>
                ) : null}

                {hasGender ? (
                    <Card
                        title={t("demoGenderTitle")}
                        // Gender is only ever asked of signed-in users, so the
                        // denominator is them — not everyone we have data on.
                        note={t("demoGenderCoverage", {
                            coverage: coverage(
                                demographics?.gender.known ?? 0,
                                genderTotal,
                            ),
                        })}
                    >
                        <HBars items={genderItems} />
                    </Card>
                ) : null}

                {hasLocation ? (
                    <Card
                        title={t("demoLocationTitle")}
                        note={t("demoCoverage", {
                            coverage: coverage(
                                demographics?.location.known ?? 0,
                                locationTotal,
                            ),
                        })}
                    >
                        <HBars
                            items={locationItems}
                            defaultColor={LOCATION_COLOR}
                        />
                    </Card>
                ) : null}
            </div>
        </AnalyticsSection>
    )
}

function Stat({
    label,
    value,
    sub,
}: {
    label: string
    value: string
    sub?: string
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs font-medium text-white/55">{label}</p>
            <p className="mt-1.5 font-serif text-2xl font-semibold text-white">
                {value}
            </p>
            {sub ? (
                <p className="mt-0.5 text-[11px] text-white/35">{sub}</p>
            ) : null}
        </div>
    )
}

function Card({
    title,
    note,
    children,
}: {
    title: string
    note: string
    children: React.ReactNode
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-white/75">{title}</p>
                <p className="text-[11px] text-white/35">{note}</p>
            </div>
            {children}
        </div>
    )
}
