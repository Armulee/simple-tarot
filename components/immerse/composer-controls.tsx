"use client"

import { useEffect, useState } from "react"

import { useRouter } from "@/i18n/navigation"
import InterpretationModeSelector from "@/components/chat/interpretation-mode-selector"
import { ComposerSettingsMenu } from "@/components/chat/composer-settings-menu"
import { ModeSwitch } from "@/components/home/mode-switch"
import {
    loadInterpretationModeFromStorage,
    saveInterpretationModeToStorage,
    type InterpretationMode,
} from "@/lib/interpretation-mode-storage"
import {
    loadAutoPickFromStorage,
    saveAutoPickToStorage,
} from "@/lib/auto-pick-storage"
import {
    loadComposerSuggestionsEnabledFromStorage,
    saveComposerSuggestionsEnabledToStorage,
} from "@/lib/composer-suggestions-storage"
import { loadBirthFromStorage } from "@/lib/birth-storage"
import type { HoroscopeBirthData } from "@/types/horoscope"

/**
 * The row under the immerse input — the same controls the legacy composer
 * carries, so the two inputs behave alike, with the landing mode switch at the
 * right end.
 *
 * The legacy row's "+" button is deliberately not here: it attaches media and
 * inserts character mentions, and the immerse composer is a plain field with
 * no attachment pipeline behind it, so the button would open a menu that
 * cannot do anything.
 *
 * Every setting here is read from and written to the same storage the legacy
 * composer uses, so switching modes does not reset the visitor's choices.
 */
export function ComposerControls() {
    const router = useRouter()
    const [interpretationMode, setInterpretationMode] =
        useState<InterpretationMode>("auto")
    const [autoPickOn, setAutoPickOn] = useState(false)
    const [suggestionsEnabled, setSuggestionsEnabled] = useState(true)
    const [savedBirth, setSavedBirth] = useState<HoroscopeBirthData | null>(null)

    // localStorage is only readable after mount; the defaults above are what
    // the server renders.
    useEffect(() => {
        setInterpretationMode(loadInterpretationModeFromStorage())
        setAutoPickOn(loadAutoPickFromStorage())
        setSuggestionsEnabled(loadComposerSuggestionsEnabledFromStorage())
        setSavedBirth(loadBirthFromStorage())
    }, [])

    return (
        <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
                <InterpretationModeSelector
                    value={interpretationMode}
                    onChange={(next) => {
                        setInterpretationMode(next)
                        saveInterpretationModeToStorage(next)
                    }}
                />
                <ComposerSettingsMenu
                    showAutoPick
                    autoPickOn={autoPickOn}
                    onToggleAutoPick={() =>
                        setAutoPickOn((prev) => {
                            const next = !prev
                            saveAutoPickToStorage(next)
                            return next
                        })
                    }
                    showComposerSuggestionsToggle
                    composerSuggestionsEnabled={suggestionsEnabled}
                    onComposerSuggestionsEnabledChange={(enabled) => {
                        setSuggestionsEnabled(enabled)
                        saveComposerSuggestionsEnabledToStorage(enabled)
                    }}
                    exposeBirthDrawInMenu={false}
                    savedBirth={savedBirth}
                    onBirthInfoClick={() => router.push("/profile")}
                    showDrawTrigger={false}
                    showInsufficientStars={false}
                />
            </div>
            <ModeSwitch />
        </div>
    )
}
