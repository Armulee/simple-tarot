"use client"

import { useEffect, useState } from "react"
import { Inbox } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { supabase } from "@/lib/supabase"

/** Admin header link to the content-submission queue, badged with the count
 *  of still-unreviewed (pending / manual_review) submissions. */
export function ContentSubmissionLink() {
    const t = useTranslations("Admin")
    const [count, setCount] = useState<number | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession()
                if (!session) return
                const res = await fetch(
                    "/api/admin/content-submissions?pending=1&limit=1",
                    {
                        headers: {
                            Authorization: `Bearer ${session.access_token}`,
                        },
                    },
                )
                if (!res.ok) return
                const data = (await res.json()) as { total?: number }
                if (!cancelled) setCount(data.total ?? 0)
            } catch {
                /* badge is non-critical */
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    return (
        <Link
            href="/admin/content-submission"
            className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-200 transition-colors hover:border-sky-500/50 hover:bg-sky-500/20"
        >
            <Inbox className="h-4 w-4" />
            {t("contentSubmissionTitle")}
            {count && count > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-sky-400 px-1.5 text-xs font-semibold text-sky-950">
                    {count}
                </span>
            ) : null}
        </Link>
    )
}
