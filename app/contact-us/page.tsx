"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { Mail, MessageCircle, Clock } from "lucide-react"

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    })
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        // Simulate form submission
        await new Promise((resolve) => setTimeout(resolve, 1500))

        console.log("Contact form submitted:", formData)
        alert("Thank you for your message! We'll get back to you soon.")

        // Reset form
        setFormData({ name: "", email: "", subject: "", message: "" })
        setIsSubmitting(false)
    }

    const updateFormData = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    return (
        <div className='min-h-screen relative overflow-hidden'>
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
                        <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20'>
                            <form onSubmit={handleSubmit} className='space-y-6'>
                                <div className='space-y-4'>
                                    <div className='grid grid-cols-2 gap-4'>
                                        <div className='space-y-2'>
                                            <Label
                                                htmlFor='name'
                                                className='text-sm font-medium'
                                            >
                                                Name
                                            </Label>
                                            <Input
                                                id='name'
                                                type='text'
                                                placeholder='Your name'
                                                value={formData.name}
                                                onChange={(e) =>
                                                    updateFormData(
                                                        "name",
                                                        e.target.value
                                                    )
                                                }
                                                className='bg-input/20 backdrop-blur-sm border-border/30 focus:border-primary/50 floating-input'
                                                required
                                            />
                                        </div>
                                        <div className='space-y-2'>
                                            <Label
                                                htmlFor='email'
                                                className='text-sm font-medium'
                                            >
                                                Email
                                            </Label>
                                            <Input
                                                id='email'
                                                type='email'
                                                placeholder='your@email.com'
                                                value={formData.email}
                                                onChange={(e) =>
                                                    updateFormData(
                                                        "email",
                                                        e.target.value
                                                    )
                                                }
                                                className='bg-input/20 backdrop-blur-sm border-border/30 focus:border-primary/50 floating-input'
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className='space-y-2'>
                                        <Label
                                            htmlFor='subject'
                                            className='text-sm font-medium'
                                        >
                                            Subject
                                        </Label>
                                        <Input
                                            id='subject'
                                            type='text'
                                            placeholder='What can we help you with?'
                                            value={formData.subject}
                                            onChange={(e) =>
                                                updateFormData(
                                                    "subject",
                                                    e.target.value
                                                )
                                            }
                                            className='bg-input/20 backdrop-blur-sm border-border/30 focus:border-primary/50 floating-input'
                                            required
                                        />
                                    </div>

                                    <div className='space-y-2'>
                                        <Label
                                            htmlFor='message'
                                            className='text-sm font-medium'
                                        >
                                            Message
                                        </Label>
                                        <Textarea
                                            id='message'
                                            placeholder='Tell us more about your question or concern...'
                                            value={formData.message}
                                            onChange={(e) =>
                                                updateFormData(
                                                    "message",
                                                    e.target.value
                                                )
                                            }
                                            className='bg-input/20 backdrop-blur-sm border-border/30 focus:border-primary/50 min-h-[120px] resize-none floating-input'
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type='submit'
                                    disabled={isSubmitting}
                                    size='lg'
                                    className='w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 card-glow'
                                >
                                    {isSubmitting
                                        ? "Sending Message..."
                                        : "Send Message"}
                                </Button>
                            </form>
                        </Card>

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
                                                Our service is completely free
                                                to use. No subscriptions or
                                                payments required.
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
