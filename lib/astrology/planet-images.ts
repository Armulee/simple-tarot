/**
 * Canonical map of planet name → public asset path, plus the lowercase key
 * set used by chat avatars. Centralized to keep all horoscope UIs in sync
 * when a new asset is added or a key is renamed.
 */
export const PLANET_IMAGE_ASSETS: Record<string, string> = {
    Sun: "/assets/planetary/sun.png",
    Moon: "/assets/planetary/moon.png",
    Mercury: "/assets/planetary/mercury.png",
    Venus: "/assets/planetary/venus.png",
    Mars: "/assets/planetary/mars.png",
    Jupiter: "/assets/planetary/jupiter.png",
    Saturn: "/assets/planetary/saturn.png",
    Uranus: "/assets/planetary/uranus.png",
    Neptune: "/assets/planetary/neptune.png",
    Pluto: "/assets/planetary/pluto.png",
    Rahu: "/assets/planetary/rahu.png",
    // Ketu shares the rahu sprite; consumers usually rotate it 90deg.
    Ketu: "/assets/planetary/rahu.png",
    Chiron: "/assets/planetary/chiron.png",
}

export const PLANET_IMAGE_KEYS: ReadonlySet<string> = new Set(
    Object.keys(PLANET_IMAGE_ASSETS).map((k) => k.toLowerCase()),
)

export function getPlanetImageSrc(planet: string): string | undefined {
    if (PLANET_IMAGE_ASSETS[planet]) return PLANET_IMAGE_ASSETS[planet]
    const lower = planet.toLowerCase()
    return PLANET_IMAGE_KEYS.has(lower)
        ? `/assets/planetary/${lower}.png`
        : undefined
}
