import type { Metadata } from "next"
import SignInForm from "@/components/signin/signin-form"

export const metadata: Metadata = {
    title: "Sign In - Access Your AI Tarot Reading Account | Asking Fate",
    description: "Sign in to your Asking Fate account to continue your cosmic journey and access your personalized AI tarot reading history and spiritual guidance.",
    keywords: "sign in, tarot reading account, AI tarot login, spiritual guidance account, mystical journey login",
    openGraph: {
        title: "Sign In - Access Your AI Tarot Reading Account",
        description: "Sign in to your Asking Fate account to continue your cosmic journey and access your personalized AI tarot readings.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Sign In - Access Your AI Tarot Reading Account",
        description: "Sign in to your Asking Fate account to continue your cosmic journey and access your personalized AI tarot readings.",
    },
}

export default function SignInPage() {
    return <SignInForm />
}
