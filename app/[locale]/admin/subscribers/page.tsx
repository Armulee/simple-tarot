"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import {
    AdminBadge,
    AdminListShell,
    AdminRow,
    UserAvatar,
    useAdminList,
    useDebouncedValue,
    useShortDate,
} from "@/components/admin/admin-list"
import type { AdminSubscriberItem } from "@/app/api/admin/subscribers/route"

export default function AdminSubscribersPage() {
    const t = useTranslations("Admin")
    const [search, setSearch] = useState("")
    const q = useDebouncedValue(search.trim(), 300)
    const { items, total, hasMore, loading, error, loadMore } =
        useAdminList<AdminSubscriberItem>(
            `/api/admin/subscribers${q ? `?q=${encodeURIComponent(q)}` : ""}`,
        )
    const fmt = useShortDate()

    return (
        <AdminListShell
            title={t("paidSubscribers")}
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
            {items.map((s) => (
                <AdminRow
                    key={s.userId}
                    avatar={<UserAvatar name={s.name} src={s.avatarUrl} />}
                    title={s.name || t("unnamedUser")}
                    subtitle={s.userId}
                    badge={
                        s.plan ? (
                            <AdminBadge tone='amber'>{s.plan}</AdminBadge>
                        ) : undefined
                    }
                    meta={
                        <div className='space-y-0.5'>
                            <div className='capitalize text-emerald-200/80'>
                                {s.status}
                            </div>
                            {s.currentPeriodEnd ? (
                                <div className='text-white/35'>
                                    {t("renewsOn", {
                                        date: fmt(s.currentPeriodEnd),
                                    })}
                                </div>
                            ) : null}
                        </div>
                    }
                />
            ))}
        </AdminListShell>
    )
}
