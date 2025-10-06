"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Mail, MessageSquare, Clock, Send, CheckCircle } from "lucide-react"
import { toast } from "sonner"

const contactFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters"),
    email: z.string().email("Please enter a valid email address"),
    subject: z.string().min(5, "Subject must be at least 5 characters").max(100, "Subject must be less than 100 characters"),
    message: z.string().min(10, "Message must be at least 10 characters").max(1000, "Message must be less than 1000 characters"),
})

type ContactFormData = z.infer<typeof contactFormSchema>

export default function ContactPage() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)

    const form = useForm<ContactFormData>({
        resolver: zodResolver(contactFormSchema),
        defaultValues: {
            name: "",
            email: "",
            subject: "",
            message: "",
        },
    })

    const onSubmit = async (data: ContactFormData) => {
        setIsSubmitting(true)

        try {
            const response = await fetch("https://resend.askingfate.com/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
            }

            const result = await response.json()
            setIsSubmitted(true)
            form.reset()
            toast.success("Message sent successfully! We'll get back to you soon.")
            console.log("Contact form submitted successfully:", result.message)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to send message. Please try again."
            toast.error(errorMessage)
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

                        <Accordion className='w-full'>
                            {faqItems.map((faq, index) => (
                                <AccordionItem
                                    key={index}
                                    className='border-b border-white/10 last:border-b-0'
                                >
                                    <AccordionTrigger className='text-left text-white hover:text-primary transition-colors duration-200 py-4'>
                                        <span className='font-semibold'>
                                            {faq.question}
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className='text-gray-300 leading-relaxed pb-4'>
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
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
                                <div className='w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center'>
                                    <info.icon className='w-6 h-6 text-accent' />
                                </div>
                                <div className='flex-1'>
                                    <div className='flex items-center space-x-2 mb-2'>
                                        <h3 className='font-semibold text-white'>
                                            {info.title}
                                        </h3>
                                        <Badge
                                            variant='outline'
                                            className='bg-accent/20 text-accent border-accent/40 text-xs'
                                        >
                                            {info.badge}
                                        </Badge>
                                    </div>
                                    <p className='text-sm text-gray-400 mb-1'>
                                        {info.description}
                                    </p>
                                    <p className='text-sm text-accent font-medium'>
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

                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className='text-white font-medium'>
                                                        Name *
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Your name"
                                                            className='bg-background/30 border-border/30 text-foreground placeholder-muted-foreground focus:border-primary/50'
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className='text-white font-medium'>
                                                        Email *
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="email"
                                                            placeholder="your@email.com"
                                                            className='bg-background/30 border-border/30 text-foreground placeholder-muted-foreground focus:border-primary/50'
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="subject"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className='text-white font-medium'>
                                                    Subject *
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="What can we help you with?"
                                                        className='bg-background/30 border-border/30 text-foreground placeholder-muted-foreground focus:border-primary/50'
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="message"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className='text-white font-medium'>
                                                    Message *
                                                </FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Please describe your inquiry or concern in detail..."
                                                        className='bg-background/30 border-border/30 text-foreground placeholder-muted-foreground focus:border-primary/50 resize-none'
                                                        rows={6}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

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
                            </Form>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
