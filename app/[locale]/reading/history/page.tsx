"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import ReadingHistory from "@/components/tarot/reading-history"
import { useTranslations } from "next-intl"

export default function ReadingHistoryPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const t = useTranslations("ReadingHistory")

    // Auth guard: redirect to signin if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            toast.error(
                t("authRequired") ||
                    "Please sign in to access your reading history"
            )
            router.push("/signin?callbackUrl=/reading/history")
        }
    }, [user, authLoading, router, t])

    // Show loading state
    if (authLoading) {
        return (
            <div className='min-h-screen flex items-center justify-center'>
                <div className='text-center'>
                    <p className='text-muted-foreground'>
                        {t("loading") || "Loading..."}
                    </p>
                </div>
            </div>
        )
    }

    // Don't render if not authenticated (redirect will happen)
    if (!user) {
        return null
    }

    return <ReadingHistory />
}
