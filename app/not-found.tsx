import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Ghost, Home } from "lucide-react"
import "./globals.css"

export default function NotFound() {
  return (
    <div className="min-h-[80dvh] flex items-center justify-center px-6">
      <div className="max-w-xl w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
          <Ghost className="w-8 h-8 text-white/80" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-white">Page not found</h1>
        <p className="text-white/70">
          The page you are looking for doesn’t exist, was moved, or is temporarily unavailable.
        </p>
        <div className="pt-2">
          <Link href="/">
            <Button className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black hover:from-yellow-300 hover:to-amber-400">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
