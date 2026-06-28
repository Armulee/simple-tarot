"use client"

import { useCallback, useMemo, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import {
    AdminBadge,
    AdminListShell,
    AdminRow,
    AdminRowMenu,
    UserAvatar,
    useAdminList,
    useDebouncedValue,
    useDeleteRequest,
    useShortDate,
    type AdminMenuEntry,
    type DeleteRequestItem,
} from "@/components/admin/admin-list"
import { Checkbox } from "@/components/ui/checkbox"
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
    const { request, requesting } = useDeleteRequest("revenue")

    const [selectMode, setSelectMode] = useState(false)
    const [selected, setSelected] = useState<Set<string>>(new Set())

    const exitSelect = useCallback(() => {
        setSelectMode(false)
        setSelected(new Set())
    }, [])

    const toggleOne = useCallback((id: string) => {
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const allOnPageSelected = useMemo(
        () => items.length > 0 && items.every((it) => selected.has(it.id)),
        [items, selected],
    )

    const toggleAll = useCallback(() => {
        setSelected((prev) => {
            if (items.length > 0 && items.every((it) => prev.has(it.id))) {
                const next = new Set(prev)
                for (const it of items) next.delete(it.id)
                return next
            }
            const next = new Set(prev)
            for (const it of items) next.add(it.id)
            return next
        })
    }, [items])

    const summarize = useCallback(
        (r: AdminRevenueItem): DeleteRequestItem => ({
            id: r.id,
            title: formatAmount(r.amountUsd, r.currency),
            subtitle: r.name || r.userId || null,
        }),
        [],
    )

    const handleDelete = useCallback(async () => {
        if (requesting) return
        const chosen = items.filter((it) => selected.has(it.id)).map(summarize)
        const ok = await request(chosen)
        if (ok) exitSelect()
    }, [requesting, items, selected, summarize, request, exitSelect])

    const selectedCount = selected.size

    const toolbar =
        items.length === 0 && !selectMode ? null : (
            <div className="flex items-center justify-between gap-3">
                {selectMode ? (
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={toggleAll}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/10"
                        >
                            <Checkbox
                                checked={allOnPageSelected}
                                className="pointer-events-none border-white/30 data-[state=checked]:border-amber-400 data-[state=checked]:bg-amber-400 data-[state=checked]:text-black"
                            />
                            {t("selectAll")}
                        </button>
                        <span className="text-sm text-white/55">
                            {t("selectedCount", { count: selectedCount })}
                        </span>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setSelectMode(true)}
                        className="rounded-lg border border-white/12 bg-white/5 px-4 py-1.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/10"
                    >
                        {t("select")}
                    </button>
                )}

                {selectMode ? (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={exitSelect}
                            disabled={requesting}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/55 transition-colors hover:text-white/80 disabled:opacity-50"
                        >
                            {t("cancel")}
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={selectedCount === 0 || requesting}
                            className="inline-flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/15 px-4 py-1.5 text-sm font-medium text-rose-200 transition-colors hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {requesting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}
                            {requesting ? t("requestSending") : t("delete")}
                        </button>
                    </div>
                ) : null}
            </div>
        )

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
            toolbar={toolbar}
        >
            {items.map((r) => {
                const row = (
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
                )

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

                const onDelete = () => void request([summarize(r)])

                if (!selectMode)
                    return (
                        <AdminRowMenu
                            key={r.id}
                            entries={entries}
                            onDelete={onDelete}
                        >
                            {row}
                        </AdminRowMenu>
                    )

                const checked = selected.has(r.id)
                return (
                    <AdminRowMenu key={r.id} entries={entries} onDelete={onDelete}>
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleOne(r.id)}
                            onKeyDown={(e) => {
                                if (e.key === " " || e.key === "Enter") {
                                    e.preventDefault()
                                    toggleOne(r.id)
                                }
                            }}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl transition-colors ${
                                checked ? "bg-amber-400/[0.06]" : ""
                            }`}
                        >
                            <Checkbox
                                checked={checked}
                                className="ml-1 size-5 shrink-0 border-white/30 data-[state=checked]:border-amber-400 data-[state=checked]:bg-amber-400 data-[state=checked]:text-black"
                            />
                            <div className="min-w-0 flex-1">{row}</div>
                        </div>
                    </AdminRowMenu>
                )
            })}
        </AdminListShell>
    )
}
