"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getAvatarText, getAvatarAlt, type AvatarData } from "@/lib/avatar-utils"
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
    
    return (
        <Avatar className={cn(sizeClasses[size], className)}>
            <AvatarFallback 
                className="bg-accent text-accent-foreground font-semibold"
                title={alt}
            >
                {text}
            </AvatarFallback>
        </Avatar>
    )
<<<<<<< HEAD
}
=======
}
>>>>>>> 8fb5c0644a643586f48cb396d255b1ef5e159eec
