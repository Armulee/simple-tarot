"use client"

import { createContext, useContext } from "react"

import type { LandingMode } from "@/lib/landing-mode-storage"

type LandingModeValue = {
    mode: LandingMode
    setMode: (mode: LandingMode) => void
}

const LandingModeContext = createContext<LandingModeValue | null>(null)

export const LandingModeProvider = LandingModeContext.Provider

/**
 * Lets either landing mode reach the switch without prop drilling.
 *
 * The legacy tree is handed to `HomeSwitch` as a prop from the server page, so
 * there is no client boundary to thread state through — a context is the only
 * way both branches can share one control.
 */
export function useLandingMode(): LandingModeValue {
    const value = useContext(LandingModeContext)
    if (!value) {
        throw new Error("useLandingMode must be used inside HomeSwitch")
    }
    return value
}
