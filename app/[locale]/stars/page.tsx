import { StarsDashboard } from "@/components/stars-dashboard"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Stars Dashboard - Asking Fate",
    description: "Manage your stars, earn rewards, and unlock more tarot readings",
}

export default function StarsPage() {
    return <StarsDashboard />
}