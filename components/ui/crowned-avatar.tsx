"use client"

import { FaCrown } from "react-icons/fa"
import { ConsistentAvatar } from "@/components/ui/consistent-avatar"
import { useActiveSubscription } from "@/hooks/use-active-subscription"
import { cn } from "@/lib/utils"
import type { AvatarData } from "@/lib/avatar-utils"

type CrownedAvatarProps = {
    data: AvatarData
    size?: "sm" | "md" | "lg" | "xl"
    className?: string
}

const CROWN_SIZE_BY_AVATAR: Record<
    NonNullable<CrownedAvatarProps["size"]>,
    string
> = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
    xl: "h-5 w-5",
}

/**
 * Avatar wrapper that pins a small crown above the head for paying
 * subscribers — silver for `basic`, gold for `pro`. Free / signed-out
 * viewers see the plain avatar.
 */
export function CrownedAvatar({
    data,
    size = "sm",
    className,
}: CrownedAvatarProps) {
    const { subscription } = useActiveSubscription()
    const tier = subscription?.tier ?? null

    const crownClass =
        tier === "pro"
            ? "text-amber-300 drop-shadow-[0_0_4px_rgba(252,211,77,0.7)]"
            : tier === "basic"
              ? "text-slate-200 drop-shadow-[0_0_4px_rgba(226,232,240,0.6)]"
              : null

    return (
        <span className={cn("relative inline-flex shrink-0", className)}>
            <ConsistentAvatar data={data} size={size} />
            {crownClass ? (
                <FaCrown
                    aria-hidden
                    className={cn(
                        // Anchor to the avatar's top edge, lift by ~70%
                        // of the icon's own height so the artwork's base
                        // rests on the rim, and bias the horizontal
                        // origin a touch to the right of centre so the
                        // crown leans toward the upper-right corner with
                        // a matching clockwise tilt.
                        "pointer-events-none absolute left-1/2 top-0 -translate-x-[10%] -translate-y-[70%] rotate-[16deg]",
                        CROWN_SIZE_BY_AVATAR[size],
                        crownClass,
                    )}
                />
            ) : null}
        </span>
    )
}
