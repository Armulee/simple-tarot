"use client"

import { useEffect } from "react"

/**
 * Marks the document while the immerse stage is mounted.
 *
 * The navbar sits outside the page tree, so rather than have it sniff the
 * pathname (which is what the old /avatar page did) it just reacts to
 * `html[data-immerse="on"]` in globals.css. Mounting/unmounting this component
 * is the whole switch.
 */
export function ImmerseChrome() {
    useEffect(() => {
        const root = document.documentElement
        root.dataset.immerse = "on"
        return () => {
            delete root.dataset.immerse
        }
    }, [])
    return null
}
