"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

import type { Orbit3DSceneProps } from "./orbit-3d-scene"

const Orbit3DScene = dynamic(() => import("./orbit-3d-scene"), {
    ssr: false,
    loading: () => (
        <div className='flex h-full w-full items-center justify-center'>
            <Loader2 className='h-6 w-6 animate-spin text-white/40' />
        </div>
    ),
})

/**
 * Drag-to-orbit, pinch-to-zoom 3D view of the natal / transit planets.
 *
 * Wrapped in `dynamic({ ssr: false })` so the ~150KB three.js bundle stays
 * out of the initial server payload and is only fetched when this view is
 * actually mounted (i.e. when the user toggles 3D on).
 */
export default function Orbit3D(props: Orbit3DSceneProps) {
    return (
        <div className='relative h-[480px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#04060f]'>
            <Orbit3DScene {...props} />
            <p className='pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.22em] text-white/35'>
                Drag · pinch · scroll
            </p>
        </div>
    )
}
