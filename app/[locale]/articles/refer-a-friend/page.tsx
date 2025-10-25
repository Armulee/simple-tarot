import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Articles")
  const title = t("items.referFriend.title")
  const desc = t("subtitle")
  return { title: `${title} | Asking Fate`, description: desc }
}

export default async function ReferFriendArticlePage() {
  const t = await getTranslations("Articles")

  return (
    <div className="min-h-screen relative overflow-hidden">
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <div className="space-y-8">
          <div className="space-y-2">
            <Link href="/articles" className="text-primary/80 hover:text-primary">← {t("title")}</Link>
            <h1 className="font-serif font-bold text-4xl">{t("items.referFriend.title")}</h1>
            <p className="text-muted-foreground">{t("items.referFriend.description")}</p>
          </div>

          <section className="space-y-4 prose prose-invert max-w-none">
            <p>
              Invite friends with your referral link. When they register, both of you earn stars. Weekly bonuses may apply for multiple successful invites.
            </p>
            <h2>Where to find your link</h2>
            <ol>
              <li>Go to <Link href="/referral" className="text-primary hover:underline">Referral</Link>.</li>
              <li>Copy your unique referral link.</li>
              <li>Share it with friends.</li>
            </ol>
            <h2>Rewards</h2>
            <ul>
              <li>Both you and your friend earn stars after registration completes.</li>
              <li>Weekly cap and bonus rules may apply.</li>
              <li>Fraudulent signups will be voided.</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
