import { NextRequest } from "next/server"

export function getClientIP(req: NextRequest): string {
    // Try to get IP from various headers
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIP = req.headers.get('x-real-ip')
    const cfConnectingIP = req.headers.get('cf-connecting-ip')
    
    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, take the first one
        return forwardedFor.split(',')[0].trim()
    }
    
    if (realIP) {
        return realIP
    }
    
    if (cfConnectingIP) {
        return cfConnectingIP
    }
    
    // Fallback to localhost for development
    return '127.0.0.1'
}