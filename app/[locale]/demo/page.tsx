import type { Metadata } from "next"
import InteractiveDemo from "@/components/demo/interactive-demo"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Request a Demo | Asking Fate",
  description:
    "See Asking Fate in action. Request a short live walkthrough and try an interactive preview.",
}

export default function DemoPage() {
  return (
    <div className='min-h-screen relative overflow-hidden'>
      <main className='relative z-10 max-w-6xl mx-auto px-6 py-16 space-y-10'>
        <div className='text-center space-y-4'>
          <h1 className='font-serif font-bold text-4xl md:text-5xl text-balance'>
            See Asking Fate in action
          </h1>
          <p className='text-muted-foreground max-w-2xl mx-auto'>
            A short, calm walkthrough tailored to your needs — plus a simple
            interactive preview below.
          </p>
          <div className='flex items-center justify-center gap-3'>
            <Link
              href='/about'
              className='text-sm text-primary hover:underline underline-offset-4'
            >
              Learn about the product
            </Link>
            <span className='text-gray-600'>•</span>
            <Link
              href='/tarot'
              className='text-sm text-primary hover:underline underline-offset-4'
            >
              Try a reading now
            </Link>
          </div>
        </div>

        <InteractiveDemo />
      </main>
    </div>
  )
}
