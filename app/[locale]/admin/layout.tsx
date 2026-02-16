"use client"

import { AdminGuard } from "@/contexts/admin-context"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <AdminGuard>{children}</AdminGuard>
}
