import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import LifeMonitor from "@/components/life-monitor/life-monitor"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("LifeMonitor")
    return {
        title: `${t("title")} | AskingFate`,
        description: t("subtitle"),
    }
}

export default function LifeMonitorPage() {
    return <LifeMonitor />
}
