"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import {
    DEFAULT_LANDING_MODE,
    loadLandingModeFromStorage,
    readLandingModeFromQuery,
    saveLandingModeToStorage,
    type LandingMode,
} from "@/lib/landing-mode-storage"
import { ImmerseExperience } from "@/components/immerse"
import { LandingModeProvider } from "./landing-mode-context"

/**
 * Picks the landing experience: the immerse avatar (the default) or the
 * original hero + composer, passed in as `legacy`.
 *
 * Immerse renders on the server because it is the default, which also keeps
 * the page's <h1> in the initial HTML. A visitor who has chosen legacy sees
 * one frame of immerse before the stored preference applies — the alternative
 * was rendering nothing until hydration, which is worse for everyone else.
 *
 * The switch control itself lives in each mode's composer row, reached through
 * the context rather than props: `legacy` arrives as a ReactNode built in the
 * server page, so there is no boundary to thread state through.
 */
export function HomeSwitch({ legacy }: { legacy: ReactNode }) {
    const [mode, setModeState] = useState<LandingMode>(DEFAULT_LANDING_MODE)

    useEffect(() => {
        // `?mode=` wins for one navigation (deep links, QA) and then sticks.
        const fromQuery = readLandingModeFromQuery(window.location.search)
        if (fromQuery) {
            setModeState(fromQuery)
            saveLandingModeToStorage(fromQuery)
            return
        }
        // The about story lives below the immerse fold, so a /#about link has
        // to land there even for someone who picked legacy — otherwise the
        // anchor points at nothing.
        if (window.location.hash === "#about") {
            setModeState("immerse")
            return
        }
        setModeState(loadLandingModeFromStorage())
    }, [])

    const setMode = useCallback((next: LandingMode) => {
        setModeState(next)
        saveLandingModeToStorage(next)
    }, [])

    const value = useMemo(() => ({ mode, setMode }), [mode, setMode])

    return (
        <LandingModeProvider value={value}>
            {mode === "immerse" ? <ImmerseExperience /> : legacy}
        </LandingModeProvider>
    )
}
