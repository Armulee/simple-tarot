import type { Metadata } from "next"

import { AvatarExperience } from "./_components/avatar-experience"

export const metadata: Metadata = {
    title: "Talk to the Fortune Teller · AskingFate",
    description:
        "Meet the AskingFate fortune teller face to face — a real-time talking avatar that draws a card and speaks your reading aloud.",
    robots: { index: false, follow: false },
}

export default function AvatarPage() {
    return <AvatarExperience />
}
