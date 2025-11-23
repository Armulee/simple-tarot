import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase"
import BirthChartDisplay from "@/components/birth-chart/birth-chart-display"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>
}): Promise<Metadata> {
    const { id } = await params
    const t = await getTranslations("Meta.BirthChart")
    return {
        title: `${t("title")} - ${id}`,
        description: t("description"),
        keywords: t("keywords"),
        openGraph: {
            title: t("ogTitle"),
            description: t("ogDescription"),
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: t("twitterTitle"),
            description: t("twitterDescription"),
        },
    }
}

export default async function BirthChartPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    if (!supabaseAdmin) {
        return notFound()
    }

    const { data: birthChart, error } = await supabaseAdmin
        .from("birth_charts")
        .select("*")
        .eq("id", id)
        .maybeSingle()

    if (error || !birthChart) {
        return notFound()
    }

    return <BirthChartDisplay birthChart={birthChart} />
}
