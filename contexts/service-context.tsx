"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"

export type MysticalServiceId =
    | "tarot"
    | "astrology"
    | "horoscope"
    | "namelogy"
    | "numerology"
    | "luckyColors"

interface ServiceContextValue {
    activeService: MysticalServiceId
    setActiveService: (service: MysticalServiceId) => void
}

const ServiceContext = createContext<ServiceContextValue | undefined>(undefined)

export function ServiceProvider({ children }: { children: React.ReactNode }) {
    const [activeService, setActiveServiceState] = useState<MysticalServiceId>("tarot")

    const setActiveService = useCallback((service: MysticalServiceId) => {
        setActiveServiceState(service)
    }, [])

    const value = useMemo(
        () => ({ activeService, setActiveService }),
        [activeService, setActiveService]
    )

    return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>
}

export function useService() {
    const ctx = useContext(ServiceContext)
    if (!ctx) throw new Error("useService must be used within ServiceProvider")
    return ctx
}

