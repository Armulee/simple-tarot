"use client"

import { useEffect, useState, type ReactNode } from "react"

import {
    DEFAULT_LANDING_MODE,
    loadLandingModeFromStorage,
    readLandingModeFromQuery,
    saveLandingModeToStorage,
    type LandingMode,
} from "@/lib/landing-mode-storage"
import { ImmerseExperience } from "@/components/immerse"
import { ModeFab } from "./mode-fab"

/**
 * Picks the landing experience: the immerse avatar (the default) or the
 * original hero + composer, passed in as `legacy`.
 *
 * Immerse renders on the server because it is the default, which also keeps
 * the page's <h1> in the initial HTML. A visitor who has chosen legacy sees
 * one frame of immerse before the stored preference applies — the alternative
 * was rendering nothing until hydration, which is worse for everyone else.
 */
export function HomeSwitch({ legacy }: { legacy: ReactNode }) {
    const [mode, setMode] = useState<LandingMode>(DEFAULT_LANDING_MODE)

    useEffect(() => {
        // `?mode=` wins for one navigation (deep links, QA) and then sticks.
        const fromQuery = readLandingModeFromQuery(window.location.search)
        if (fromQuery) {
            setMode(fromQuery)
            saveLandingModeToStorage(fromQuery)
            return
        }
        setMode(loadLandingModeFromStorage())
    }, [])

    const toggle = () => {
        setMode((prev) => {
            const next: LandingMode = prev === "immerse" ? "legacy" : "immerse"
            saveLandingModeToStorage(next)
            return next
        })
    }

    return (
        <>
            {mode === "immerse" ? <ImmerseExperience /> : legacy}
            <ModeFab mode={mode} onToggle={toggle} />
        </>
    )
}
