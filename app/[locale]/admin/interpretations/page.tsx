"use client"

import { useCallback, useMemo, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
    AdminBadge,
    AdminListShell,
    AdminRow,
    UserAvatar,
    useAdminList,
    useDebouncedValue,
    useShortDate,
} from "@/components/admin/admin-list"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import type { AdminInterpretationItem } from "@/app/api/admin/interpretations/route"

export default function AdminInterpretationsPage() {
    const t = useTranslations("Admin")
    const [search, setSearch] = useState("")
    const q = useDebouncedValue(search.trim(), 300)
    const { items, total, hasMore, loading, error, loadMore, removeItems } =
        useAdminList<AdminInterpretationItem>(
            `/api/admin/interpretations${q ? `?q=${encodeURIComponent(q)}` : ""}`,
        )
    const fmt = useShortDate()

    const [selectMode, setSelectMode] = useState(false)
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [deleting, setDeleting] = useState(false)

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
            // When everything loaded is already selected, clear those ids.
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

    const handleDelete = useCallback(async () => {
        const ids = Array.from(selected)
        if (ids.length === 0 || deleting) return
        if (!window.confirm(t("deleteConfirm", { count: ids.length }))) return

        setDeleting(true)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) throw new Error("NO_SESSION")
            const res = await fetch("/api/admin/interpretations", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ ids }),
            })
            if (!res.ok) throw new Error("DELETE_FAILED")
            removeItems(ids)
            toast.success(t("deleteSuccess", { count: ids.length }))
            exitSelect()
        } catch {
            toast.error(t("deleteError"))
        } finally {
            setDeleting(false)
        }
    }, [selected, deleting, t, removeItems, exitSelect])

    const selectedCount = selected.size

    const toolbar =
        items.length === 0 && !selectMode ? null : (
            <div className='flex items-center justify-between gap-3'>
                {selectMode ? (
                    <div className='flex items-center gap-3'>
                        <button
                            type='button'
                            onClick={toggleAll}
                            className='inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/10'
                        >
                            <Checkbox
                                checked={allOnPageSelected}
                                className='pointer-events-none border-white/30 data-[state=checked]:border-amber-400 data-[state=checked]:bg-amber-400 data-[state=checked]:text-black'
                            />
                            {t("selectAll")}
                        </button>
                        <span className='text-sm text-white/55'>
                            {t("selectedCount", { count: selectedCount })}
                        </span>
                    </div>
                ) : (
                    <button
                        type='button'
                        onClick={() => setSelectMode(true)}
                        className='rounded-lg border border-white/12 bg-white/5 px-4 py-1.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/10'
                    >
                        {t("select")}
                    </button>
                )}

                {selectMode ? (
                    <div className='flex items-center gap-2'>
                        <button
                            type='button'
                            onClick={exitSelect}
                            disabled={deleting}
                            className='rounded-lg px-3 py-1.5 text-sm font-medium text-white/55 transition-colors hover:text-white/80 disabled:opacity-50'
                        >
                            {t("cancel")}
                        </button>
                        <button
                            type='button'
                            onClick={handleDelete}
                            disabled={selectedCount === 0 || deleting}
                            className='inline-flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/15 px-4 py-1.5 text-sm font-medium text-rose-200 transition-colors hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40'
                        >
                            {deleting ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                                <Trash2 className='h-4 w-4' />
                            )}
                            {deleting ? t("deleting") : t("delete")}
                        </button>
                    </div>
                ) : null}
            </div>
        )

    return (
        <AdminListShell
            title={t("interpretations")}
            total={total}
            count={items.length}
            loading={loading}
            error={error}
            hasMore={hasMore}
            onLoadMore={loadMore}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("searchInterpretationsPlaceholder")}
            searching={!!search.trim() && (loading || search.trim() !== q)}
            toolbar={toolbar}
        >
            {items.map((r) => {
                const row = (
                    <AdminRow
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
                )

                if (!selectMode) return <div key={r.id}>{row}</div>

                const checked = selected.has(r.id)
                return (
                    <div
                        key={r.id}
                        role='button'
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
                            className='ml-1 size-5 shrink-0 border-white/30 data-[state=checked]:border-amber-400 data-[state=checked]:bg-amber-400 data-[state=checked]:text-black'
                        />
                        <div className='min-w-0 flex-1'>{row}</div>
                    </div>
                )
            })}
        </AdminListShell>
    )
}
