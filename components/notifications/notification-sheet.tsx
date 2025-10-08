"use client"

import { useState } from "react"
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
import { Bell, CheckCircle, AlertCircle, Info, X } from "lucide-react"

interface Notification {
    id: string
    type: "success" | "info" | "warning" | "error"
    title: string
    message: string
    timestamp: Date
    read: boolean
    action?: {
        label: string
        href: string
    }
}

interface NotificationSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function NotificationSheet({
    open,
    onOpenChange,
}: NotificationSheetProps) {
    const [notifications, setNotifications] = useState<Notification[]>([])

    const getNotificationIcon = (type: Notification["type"]) => {
        switch (type) {
            case "success":
                return <CheckCircle className='w-5 h-5 text-green-400' />
            case "info":
                return <Info className='w-5 h-5 text-blue-400' />
            case "warning":
                return <AlertCircle className='w-5 h-5 text-yellow-400' />
            case "error":
                return <AlertCircle className='w-5 h-5 text-red-400' />
            default:
                return <Bell className='w-5 h-5 text-gray-400' />
        }
    }

    const getNotificationBgColor = (type: Notification["type"]) => {
        switch (type) {
            case "success":
                return "bg-green-500/10 border-green-400/20"
            case "info":
                return "bg-blue-500/10 border-blue-400/20"
            case "warning":
                return "bg-yellow-500/10 border-yellow-400/20"
            case "error":
                return "bg-red-500/10 border-red-400/20"
            default:
                return "bg-gray-500/10 border-gray-400/20"
        }
    }

    const formatTimestamp = (timestamp: Date) => {
        const now = new Date()
        const diff = now.getTime() - timestamp.getTime()
        const minutes = Math.floor(diff / (1000 * 60))
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))

        if (minutes < 60) {
            return `${minutes}m ago`
        } else if (hours < 24) {
            return `${hours}h ago`
        } else {
            return `${days}d ago`
        }
    }


    const deleteNotification = (id: string) => {
        setNotifications((prev) =>
            prev.filter((notification) => notification.id !== id)
        )
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
                            <span>Notifications</span>
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
                        {notifications.length === 0 ? (
                            <div className='text-center py-12'>
                                <Bell className='w-16 h-16 text-gray-500 mx-auto mb-4' />
                                <p className='text-gray-400 text-lg font-medium'>
                                    No notifications
                                </p>
                                <p className='text-sm text-gray-500 mt-2'>
                                    You&apos;re all caught up! We&apos;ll notify you about important updates.
                                </p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-lg ${getNotificationBgColor(
                                        notification.type
                                    )} ${
                                        !notification.read
                                            ? "ring-1 ring-white/20"
                                            : ""
                                    }`}
                                >
                                    <div className='flex items-start space-x-3'>
                                        <div className='flex-shrink-0 mt-0.5'>
                                            {getNotificationIcon(
                                                notification.type
                                            )}
                                        </div>
                                        <div className='flex-1 min-w-0'>
                                            <div className='flex items-start justify-between'>
                                                <div className='flex-1'>
                                                    <h4
                                                        className={`text-sm font-medium ${
                                                            !notification.read
                                                                ? "text-white"
                                                                : "text-gray-300"
                                                        }`}
                                                    >
                                                        {notification.title}
                                                    </h4>
                                                    <p className='text-xs text-gray-400 mt-1 leading-relaxed'>
                                                        {notification.message}
                                                    </p>
                                                    <p className='text-xs text-gray-500 mt-2'>
                                                        {formatTimestamp(
                                                            notification.timestamp
                                                        )}
                                                    </p>
                                                </div>
                                                <div className='flex items-center space-x-1 ml-2'>
                                                    {!notification.read && (
                                                        <div className='w-2 h-2 bg-blue-400 rounded-full'></div>
                                                    )}
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() =>
                                                            deleteNotification(
                                                                notification.id
                                                            )
                                                        }
                                                        className='h-6 w-6 p-0 text-gray-400 hover:text-white'
                                                    >
                                                        <X className='w-3 h-3' />
                                                    </Button>
                                                </div>
                                            </div>
                                            {notification.action && (
                                                <Button
                                                    variant='outline'
                                                    size='sm'
                                                    className='mt-3 text-xs border-white/20 text-white hover:bg-white/10'
                                                    onClick={() => {
                                                        window.location.href =
                                                            notification.action!.href
                                                    }}
                                                >
                                                    {notification.action.label}
                                                </Button>
                                            )}
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
