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
 * Generates a consistent color class based on the text
 * This ensures the same user always gets the same color
 */
export function getAvatarColorClass(text: string): string {
    // Simple hash function to generate consistent colors
    let hash = 0
    for (let i = 0; i < text.length; i++) {
        hash = text.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    // Map hash to color classes
    const colors = [
        'bg-red-500',
        'bg-orange-500', 
        'bg-amber-500',
        'bg-yellow-500',
        'bg-lime-500',
        'bg-green-500',
        'bg-emerald-500',
        'bg-teal-500',
        'bg-cyan-500',
        'bg-sky-500',
        'bg-blue-500',
        'bg-indigo-500',
        'bg-violet-500',
        'bg-purple-500',
        'bg-fuchsia-500',
        'bg-pink-500',
        'bg-rose-500'
    ]
    
    return colors[Math.abs(hash) % colors.length]
}