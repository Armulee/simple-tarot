/**
 * Utility functions for generating consistent avatars across the application
 */

export interface AvatarData {
    name?: string | null
    email?: string | null
}

/**
 * Generates the display text for avatar (first character of name or email)
 */
export function getAvatarText(data: AvatarData): string {
    if (data.name && data.name.trim()) {
        return data.name.trim().charAt(0).toUpperCase()
    }
    
    if (data.email && data.email.trim()) {
        return data.email.trim().charAt(0).toUpperCase()
    }
    
    return '?'
}

/**
 * Generates the alt text for avatar accessibility
 */
export function getAvatarAlt(data: AvatarData): string {
    if (data.name && data.name.trim()) {
        return `${data.name.trim()}'s avatar`
    }
    
    if (data.email && data.email.trim()) {
        return `${data.email.trim()}'s avatar`
    }
    
    return 'User avatar'
}

/**
 * Returns the accent color class for all avatars
 * All avatars will use the same accent background
 */
export function getAvatarColorClass(): string {
    return 'bg-accent'
}