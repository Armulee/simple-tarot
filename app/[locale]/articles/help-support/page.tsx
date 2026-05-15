import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import {
    ArticleLayout,
    type ArticleSection,
} from "@/components/articles/article-layout"
import { ARTICLES } from "@/components/articles/data"

const linkClass = "text-primary hover:underline"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Articles")
    const title = t("items.helpSupport.title")
    const desc = t("items.helpSupport.description")
    return { title: `${title} | AskingFate`, description: desc }
}

export default async function HelpSupportArticlePage() {
    const t = await getTranslations("Articles")

    const sections: ArticleSection[] = [
        {
            id: "help",
            title: t("items.helpSupport.helpTitle"),
            content: (
                <div className='space-y-2'>
                    <p>{t("items.helpSupport.helpIntro")}</p>
                    <ul className='list-disc pl-5 space-y-1 text-muted-foreground'>
                        <li>
                            {t.rich("items.helpSupport.helpBulletFaq", {
                                faq: (chunks) => (
                                    <Link
                                        href='/articles/faq'
                                        className={linkClass}
                                    >
                                        {chunks}
                                    </Link>
                                ),
                            })}
                        </li>
                        <li>
                            {t.rich("items.helpSupport.helpBulletContact", {
                                contact: (chunks) => (
                                    <Link href='/contact' className={linkClass}>
                                        {chunks}
                                    </Link>
                                ),
                            })}
                        </li>
                        <li>{t("items.helpSupport.helpBulletEmail")}</li>
                    </ul>
                </div>
            ),
        },
        {
            id: "troubleshooting",
            title: t("items.helpSupport.troubleshootingTitle"),
            content: (
                <div className='space-y-2'>
                    <p>{t("items.helpSupport.troubleshootingIntro")}</p>
                    <ul className='list-disc pl-5 space-y-1 text-muted-foreground'>
                        <li>
                            {t.rich(
                                "items.helpSupport.troubleshootingBulletStars",
                                {
                                    stars: (chunks) => (
                                        <Link
                                            href='/stars'
                                            className={linkClass}
                                        >
                                            {chunks}
                                        </Link>
                                    ),
                                }
                            )}
                        </li>
                        <li>
                            {t("items.helpSupport.troubleshootingBulletAds")}
                        </li>
                        <li>
                            {t("items.helpSupport.troubleshootingBulletSlow")}
                        </li>
                    </ul>
                </div>
            ),
        },
        {
            id: "privacy",
            title: t("items.helpSupport.privacyTitle"),
            content: (
                <div className='space-y-2'>
                    <p>{t("items.helpSupport.privacyIntro")}</p>
                    <ul className='list-disc pl-5 space-y-1 text-muted-foreground'>
                        <li>
                            {t.rich(
                                "items.helpSupport.privacyBulletPolicy",
                                {
                                    policy: (chunks) => (
                                        <Link
                                            href='/privacy-policy'
                                            className={linkClass}
                                        >
                                            {chunks}
                                        </Link>
                                    ),
                                }
                            )}
                        </li>
                        <li>{t("items.helpSupport.privacyBulletSell")}</li>
                    </ul>
                </div>
            ),
        },
    ]

    return (
        <ArticleLayout
            title={t("items.helpSupport.title")}
            subtitle={t("items.helpSupport.description")}
            backLabel={t("title")}
            onThisPageLabel={t("items.helpSupport.onThisPage")}
            sections={sections}
            related={[ARTICLES[5], ARTICLES[1], ARTICLES[3]]}
        />
    )
}
