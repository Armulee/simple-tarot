"use client"

import { useTranslations } from "next-intl"
import {
    AdminBadge,
    AdminListShell,
    AdminRow,
    UserAvatar,
    useAdminList,
    useShortDate,
} from "@/components/admin/admin-list"
import type { AdminInterpretationItem } from "@/app/api/admin/interpretations/route"

export default function AdminInterpretationsPage() {
    const t = useTranslations("Admin")
    const { items, total, hasMore, loading, error, loadMore } =
        useAdminList<AdminInterpretationItem>("/api/admin/interpretations")
    const fmt = useShortDate()

    return (
        <AdminListShell
            title={t("interpretations")}
            total={total}
            count={items.length}
            loading={loading}
            error={error}
            hasMore={hasMore}
            onLoadMore={loadMore}
        >
            {items.map((r) => (
                <AdminRow
                    key={r.id}
                    avatar={
                        <UserAvatar
                            name={r.ownerName}
                            src={r.ownerAvatarUrl}
                            anonymous={!r.isAuthenticated}
                        />
                    }
                    title={r.question || t("untitledReading")}
                    subtitle={r.snippet || r.cards.join(" · ")}
                    badge={
                        r.isAuthenticated ? (
                            <AdminBadge tone='emerald'>
                                {r.ownerName || t("memberTag")}
                            </AdminBadge>
                        ) : (
                            <AdminBadge>{t("guestTag")}</AdminBadge>
                        )
                    }
                    meta={
                        <div className='space-y-0.5'>
                            <div className='text-white/45'>
                                {t("cardsCount", { count: r.cards.length })}
                            </div>
                            {r.createdAt ? (
                                <div className='text-white/35'>
                                    {fmt(r.createdAt)}
                                </div>
                            ) : null}
                        </div>
                    }
                />
            ))}
        </AdminListShell>
    )
}
