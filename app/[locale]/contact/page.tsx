import type { Metadata } from "next"
import { Card } from "@/components/ui/card"
import { Mail, MessageCircle, Clock } from "lucide-react"
import ContactForm from "@/components/contact/contact-form"
import ContactNavigation from "@/components/contact/contact-navigation"

export const metadata: Metadata = {
    title: "Contact Us - Get Help with Your AI Tarot Reading | Asking Fate",
    description: "Have questions about your AI tarot reading experience? Contact our support team for assistance with your cosmic journey and spiritual guidance.",
    keywords: "tarot reading support, AI tarot help, spiritual guidance contact, tarot reading questions, customer support",
    openGraph: {
        title: "Contact Us - Get Help with Your AI Tarot Reading",
        description: "Have questions about your AI tarot reading experience? Contact our support team for assistance.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Contact Us - Get Help with Your AI Tarot Reading",
        description: "Have questions about your AI tarot reading experience? Contact our support team for assistance.",
    },
}

export default function ContactPage() {
    return (
        <div className='min-h-screen relative overflow-hidden'>
            {/* Navigation */}
            <ContactNavigation />

            <main className='relative z-10 max-w-4xl mx-auto px-6 py-16'>
                <div className='space-y-12'>
                    {/* Header */}
                    <div className='text-center space-y-4'>
                        <h1 className='font-serif font-bold text-4xl'>
                            Get in Touch
                        </h1>
                        <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
                            Have questions about your cosmic journey? We&apos;re
                            here to help guide you through the stars.
                        </p>
                    </div>

                    <div className='grid md:grid-cols-2 gap-12'>
                        {/* Contact Form */}
                        <ContactForm />

                        {/* Contact Information */}
                        <div className='space-y-6'>
                            <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                                <div className='flex items-start space-x-4'>
                                    <div className='w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0'>
                                        <Mail className='w-6 h-6 text-primary' />
                                    </div>
                                    <div className='space-y-2'>
                                        <h3 className='font-serif font-semibold text-lg'>
                                            Email Support
                                        </h3>
                                        <p className='text-muted-foreground'>
                                            Send us an email and we&apos;ll
                                            respond within 24 hours during
                                            business days.
                                        </p>
                                        <p className='text-primary'>
                                            support@cosmictarot.com
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                                <div className='flex items-start space-x-4'>
                                    <div className='w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0'>
                                        <MessageCircle className='w-6 h-6 text-secondary' />
                                    </div>
                                    <div className='space-y-2'>
                                        <h3 className='font-serif font-semibold text-lg'>
                                            Live Chat
                                        </h3>
                                        <p className='text-muted-foreground'>
                                            Chat with our support team in
                                            real-time for immediate assistance.
                                        </p>
                                        <p className='text-secondary'>
                                            Available 9 AM - 6 PM EST
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                                <div className='flex items-start space-x-4'>
                                    <div className='w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0'>
                                        <Clock className='w-6 h-6 text-accent' />
                                    </div>
                                    <div className='space-y-2'>
                                        <h3 className='font-serif font-semibold text-lg'>
                                            Response Time
                                        </h3>
                                        <p className='text-muted-foreground'>
                                            We typically respond to all
                                            inquiries within 24 hours. Premium
                                            subscribers receive priority
                                            support.
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                                <div className='space-y-4'>
                                    <h3 className='font-serif font-semibold text-lg'>
                                        Frequently Asked Questions
                                    </h3>
                                    <div className='space-y-3'>
                                        <div>
                                            <h4 className='font-medium text-sm'>
                                                How accurate are the AI
                                                readings?
                                            </h4>
                                            <p className='text-muted-foreground text-sm'>
                                                Our AI provides insights based
                                                on traditional tarot symbolism,
                                                but readings are for guidance
                                                and entertainment.
                                            </p>
                                        </div>
                                        <div>
                                            <h4 className='font-medium text-sm'>
                                                Is the service free to use?
                                            </h4>
                                            <p className='text-muted-foreground text-sm'>
                                                Our service is completely free to use. 
                                                No subscriptions or payments required.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
