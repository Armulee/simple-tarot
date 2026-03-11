"use client"

import React from "react"
import { Sun, Moon, Shield, Crown } from "lucide-react"

const sizeClass = "w-4 h-4 shrink-0"

export function SunIcon({ className = "" }: { className?: string }) {
    return <Sun className={`${sizeClass} ${className}`} strokeWidth={2} />
}

export function MoonIcon({ className = "" }: { className?: string }) {
    return <Moon className={`${sizeClass} ${className}`} strokeWidth={2} />
}

export function MercuryIcon({ className = "" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${sizeClass} ${className}`}
        >
            <circle cx="12" cy="8" r="4" />
            <path d="M12 12v8" />
            <path d="M8 16h8" />
            <circle cx="12" cy="18" r="2" />
        </svg>
    )
}

export function VenusIcon({ className = "" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${sizeClass} ${className}`}
        >
            <circle cx="12" cy="9" r="5" />
            <path d="M12 14v6" />
            <path d="M9 17h6" />
        </svg>
    )
}

export function MarsIcon({ className = "" }: { className?: string }) {
    return <Shield className={`${sizeClass} ${className}`} strokeWidth={2} />
}

export function JupiterIcon({ className = "" }: { className?: string }) {
    return <Crown className={`${sizeClass} ${className}`} strokeWidth={2} />
}

export function SaturnIcon({ className = "" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${sizeClass} ${className}`}
        >
            <path d="M12 2v8" />
            <path d="M12 14v8" />
            <path d="M6 12h12" />
            <path d="M8 8c0-2 1.5-4 4-4s4 2 4 4" />
            <path d="M8 16c0 2 1.5 4 4 4s4-2 4-4" />
        </svg>
    )
}

export function RahuIcon({ className = "" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${sizeClass} ${className}`}
        >
            <path d="M12 2v20" />
            <path d="M8 6l4-4 4 4" />
            <path d="M8 18l4 4 4-4" />
        </svg>
    )
}

export function KetuIcon({ className = "" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${sizeClass} ${className}`}
        >
            <path d="M12 2v20" />
            <path d="M8 18l4 4 4-4" />
            <path d="M8 6l4-4 4 4" />
        </svg>
    )
}

export function AscendantIcon({ className = "" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${sizeClass} ${className}`}
        >
            <path d="M12 2v4" />
            <path d="M12 18v4" />
            <path d="M4.93 4.93l2.83 2.83" />
            <path d="M16.24 16.24l2.83 2.83" />
            <path d="M2 12h4" />
            <path d="M18 12h4" />
            <path d="M4.93 19.07l2.83-2.83" />
            <path d="M16.24 7.76l2.83-2.83" />
        </svg>
    )
}

const PLANET_ICONS: Record<
    string,
    React.ComponentType<{ className?: string }>
> = {
    Sun: SunIcon,
    Moon: MoonIcon,
    Mercury: MercuryIcon,
    Venus: VenusIcon,
    Mars: MarsIcon,
    Jupiter: JupiterIcon,
    Saturn: SaturnIcon,
    Rahu: RahuIcon,
    Ketu: KetuIcon,
    Ascendant: AscendantIcon,
}

export function PlanetIcon({
    name,
    className = "",
}: {
    name: string
    className?: string
}) {
    const Icon = PLANET_ICONS[name]
    if (!Icon) return null
    return <Icon className={className} />
}
