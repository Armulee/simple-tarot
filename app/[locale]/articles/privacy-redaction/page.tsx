import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import {
    ArticleLayout,
    type ArticleSection,
} from "@/components/articles/article-layout"
import { ARTICLES } from "@/components/articles/data"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Meta.PrivacyRedactionArticle")
    return {
        title: t("title"),
        description: t("description"),
    }
}

export default async function PrivacyRedactionArticlePage() {
    const t = await getTranslations("PrivacyRedactionArticle")
    const tArticles = await getTranslations("Articles")

    const sections: ArticleSection[] = [
        {
            id: "notice",
            title: t("sections.notice.title"),
            content: (
                <div className='space-y-3'>
                    <p>{t("sections.notice.p1")}</p>
                    <p>{t("sections.notice.p2")}</p>
                </div>
            ),
        },
        {
            id: "criteria",
            title: t("sections.criteria.title"),
            content: (
                <div className='space-y-2'>
                    <p>{t("sections.criteria.intro")}</p>
                    <ul className='list-disc pl-5 space-y-1 text-muted-foreground'>
                        <li>{t("sections.criteria.person")}</li>
                        <li>{t("sections.criteria.email")}</li>
                        <li>{t("sections.criteria.phone")}</li>
                        <li>{t("sections.criteria.handle")}</li>
                        <li>{t("sections.criteria.address")}</li>
                    </ul>
                </div>
            ),
        },
        {
            id: "how",
            title: t("sections.how.title"),
            content: (
                <div className='space-y-3'>
                    <p>{t("sections.how.p1")}</p>
                    <p>{t("sections.how.p2")}</p>
                </div>
            ),
        },
        {
            id: "placeholders",
            title: t("sections.placeholders.title"),
            content: (
                <div className='space-y-3'>
                    <p>{t("sections.placeholders.p1")}</p>
                    <p className='text-muted-foreground'>
                        {t("sections.placeholders.privacyPolicyLink")}{" "}
                        <Link
                            href='/privacy-policy'
                            className='text-primary hover:underline'
                        >
                            {t("sections.placeholders.privacyPolicy")}
                        </Link>
                        .
                    </p>
                </div>
            ),
        },
        {
            id: "fallback",
            title: t("sections.fallback.title"),
            content: (
                <div className='space-y-2'>
                    <p>{t("sections.fallback.p1")}</p>
                </div>
            ),
        },
    ]

    return (
        <ArticleLayout
            title={t("title")}
            subtitle={t("subtitle")}
            updated={t("updated")}
            backHref='/articles'
            backLabel={tArticles("title")}
            onThisPageLabel={t("onThisPage")}
            tocIds={[
                "notice",
                "criteria",
                "how",
                "placeholders",
                "fallback",
            ]}
            sections={sections}
            related={[ARTICLES[4], ARTICLES[5], ARTICLES[3]]}
        />
    )
}
