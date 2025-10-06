"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getAvatarText, getAvatarAlt, getAvatarColorClass, type AvatarData } from "@/lib/avatar-utils"
import { cn } from "@/lib/utils"

interface ConsistentAvatarProps {
    data: AvatarData
    className?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base', 
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
}

export function ConsistentAvatar({ data, className, size = 'md' }: ConsistentAvatarProps) {
    const text = getAvatarText(data)
    const alt = getAvatarAlt(data)
    const colorClass = getAvatarColorClass(text)
    
    return (
        <Avatar className={cn(sizeClasses[size], className)}>
            <AvatarFallback 
                className={cn(
                    'bg-accent text-accent-foreground font-semibold',
                    colorClass
                )}
                title={alt}
            >
                {text}
            </AvatarFallback>
        </Avatar>
    )
}