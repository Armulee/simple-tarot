"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import {
    AdminBadge,
    AdminListShell,
    AdminRow,
    AdminRowMenu,
    UserAvatar,
    useAdminList,
    useDebouncedValue,
    useShortDate,
    type AdminMenuEntry,
} from "@/components/admin/admin-list"
import type { AdminRevenueItem } from "@/app/api/admin/revenue/route"

function formatAmount(v: number, currency: string): string {
    return `${currency === "USD" ? "$" : ""}${v.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}${currency !== "USD" ? ` ${currency}` : ""}`
}

export default function AdminRevenuePage() {
    const t = useTranslations("Admin")
    const [search, setSearch] = useState("")
    const q = useDebouncedValue(search.trim(), 300)
    const { items, total, hasMore, loading, error, loadMore } =
        useAdminList<AdminRevenueItem>(
            `/api/admin/revenue${q ? `?q=${encodeURIComponent(q)}` : ""}`,
            { getItemId: (it) => it.id },
        )
    const fmt = useShortDate()

    return (
        <AdminListShell
            title={t("kpiRevenue")}
            total={total}
            count={items.length}
            loading={loading}
            error={error}
            hasMore={hasMore}
            onLoadMore={loadMore}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("searchSubscribersPlaceholder")}
            searching={!!search.trim() && (loading || search.trim() !== q)}
        >
            {items.map((r) => {
                const entries: AdminMenuEntry[] = [
                    r.name && { label: t("copyName"), value: r.name },
                    r.userId && { label: t("copyUserId"), value: r.userId },
                    {
                        label: t("copyAmount"),
                        value: formatAmount(r.amountUsd, r.currency),
                    },
                    r.createdAt && {
                        label: t("copyDate"),
                        value: fmt(r.createdAt),
                    },
                ].filter(Boolean) as AdminMenuEntry[]
                return (
                    <AdminRowMenu key={r.id} entries={entries}>
                        <AdminRow
                            avatar={
                                <UserAvatar
                                    name={r.name}
                                    src={r.avatarUrl}
                                    anonymous={!r.userId}
                                />
                            }
                            title={formatAmount(r.amountUsd, r.currency)}
                            subtitle={r.name || r.userId || t("unnamedUser")}
                            badge={
                                r.status ? (
                                    <AdminBadge
                                        tone={
                                            r.status === "succeeded"
                                                ? "emerald"
                                                : r.status === "refunded"
                                                  ? "rose"
                                                  : "neutral"
                                        }
                                    >
                                        {r.status}
                                    </AdminBadge>
                                ) : undefined
                            }
                            meta={
                                <div className="space-y-0.5">
                                    {r.type ? (
                                        <div className="capitalize text-white/45">
                                            {r.type}
                                        </div>
                                    ) : null}
                                    {r.createdAt ? (
                                        <div className="text-white/35">
                                            {fmt(r.createdAt)}
                                        </div>
                                    ) : null}
                                </div>
                            }
                        />
                    </AdminRowMenu>
                )
            })}
        </AdminListShell>
    )
}
