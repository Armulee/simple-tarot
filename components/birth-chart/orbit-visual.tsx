"use client"

import OrbitVisual from "@/components/astrology/orbit-visual"

/**
 * Birth-chart wrapper around the shared {@link OrbitVisual}. Keeps the
 * `planets` prop shape the rest of the birth-chart UI already passes so we
 * don't have to touch call sites.
 */
export default function BirthChartOrbitVisual({
    planets,
}: {
    planets?: Record<string, unknown> | null
}) {
    return (
        <OrbitVisual
            planets={planets}
            ariaLabel='Birth chart orbit visual'
        />
    )
}
