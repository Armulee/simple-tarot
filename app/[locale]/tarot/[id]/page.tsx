import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { cookies } from "next/headers"
import { DID_COOKIE } from "@/lib/server/did"
import { Card } from "@/components/ui/card"
import { cookies } from "next/headers"
import { supabase as s } from "@/lib/supabase"
import { Sparkles } from "lucide-react"

async function getShared(id: string) {
  const { data } = await supabase
    .from("shared_tarot")
    .select("id, question, cards, interpretation, created_at, did, owner_user_id")
    .eq("id", id)
    .maybeSingle()
  return data as (typeof data) & { did?: string | null; owner_user_id?: string | null }
}

export default async function SharedTarotPage({ params }: { params: { id: string } }) {
  const id = (params?.id ?? "").toString()
  const data = await getShared(id)
  if (!data) return notFound()
  // Award owner on visit (deduped and capped on server)
  try {
    // We do not know the viewer user id on server here; client can also call with user id.
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/stars/share-award`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_user_id: data.owner_user_id ?? null,
        owner_did: data.did ?? null,
        shared_id: data.id,
      }),
      cache: "no-store",
    })
  } catch {}
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Card className="p-8 bg-card/10 backdrop-blur-sm border-border/20">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="font-serif text-2xl">Shared Tarot</h1>
        </div>
        <div className="space-y-6">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Question</div>
            <div className="text-lg font-semibold">{data.question}</div>
          </div>
          {Array.isArray(data.cards) && data.cards.length > 0 && (
            <div>
              <div className="text-sm text-muted-foreground mb-1">Cards</div>
              <div className="text-foreground">{data.cards.join(", ")}</div>
            </div>
          )}
          <div>
            <div className="text-sm text-muted-foreground mb-1">Interpretation</div>
            <div className="whitespace-pre-wrap leading-relaxed">{data.interpretation}</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
