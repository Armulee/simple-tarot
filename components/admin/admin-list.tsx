"use client"

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react"
import { ArrowLeft, Loader2, Inbox, Search, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { supabase } from "@/lib/supabase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const PAGE_SIZE = 50

type ListResponse<T> = { items: T[]; total: number; hasMore: boolean }

/** Debounce a fast-changing value (e.g. a search box) before it drives fetches. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delayMs)
        return () => clearTimeout(id)
    }, [value, delayMs])
    return debounced
}

/**
 * Authenticated, paginated fetch for the admin list endpoints. Sends the
 * Supabase session token as a Bearer (the routes gate on the `admins` table)
 * and accumulates pages for a "load more" UX.
 */
export function useAdminList<T>(
    endpoint: string,
    opts?: { getItemId?: (item: T) => string },
) {
    const optGetItemId = opts?.getItemId
    const getItemId = useMemo(
        () => optGetItemId ?? ((item: T) => (item as { id: string }).id),
        [optGetItemId],
    )
    const [items, setItems] = useState<T[]>([])
    const [total, setTotal] = useState(0)
    const [hasMore, setHasMore] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    const fetchPage = useCallback(
        async (offset: number, replace: boolean) => {
            setLoading(true)
            if (replace) setError(false)
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession()
                if (!session) {
                    setError(true)
                    return
                }
                const url = `${endpoint}${endpoint.includes("?") ? "&" : "?"}limit=${PAGE_SIZE}&offset=${offset}`
                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                })
                if (!res.ok) {
                    setError(true)
                    return
                }
                const data = (await res.json()) as ListResponse<T>
                setTotal(data.total ?? 0)
                setHasMore(Boolean(data.hasMore))
                setItems((prev) =>
                    replace ? data.items : [...prev, ...data.items],
                )
            } catch {
                setError(true)
            } finally {
                setLoading(false)
            }
        },
        [endpoint],
    )

    useEffect(() => {
        setItems([])
        void fetchPage(0, true)
    }, [fetchPage])

    const loadMore = useCallback(() => {
        setItems((prev) => {
            void fetchPage(prev.length, false)
            return prev
        })
    }, [fetchPage])

    /** Drop locally after a successful delete, keeping the total in sync. */
    const removeItems = useCallback(
        (ids: string[]) => {
            const idSet = new Set(ids)
            setItems((prev) => {
                const next = prev.filter((it) => !idSet.has(getItemId(it)))
                setTotal((t) => Math.max(0, t - (prev.length - next.length)))
                return next
            })
        },
        [getItemId],
    )

    return { items, total, hasMore, loading, error, loadMore, removeItems }
}

/** Round avatar with the user's photo, falling back to a gradient initial. */
export function UserAvatar({
    name,
    src,
    anonymous = false,
}: {
    name?: string | null
    src?: string | null
    anonymous?: boolean
}) {
    const initial = (name?.trim()?.[0] ?? (anonymous ? "?" : "·")).toUpperCase()
    return (
        <Avatar className='size-10 shrink-0 ring-1 ring-white/10'>
            {src ? <AvatarImage src={src} alt={name ?? ""} /> : null}
            <AvatarFallback
                className={
                    anonymous
                        ? "bg-gradient-to-br from-slate-500/40 to-slate-700/30 text-sm font-semibold text-white/80"
                        : "bg-gradient-to-br from-violet-500/45 to-purple-600/35 text-sm font-semibold text-white"
                }
            >
                {initial}
            </AvatarFallback>
        </Avatar>
    )
}

/** A single list row: avatar, title + subtitle, optional right-aligned meta. */
export function AdminRow({
    avatar,
    title,
    subtitle,
    meta,
    badge,
}: {
    avatar: ReactNode
    title: ReactNode
    subtitle?: ReactNode
    meta?: ReactNode
    badge?: ReactNode
}) {
    return (
        <div className='flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 transition-colors hover:border-white/15 hover:bg-white/[0.06]'>
            {avatar}
            <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-2'>
                    <p className='truncate text-sm font-medium text-white/90'>
                        {title}
                    </p>
                    {badge}
                </div>
                {subtitle ? (
                    <p className='truncate text-xs text-white/45'>{subtitle}</p>
                ) : null}
            </div>
            {meta ? (
                <div className='shrink-0 text-right text-xs text-white/50'>
                    {meta}
                </div>
            ) : null}
        </div>
    )
}

