"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
    AlertCircle,
    Bell,
    CheckCircle,
    Info,
    Loader2,
    X,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"

type DbNotification = {
    id: string
    type: string
    title: string | null
    body: string | null
    link: string | null
    read: boolean
    created_at: string
}

const POSITIVE_TYPES = new Set([
    "access_request_decision",
    "share_visit",
])

interface NotificationSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function NotificationSheet({
    open,
    onOpenChange,
}: NotificationSheetProps) {
    const t = useTranslations("Notifications")
    const { user } = useAuth()
    const [notifications, setNotifications] = useState<DbNotification[]>([])
    const [loading, setLoading] = useState(false)

    const load = useCallback(async () => {
        if (!user) {
            setNotifications([])
            return
        }
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("id, type, title, body, link, read, created_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(50)
            if (error) {
                console.error("[notifications] load failed", error)
                setNotifications([])
                return
            }
            setNotifications((data ?? []) as DbNotification[])
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (open && user) {
            void load()
        }
    }, [open, user, load])

    // Mark all unread as read shortly after the sheet opens.
    useEffect(() => {
        if (!open || !user) return
        const unread = notifications.filter((n) => !n.read).map((n) => n.id)
        if (unread.length === 0) return
        const timer = window.setTimeout(async () => {
            const { error } = await supabase
                .from("notifications")
                .update({ read: true, updated_at: new Date().toISOString() })
                .in("id", unread)
                .eq("user_id", user.id)
            if (error) {
                console.error("[notifications] mark read failed", error)
                return
            }
            setNotifications((prev) =>
                prev.map((n) =>
                    unread.includes(n.id) ? { ...n, read: true } : n,
                ),
            )
        }, 600)
        return () => window.clearTimeout(timer)
    }, [open, user, notifications])

    const dismissLocally = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, [])

    const getIcon = (type: string) => {
        if (POSITIVE_TYPES.has(type)) {
            return <CheckCircle className='w-5 h-5 text-green-400' />
        }
        if (type.endsWith("_warning")) {
            return <AlertCircle className='w-5 h-5 text-yellow-400' />
        }
        if (type.endsWith("_error")) {
            return <AlertCircle className='w-5 h-5 text-red-400' />
        }
        return <Info className='w-5 h-5 text-blue-400' />
    }

    const getBg = (type: string) => {
        if (POSITIVE_TYPES.has(type))
            return "bg-green-500/10 border-green-400/20"
        if (type.endsWith("_warning"))
            return "bg-yellow-500/10 border-yellow-400/20"
        if (type.endsWith("_error"))
            return "bg-red-500/10 border-red-400/20"
        return "bg-blue-500/10 border-blue-400/20"
    }

    const formatTimestamp = (iso: string) => {
        const at = new Date(iso).getTime()
        const diff = Date.now() - at
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)
        if (Number.isNaN(at)) return ""
        if (minutes < 1) return "just now"
        if (minutes < 60) return `${minutes}m ago`
        if (hours < 24) return `${hours}h ago`
        return `${days}d ago`
    }

    const unreadCount = notifications.filter((n) => !n.read).length

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side='right'
                className='w-96 bg-gradient-to-b from-black/95 to-black/90 backdrop-blur-md border-l border-white/10'
            >
                <SheetHeader className='space-y-4'>
                    <div className='flex items-center justify-between'>
                        <SheetTitle className='flex items-center space-x-2 text-white'>
                            <Bell className='w-5 h-5' />
                            <span>{t("title")}</span>
                            {unreadCount > 0 && (
                                <Badge className='bg-red-500 text-white text-xs'>
                                    {unreadCount}
                                </Badge>
                            )}
                        </SheetTitle>
                    </div>
                </SheetHeader>

                <Separator className='bg-white/10' />

                <ScrollArea className='flex-1 mt-4'>
                    <div className='space-y-3'>
                        {loading && notifications.length === 0 ? (
                            <div className='text-center py-12'>
                                <Loader2 className='w-6 h-6 text-gray-500 mx-auto animate-spin' />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className='text-center py-12'>
                                <Bell className='w-16 h-16 text-gray-500 mx-auto mb-4' />
                                <p className='text-gray-400 text-lg font-medium'>
                                    {t("noNotifications")}
                                </p>
                                <p className='text-sm text-gray-500 mt-2'>
                                    {t("noNotificationsDescription")}
                                </p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-lg ${getBg(
                                        n.type,
                                    )} ${
                                        !n.read ? "ring-1 ring-white/20" : ""
                                    }`}
                                >
                                    <div className='flex items-start space-x-3'>
                                        <div className='flex-shrink-0 mt-0.5'>
                                            {getIcon(n.type)}
                                        </div>
                                        <div className='flex-1 min-w-0'>
                                            <div className='flex items-start justify-between'>
                                                <div className='flex-1'>
                                                    <h4
                                                        className={`text-sm font-medium ${
                                                            !n.read
                                                                ? "text-white"
                                                                : "text-gray-300"
                                                        }`}
                                                    >
                                                        {n.title ?? ""}
                                                    </h4>
                                                    {n.body ? (
                                                        <p className='text-xs text-gray-400 mt-1 leading-relaxed whitespace-pre-wrap'>
                                                            {n.body}
                                                        </p>
                                                    ) : null}
                                                    <p className='text-xs text-gray-500 mt-2'>
                                                        {formatTimestamp(
                                                            n.created_at,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className='flex items-center space-x-1 ml-2'>
                                                    {!n.read && (
                                                        <div className='w-2 h-2 bg-blue-400 rounded-full' />
                                                    )}
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() =>
                                                            dismissLocally(n.id)
                                                        }
                                                        className='h-6 w-6 p-0 text-gray-400 hover:text-white'
                                                        aria-label='Dismiss'
                                                    >
                                                        <X className='w-3 h-3' />
                                                    </Button>
                                                </div>
                                            </div>
                                            {n.link ? (
                                                <Button
                                                    variant='outline'
                                                    size='sm'
                                                    className='mt-3 text-xs border-white/20 text-white hover:bg-white/10'
                                                    onClick={() => {
                                                        window.location.href =
                                                            n.link as string
                                                    }}
                                                >
                                                    Open
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
