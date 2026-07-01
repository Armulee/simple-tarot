"use client"

import { type ReactNode, useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { DesktopSidebar } from "./desktop-sidebar"

const STORAGE_KEY = "af-desktop-sidebar-collapsed"

/**
 * Renders the collapsible desktop sidebar (lg+) and offsets the page content
 * to sit beside it. The offset is driven by the `--app-sidebar-w` CSS variable
 * (set responsively in globals.css via the `data-app-sidebar` attribute), so
 * both this wrapper AND any fixed page element (e.g. the chat composer bar)
 * can line up against the sidebar. Below lg the variable is 0 and the sidebar
 * is hidden — the hamburger drawer is used instead.
 */
export function DesktopSidebarShell({ children }: { children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(false)
    const [hydrated, setHydrated] = useState(false)

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem(STORAGE_KEY)
            if (saved != null) setCollapsed(saved === "1")
        } catch {
            /* ignore */
        }
        setHydrated(true)
    }, [])

    const toggle = useCallback(() => {
        setCollapsed((c) => {
            const next = !c
            try {
                window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
            } catch {
                /* ignore */
            }
            return next
        })
    }, [])

    return (
        <>
            <DesktopSidebar collapsed={collapsed} onToggle={toggle} />
            <div
                data-app-sidebar={collapsed ? "collapsed" : "expanded"}
                className={cn(
                    "flex min-h-0 min-w-0 flex-1 flex-col pl-[var(--app-sidebar-w)]",
                    hydrated && "transition-[padding] duration-300 ease-in-out",
                )}
            >
                {children}
            </div>
        </>
    )
}

export default DesktopSidebarShell
