"use client"

import { useMemo } from "react"
import type { HomeServiceId } from "./use-home-active-service"
import { useHomeActiveServiceId } from "./use-home-active-service"

export function getServiceIdFromPathname(
    pathname: string
): HomeServiceId | null {
    // Dedicated feature routes
    const mappings: Array<[prefix: string, id: HomeServiceId]> = [
        ["/birth-chart", "birthChart"],
        ["/astrology", "astrology"],
        ["/life-monitor", "lifeMonitor"],
        ["/tarot", "tarot"],
        ["/numerology", "numerology"],
        ["/namelogy", "namelogy"],
        ["/lucky-colors", "luckyColors"],
        ["/palmistry", "palmistry"],
        ["/fated-relations", "fatedRelations"],
    ]

    for (const [prefix, id] of mappings) {
        if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return id
    }
    return null
}

/**
 * - On home (`/`): follows the currently active swipe slide.
 * - On dedicated feature routes: derives active service from pathname.
 * - Elsewhere: falls back to tarot.
 */
export function useActiveServiceId(pathname: string): HomeServiceId {
    const homeActiveServiceId = useHomeActiveServiceId("tarot")

    return useMemo(() => {
        if (pathname === "/") return homeActiveServiceId
        return getServiceIdFromPathname(pathname) ?? "tarot"
    }, [pathname, homeActiveServiceId])
}

