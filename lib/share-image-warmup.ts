/**
 * Fire-and-forget warm-up for the share-image renderer. GET
 * /api/share-image preloads fonts/artwork and initializes the Satori +
 * resvg pipeline on the server, so the user's first download skips the
 * cold-start cost. Deduped per page load.
 */
let warmupStarted = false

export function warmShareImagePipeline(): void {
    if (warmupStarted || typeof window === "undefined") return
    warmupStarted = true
    fetch("/api/share-image", { method: "GET" }).catch(() => {
        // Warm-up is best-effort; a real render will pay the cost instead.
        warmupStarted = false
    })
}
