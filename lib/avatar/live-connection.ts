/**
 * Browser-side WebRTC connection to the HeyGen live avatar.
 *
 * HeyGen LiveAvatar real-time is WebRTC over LiveKit. Our server creates the
 * session (POST /v1/streaming.new) and returns the LiveKit room `url` +
 * `access_token`; the browser joins that room and renders the avatar's video
 * track itself (video is NEVER proxied through our server).
 *
 * We connect with `livekit-client` — the same transport HeyGen's own
 * `@heygen/liveavatar-web-sdk` bundles and uses under the hood. We use it
 * directly (rather than the SDK's high-level `LiveAvatarSession`) because that
 * class creates and owns its own session, whereas our architecture mints the
 * session server-side so the server can gate eligibility, author the spoken
 * text with our LLM, and force-close the session. See docs/avatar-feature.md.
 *
 * livekit-client is loaded via a dynamic import so its bundle is code-split out
 * of the initial page load (the idle poster renders immediately regardless).
 */

export type LiveConnectionEvents = {
    onVideoReady?: () => void
    onDisconnected?: () => void
    onError?: (message: string) => void
}

export type LiveConnection = {
    disconnect: () => Promise<void>
}

/**
 * Join the HeyGen LiveKit room and render the avatar's audio+video into
 * `videoEl`. Returns a handle whose `disconnect()` leaves the room. On failure
 * it invokes `events.onError` and resolves to null so the caller can keep the
 * idle poster up instead of throwing.
 */
export async function connectLiveAvatar(
    opts: { url: string; accessToken: string; videoEl: HTMLVideoElement },
    events: LiveConnectionEvents = {},
): Promise<LiveConnection | null> {
    try {
        // Dynamic import keeps the LiveKit bundle out of the initial page load;
        // it's code-split and fetched when a session actually starts.
        const { Room, RoomEvent, Track } = await import("livekit-client")

        const room = new Room({ adaptiveStream: true, dynacast: true })

        const attach = (track: { kind: string; attach: (el?: HTMLMediaElement) => void }) => {
            // Attaching both the video and audio tracks to the same element
            // merges them into its MediaStream, so the avatar's voice plays
            // through the video element.
            if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
                track.attach(opts.videoEl)
            }
        }

        room.on(RoomEvent.TrackSubscribed, (track) => {
            attach(track as unknown as { kind: string; attach: (el?: HTMLMediaElement) => void })
            if ((track as { kind: string }).kind === Track.Kind.Video) {
                // Mobile browsers need an explicit play() after a user gesture;
                // a session always starts from a tap, so this is allowed.
                void opts.videoEl.play().catch(() => {})
                events.onVideoReady?.()
            }
        })

        room.on(RoomEvent.Disconnected, () => events.onDisconnected?.())

        await room.connect(opts.url, opts.accessToken)

        return {
            disconnect: async () => {
                try {
                    await room.disconnect()
                } catch {
                    /* best effort */
                }
            },
        }
    } catch (error) {
        console.error("[avatar] LiveKit connect failed:", error)
        events.onError?.(error instanceof Error ? error.message : "CONNECT_FAILED")
        return null
    }
}
