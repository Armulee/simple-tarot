import type { Metadata } from "next"
import SignUpForm from "@/components/signup/signup-form"

export const metadata: Metadata = {
    title: "Sign Up - Create Your AI Tarot Reading Account | Asking Fate",
    description: "Join Asking Fate and create your free account to start your cosmic journey with personalized AI tarot readings and spiritual guidance.",
    keywords: "sign up, create account, tarot reading registration, AI tarot account, spiritual guidance signup, mystical journey registration",
    openGraph: {
        title: "Sign Up - Create Your AI Tarot Reading Account",
        description: "Join Asking Fate and create your free account to start your cosmic journey with personalized AI tarot readings.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Sign Up - Create Your AI Tarot Reading Account",
        description: "Join Asking Fate and create your free account to start your cosmic journey with personalized AI tarot readings.",
    },
}

export default function SignUpPage() {
    return <SignUpForm />
}