export function AdminBadge({
    children,
    tone = "neutral",
}: {
    children: ReactNode
    tone?: "neutral" | "emerald" | "amber" | "rose"
}) {
    const tones = {
        neutral: "border-white/15 bg-white/5 text-white/60",
        emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
        amber: "border-amber-400/25 bg-amber-400/10 text-amber-200",
        rose: "border-rose-400/25 bg-rose-400/10 text-rose-200",
    }
    return (
        <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${tones[tone]}`}
        >
            {children}
        </span>
    )
}

/** Page shell: back link, title + count, then the list / state slots. */
export function AdminListShell({
    title,
    subtitle,
    total,
    loading,
    error,
    count,
    hasMore,
    onLoadMore,
    searchValue,
    onSearchChange,
    searchPlaceholder,
    searching,
    toolbar,
    children,
}: {
    title: string
    subtitle?: string
    total: number
    loading: boolean
    error: boolean
    count: number
    hasMore: boolean
    onLoadMore: () => void
    searchValue?: string
    onSearchChange?: (value: string) => void
    searchPlaceholder?: string
    /** True while a typed query is still settling / fetching. */
    searching?: boolean
    /** Optional row between the search box and the list (e.g. bulk actions). */
    toolbar?: ReactNode
    children: ReactNode
}) {
    const t = useTranslations("Admin")
    const isEmpty = count === 0
    const hasSearch = typeof onSearchChange === "function"

    return (
        <div className='min-h-screen px-6 py-16'>
            <div className='mx-auto max-w-3xl space-y-8'>
                <div>
                    <Link
                        href='/admin'
                        className='inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white/80'
                    >
                        <ArrowLeft className='h-4 w-4' />
                        {t("back")}
                    </Link>
                    <div className='mt-3 flex items-end justify-between gap-3'>
                        <div>
                            <h1 className='font-serif text-2xl font-semibold text-white'>
                                {title}
                            </h1>
                            {subtitle ? (
                                <p className='mt-1 text-sm text-white/55'>
                                    {subtitle}
                                </p>
                            ) : null}
                        </div>
                        <span className='shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white/70'>
                            {total.toLocaleString()}
                        </span>
                    </div>
                </div>

                {hasSearch ? (
                    <div className='relative'>
                        <Search className='pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35' />
                        <input
                            type='text'
                            value={searchValue ?? ""}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            placeholder={searchPlaceholder ?? t("searchPlaceholder")}
                            className='w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-10 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-amber-400/40 focus:bg-white/[0.06]'
                        />
                        {searching ? (
                            <Loader2 className='absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/40' />
                        ) : searchValue ? (
                            <button
                                type='button'
                                aria-label='Clear'
                                onClick={() => onSearchChange?.("")}
                                className='absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/70'
                            >
                                <X className='h-4 w-4' />
                            </button>
                        ) : null}
                    </div>
                ) : null}

                {toolbar}

                {error ? (
                    <div className='rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-8 text-center text-sm text-rose-200/80'>
                        {t("listError")}
                    </div>
                ) : loading && isEmpty ? (
                    <div className='flex items-center justify-center py-16 text-white/40'>
                        <Loader2 className='h-6 w-6 animate-spin' />
                    </div>
                ) : isEmpty ? (
                    <div className='flex flex-col items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-16 text-center text-white/40'>
                        <Inbox className='h-7 w-7' />
                        <p className='text-sm'>
                            {hasSearch && (searchValue ?? "").trim()
                                ? t("noResults")
                                : t("listEmpty")}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className='space-y-2.5'>{children}</div>
                        {hasMore ? (
                            <div className='flex justify-center pt-2'>
                                <button
                                    type='button'
                                    onClick={onLoadMore}
                                    disabled={loading}
                                    className='inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 disabled:opacity-50'
                                >
                                    {loading ? (
                                        <Loader2 className='h-4 w-4 animate-spin' />
                                    ) : null}
                                    {t("loadMore")}
                                </button>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    )
}

/** Locale-aware short date + time for list rows. */
export function useShortDate() {
    return (iso: string | null) => {
        if (!iso) return ""
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return ""
        return d.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }
}
