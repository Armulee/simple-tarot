"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface ServiceContextType {
    activeService: string
    setActiveService: (service: string) => void
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined)

export function ServiceProvider({ children }: { children: ReactNode }) {
    const [activeService, setActiveService] = useState("tarot")

    return (
        <ServiceContext.Provider value={{ activeService, setActiveService }}>
            {children}
        </ServiceContext.Provider>
    )
}

export function useService() {
    const context = useContext(ServiceContext)
    if (context === undefined) {
        throw new Error("useService must be used within a ServiceProvider")
    }
    return context
}