"use client"

import { useEffect, useMemo, useState } from "react"
import mysticalServices from "./mystical-services"

export type HomeServiceId = (typeof mysticalServices)[number]["id"]

type ActiveServiceEventDetail = { serviceId?: string }

export function useHomeActiveServiceId(
    initial: HomeServiceId = "tarot"
): HomeServiceId {
    const validIds = useMemo(() => {
        return new Set(mysticalServices.map((s) => s.id))
    }, [])

    const [activeId, setActiveId] = useState<HomeServiceId>(initial)

    useEffect(() => {
        const onActiveServiceChanged = (e: Event) => {
            const detail = (e as CustomEvent<ActiveServiceEventDetail>).detail
            const serviceId = detail?.serviceId
            if (!serviceId || !validIds.has(serviceId as HomeServiceId)) return
            setActiveId(serviceId as HomeServiceId)
        }

        window.addEventListener(
            "active-service-changed",
            onActiveServiceChanged as EventListener
        )
        return () => {
            window.removeEventListener(
                "active-service-changed",
                onActiveServiceChanged as EventListener
            )
        }
    }, [validIds])

    return activeId
}

