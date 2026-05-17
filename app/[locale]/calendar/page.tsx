import type { Metadata } from "next"
import CalendarClient from "@/components/calendar"

export const metadata: Metadata = {
    title: "ปฏิทินดวง · AskingFate",
    description: "ดูดวงรายวันรายเดือน — แต่ละวันเหมาะกับอะไร เลี่ยงอะไร",
}

export default function CalendarPage() {
    return <CalendarClient />
}
