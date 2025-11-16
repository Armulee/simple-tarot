"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles } from "lucide-react"

export default function PurchasePage() {
    return (
        <section className='relative z-10 max-w-3xl mx-auto px-6 py-10 space-y-6'>
            <div className='flex items-center gap-3'>
                <Link
                    href='/pricing'
                    className='inline-flex items-center gap-2 text-sm text-white/80 hover:text-white'
                >
                    <ArrowLeft className='w-4 h-4' /> Back to pricing
                </Link>
            </div>

            <Card className='relative overflow-hidden p-12 rounded-xl bg-card/10 border-border/20'>
                <div className='flex flex-col items-center justify-center text-center space-y-6'>
                    <div className='w-20 h-20 rounded-full bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center'>
                        <Sparkles className='w-10 h-10 text-yellow-300' />
                    </div>
                    <div className='space-y-3'>
                        <h1 className='font-serif font-bold text-3xl text-white'>
                            Star Purchase Coming Soon
                        </h1>
                        <p className='text-muted-foreground max-w-md mx-auto'>
                            We&apos;re working on bringing you a seamless star purchase experience. 
                            Stay tuned for updates!
                        </p>
                    </div>
                    <Link href='/pricing'>
                        <Button
                            className='rounded-full bg-white text-black hover:brightness-90'
                        >
                            Back to Pricing
                        </Button>
                    </Link>
                </div>
            </Card>
        </section>
    )
}
