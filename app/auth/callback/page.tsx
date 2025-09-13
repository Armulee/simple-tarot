import type { Metadata } from "next"
import AuthCallbackHandler from "@/components/auth/auth-callback-handler"

export const metadata: Metadata = {
    title: "Authentication - Completing Sign In | Asking Fate",
    description: "Please wait while we complete your authentication and redirect you to your AI tarot reading dashboard.",
    robots: "noindex, nofollow",
}

export default function AuthCallback() {
    return <AuthCallbackHandler />
}