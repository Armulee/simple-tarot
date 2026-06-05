"use client"

import { Crown } from "lucide-react"
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
                <Crown
                    aria-hidden
                    className={cn(
                        // Anchor to the top edge of the avatar, then lift
                        // by ~70% of the crown's own height so the visual
                        // base of the crown rests on the avatar's rim
                        // instead of overlapping its interior. Lucide's
                        // Crown SVG has ~20% padding at the bottom of its
                        // 24×24 box, so 70% lifts the artwork up to the
                        // border without floating off it.
                        "pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[70%] -rotate-[8deg] fill-current",
                        CROWN_SIZE_BY_AVATAR[size],
                        crownClass,
                    )}
                />
            ) : null}
        </span>
    )
}
