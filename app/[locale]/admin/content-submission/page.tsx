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
import type { AdminContentSubmissionItem } from "@/app/api/admin/content-submissions/route"

function statusTone(
    status: string,
): "neutral" | "emerald" | "amber" | "rose" {
    if (status === "verified") return "emerald"
    if (status === "failed") return "rose"
    if (status === "manual_review") return "amber"
    return "neutral" // pending
}

export default function AdminContentSubmissionPage() {
    const t = useTranslations("Admin")
    const [search, setSearch] = useState("")
    const q = useDebouncedValue(search.trim(), 300)
    const { items, total, hasMore, loading, error, loadMore } =
        useAdminList<AdminContentSubmissionItem>(
            `/api/admin/content-submissions${q ? `?q=${encodeURIComponent(q)}` : ""}`,
            { getItemId: (it) => it.id },
        )
    const fmt = useShortDate()

    return (
        <AdminListShell
            title={t("contentSubmissionTitle")}
            total={total}
            count={items.length}
            loading={loading}
            error={error}
            hasMore={hasMore}
            onLoadMore={loadMore}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("searchContentPlaceholder")}
            searching={!!search.trim() && (loading || search.trim() !== q)}
        >
            {items.map((r) => {
                const entries: AdminMenuEntry[] = [
                    r.name && { label: t("copyName"), value: r.name },
                    r.title && { label: t("copyTitle"), value: r.title },
                    { label: t("copyUrl"), value: r.url },
                    r.userId && { label: t("copyUserId"), value: r.userId },
                    r.createdAt && {
                        label: t("copyDate"),
                        value: fmt(r.createdAt),
                    },
                ].filter(Boolean) as AdminMenuEntry[]
                return (
                    <AdminRowMenu key={r.id} entries={entries}>
                        <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                        >
                            <AdminRow
                                avatar={
                                    <UserAvatar
                                        name={r.name}
                                        src={r.avatarUrl}
                                        anonymous={!r.userId}
                                    />
                                }
                                title={r.title || r.url}
                                subtitle={r.name || r.userId || t("unnamedUser")}
                                badge={
                                    <AdminBadge tone={statusTone(r.status)}>
                                        {t(`contentStatus_${r.status}`)}
                                    </AdminBadge>
                                }
                                meta={
                                    <div className="space-y-0.5">
                                        {r.platform ? (
                                            <div className="capitalize text-white/45">
                                                {r.platform}
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
                        </a>
                    </AdminRowMenu>
                )
            })}
        </AdminListShell>
    )
}
