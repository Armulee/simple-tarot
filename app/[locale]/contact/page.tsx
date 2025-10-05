"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Mail, MessageSquare, Clock, Send, CheckCircle } from "lucide-react"

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [error, setError] = useState("")

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError("")

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            })

            if (!response.ok) {
                throw new Error("Failed to send message")
            }

            setIsSubmitted(true)
            setFormData({ name: "", email: "", subject: "", message: "" })
        } catch (err) {
            setError("Failed to send message. Please try again.")
            console.error("Contact form error:", err)
        } finally {
            setIsSubmitting(false)
        }
    }

    const contactInfo = [
        {
            icon: Mail,
            title: "Email Support",
            description: "Get help via email",
            value: "admin@askingfate.com",
            badge: "24-48h response",
        },
        {
            icon: MessageSquare,
            title: "Live Chat",
            description: "Chat with our support team",
            value: "Available 9 AM - 6 PM EST",
            badge: "Mon-Fri",
        },
        {
            icon: Clock,
            title: "Response Time",
            description: "Typical response time",
            value: "Within 24-48 hours",
            badge: "Business days",
        },
    ]

    const faqItems = [
        {
            question: "How do I get more stars?",
            answer: "You can purchase stars through our billing page or earn them through special promotions. Check the pricing page for current packages.",
        },
        {
            question: "Can I get a refund?",
            answer: "We offer refunds within 7 days of purchase for unused stars. Contact us with your transaction details for assistance.",
        },
        {
            question: "Is my reading data private?",
            answer: "Yes, all your readings and personal information are kept completely private and secure. We never share your data with third parties.",
        },
        {
            question: "How accurate are the readings?",
            answer: "Our AI-powered interpretations provide insightful guidance based on traditional tarot wisdom. Use them as a tool for reflection and personal growth.",
        },
    ]

    if (isSubmitted) {
        return (
            <div className='min-h-screen p-6 relative overflow-hidden'>
                <div className='max-w-4xl mx-auto pt-20 relative z-10'>
                    <Card className='bg-card/50 border-border/30 p-16 text-center shadow-xl shadow-black/20 backdrop-blur-sm'>
                        <div className='flex items-center justify-center mb-6'>
                            <CheckCircle className='w-16 h-16 text-primary' />
                        </div>
                        <h1 className='text-3xl font-bold text-primary mb-4'>
                            Message Sent Successfully!
                        </h1>
                        <p className='text-gray-300 text-lg mb-6'>
                            Thank you for contacting us. We&apos;ll get back to
                            you within 24-48 hours.
                        </p>
                        <Button
                            onClick={() => setIsSubmitted(false)}
                            className='bg-primary/20 border-primary/30 text-primary hover:bg-primary/30 hover:border-primary/50 transition-all duration-300'
                        >
                            Send Another Message
                        </Button>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className='min-h-screen p-6 relative overflow-hidden'>
            <div className='max-w-6xl mx-auto space-y-8 pt-10 relative z-10'>
                {/* Header */}
                <div className='text-center space-y-4'>
                    <h1 className='text-4xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                        Contact & Support
                    </h1>
                    <p className='text-gray-300 text-lg max-w-2xl mx-auto'>
                        Need help? Have questions? We&apos;re here to assist you
                        on your mystical journey.
                    </p>
                </div>

                {/* FAQ Section */}
                <Card className='bg-card/50 border-border/30 p-8 shadow-xl shadow-black/20 backdrop-blur-sm'>
                    <div className='space-y-6'>
                        <div className='flex items-center space-x-3'>
                            <MessageSquare className='w-6 h-6 text-secondary' />
                            <h2 className='text-2xl font-bold text-white'>
                                Frequently Asked Questions
                            </h2>
                        </div>

                        <div className='space-y-4'>
                            {faqItems.map((faq, index) => (
                                <div
                                    key={index}
                                    className='border-b border-white/10 pb-4 last:border-b-0'
                                >
                                    <h3 className='font-semibold text-white mb-2'>
                                        {faq.question}
                                    </h3>
                                    <p className='text-sm text-gray-300 leading-relaxed'>
                                        {faq.answer}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Additional Information */}
                <Card className='bg-card/50 border-border/30 p-8 shadow-xl shadow-black/20 backdrop-blur-sm'>
                    <div className='text-center space-y-4'>
                        <h2 className='text-2xl font-bold text-white'>
                            Still Need Help?
                        </h2>
                        <p className='text-gray-300 max-w-2xl mx-auto'>
                            If you can&apos;t find what you&apos;re looking for,
                            don&apos;t hesitate to reach out. Our support team
                            is dedicated to helping you have the best experience
                            with Asking Fate.
                        </p>
                    </div>
                </Card>

                {/* Contact Information Cards */}
                <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                    {contactInfo.map((info, index) => (
                        <Card
                            key={index}
                            className='bg-card/50 border-border/30 p-6 shadow-xl shadow-black/20 backdrop-blur-sm hover:border-primary/40 transition-all duration-300'
                        >
                            <div className='flex items-start space-x-4'>
                                <div className='w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center'>
                                    <info.icon className='w-6 h-6 text-primary' />
                                </div>
                                <div className='flex-1'>
                                    <div className='flex items-center space-x-2 mb-2'>
                                        <h3 className='font-semibold text-white'>
                                            {info.title}
                                        </h3>
                                        <Badge
                                            variant='outline'
                                            className='bg-primary/20 text-primary border-primary/40 text-xs'
                                        >
                                            {info.badge}
                                        </Badge>
                                    </div>
                                    <p className='text-sm text-gray-400 mb-1'>
                                        {info.description}
                                    </p>
                                    <p className='text-sm text-primary font-medium'>
                                        {info.value}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                    {/* Contact Form */}
                    <Card className='bg-card/50 border-border/30 p-8 shadow-xl shadow-black/20 backdrop-blur-sm'>
                        <div className='space-y-6'>
                            <div className='flex items-center space-x-3'>
                                <Send className='w-6 h-6 text-primary' />
                                <h2 className='text-2xl font-bold text-white'>
                                    Send us a Message
                                </h2>
                            </div>

                            <form onSubmit={handleSubmit} className='space-y-4'>
                                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                    <div>
                                        <Label
                                            htmlFor='name'
                                            className='text-white font-medium'
                                        >
                                            Name *
                                        </Label>
                                        <Input
                                            id='name'
                                            name='name'
                                            type='text'
                                            required
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className='bg-background/30 border-border/30 text-foreground placeholder-muted-foreground focus:border-primary/50'
                                            placeholder='Your name'
                                        />
                                    </div>
                                    <div>
                                        <Label
                                            htmlFor='email'
                                            className='text-white font-medium'
                                        >
                                            Email *
                                        </Label>
                                        <Input
                                            id='email'
                                            name='email'
                                            type='email'
                                            required
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className='bg-background/30 border-border/30 text-foreground placeholder-muted-foreground focus:border-primary/50'
                                            placeholder='your@email.com'
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label
                                        htmlFor='subject'
                                        className='text-white font-medium'
                                    >
                                        Subject *
                                    </Label>
                                    <Input
                                        id='subject'
                                        name='subject'
                                        type='text'
                                        required
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        className='bg-black/30 border-yellow-400/30 text-white placeholder-gray-400 focus:border-yellow-400/50'
                                        placeholder='What can we help you with?'
                                    />
                                </div>

                                <div>
                                    <Label
                                        htmlFor='message'
                                        className='text-white font-medium'
                                    >
                                        Message *
                                    </Label>
                                    <Textarea
                                        id='message'
                                        name='message'
                                        required
                                        rows={6}
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        className='bg-black/30 border-yellow-400/30 text-white placeholder-gray-400 focus:border-yellow-400/50 resize-none'
                                        placeholder='Please describe your inquiry or concern in detail...'
                                    />
                                </div>

                                {error && (
                                    <div className='p-3 bg-red-500/20 border border-red-400/30 rounded-lg'>
                                        <p className='text-red-300 text-sm'>
                                            {error}
                                        </p>
                                    </div>
                                )}

                                <Button
                                    type='submit'
                                    disabled={isSubmitting}
                                    className='w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-all duration-300 shadow-lg shadow-primary/25'
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className='w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2' />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className='w-4 h-4 mr-2' />
                                            Send Message
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
