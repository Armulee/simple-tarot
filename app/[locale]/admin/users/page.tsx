"use client"

import { Suspense, useState } from "react"
import { Star } from "lucide-react"
import { useSearchParams } from "next/navigation"
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
import type { AdminUserItem } from "@/app/api/admin/users/route"

export default function AdminUsersPage() {
    return (
        <Suspense fallback={null}>
            <AdminUsersInner />
        </Suspense>
    )
}

function AdminUsersInner() {
    const t = useTranslations("Admin")
    const sp = useSearchParams()
    const raw = sp.get("filter")
    const filter =
        raw === "anonymous" || raw === "authenticated" ? raw : "all"
    const [search, setSearch] = useState("")
    const q = useDebouncedValue(search.trim(), 300)
    const { items, total, hasMore, loading, error, loadMore } =
        useAdminList<AdminUserItem>(
            `/api/admin/users?filter=${filter}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
        )
    const fmt = useShortDate()

    const title =
        filter === "anonymous"
            ? t("anonymousUsers")
            : filter === "authenticated"
              ? t("authenticatedUsers")
              : t("totalUsers")

    return (
        <AdminListShell
            title={title}
            total={total}
            count={items.length}
            loading={loading}
            error={error}
            hasMore={hasMore}
            onLoadMore={loadMore}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("searchUsersPlaceholder")}
            searching={!!search.trim() && (loading || search.trim() !== q)}
        >
            {items.map((u, i) => {
                const anonymous = u.type === "anonymous"
                return (
                    <AdminRow
                        key={`${u.id}-${i}`}
                        avatar={
                            <UserAvatar
                                name={u.name}
                                src={u.avatarUrl}
                                anonymous={anonymous}
                            />
                        }
                        title={
                            u.name ||
                            (anonymous
                                ? t("anonymousUser")
                                : t("unnamedUser"))
                        }
                        subtitle={u.id}
                        badge={
                            anonymous ? (
                                <AdminBadge>{t("guestTag")}</AdminBadge>
                            ) : (
                                <AdminBadge tone='emerald'>
                                    {t("memberTag")}
                                </AdminBadge>
                            )
                        }
                        meta={
                            <div className='space-y-0.5'>
                                {u.stars != null ? (
                                    <div className='flex items-center justify-end gap-1 text-amber-200/80'>
                                        <Star className='h-3 w-3 fill-current' />
                                        {u.stars.toLocaleString()}
                                    </div>
                                ) : null}
                                {u.createdAt ? (
                                    <div className='text-white/35'>
                                        {fmt(u.createdAt)}
                                    </div>
                                ) : null}
                            </div>
                        }
                    />
                )
            })}
        </AdminListShell>
    )
}
