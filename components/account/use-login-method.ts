import { useAuth } from "@/hooks/use-auth"

interface LoginMethod {
    hasEmailPassword: boolean
    provider: string | null
}

export const useLoginMethod = (): LoginMethod => {
    const { user } = useAuth()

    if (!user) {
        return { hasEmailPassword: false, provider: null }
    }

    const provider = user.app_metadata?.provider || null
    const hasEmailPassword = provider === "email" || (!provider && !!user.email)

    return {
        hasEmailPassword,
        provider,
    }
}
