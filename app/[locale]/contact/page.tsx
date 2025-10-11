"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useTranslations } from "next-intl"
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
import { Mail, MessageSquare, Clock, Send } from "lucide-react"
import { toast } from "sonner"

const contactFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters"),
    email: z.string().email("Please enter a valid email address"),
    subject: z.string().min(5, "Subject must be at least 5 characters").max(100, "Subject must be less than 100 characters"),
    message: z.string().min(10, "Message must be at least 10 characters").max(1000, "Message must be less than 1000 characters"),
})

type ContactFormData = z.infer<typeof contactFormSchema>

export default function ContactPage() {
    const t = useTranslations("Contact")
    const [isSubmitting, setIsSubmitting] = useState(false)

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
            const response = await fetch("/api/contact", {
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
            form.reset()
            toast.success(t("form.success"))
            console.log("Contact form submitted successfully:", result.message)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t("form.error")
            toast.error(errorMessage)
            console.error("Contact form error:", err)
        } finally {
            setIsSubmitting(false)
        }
    }

    const contactInfo = [
        {
            icon: Mail,
            title: t("emailSupport"),
            description: t("emailSupportDescription"),
            value: "admin@askingfate.com",
            badge: t("responseTime24h"),
        },
        {
            icon: MessageSquare,
            title: t("liveChat"),
            description: t("liveChatDescription"),
            value: t("availableHours"),
            badge: t("weekdays"),
        },
        {
            icon: Clock,
            title: t("responseTime"),
            description: t("responseTimeDescription"),
            value: t("responseTimeValue"),
            badge: t("businessDays"),
        },
    ]

    const faqItems = [
        {
            question: t("faq.howToGetStars"),
            answer: t("faq.howToGetStarsAnswer"),
        },
        {
            question: t("faq.refundPolicy"),
            answer: t("faq.refundPolicyAnswer"),
        },
        {
            question: t("faq.dataPrivacy"),
            answer: t("faq.dataPrivacyAnswer"),
        },
        {
            question: t("faq.readingAccuracy"),
            answer: t("faq.readingAccuracyAnswer"),
        },
    ]


    return (
        <div className='min-h-screen p-6 relative overflow-hidden'>
            <div className='max-w-6xl mx-auto space-y-8 pt-10 relative z-10'>
                {/* Header */}
                <div className='text-center space-y-4'>
                    <h1 className='text-4xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                        {t("title")}
                    </h1>
                    <p className='text-gray-300 text-lg max-w-2xl mx-auto'>
                        {t("subtitle")}
                    </p>
                </div>

                {/* FAQ Section */}
                <Card className='bg-card/50 border-border/30 p-8 shadow-xl shadow-black/20 backdrop-blur-sm'>
                    <div className='space-y-6'>
                        <div className='flex items-center space-x-3'>
                            <MessageSquare className='w-6 h-6 text-secondary' />
                            <h2 className='text-2xl font-bold text-white'>
                                {t("faqTitle")}
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
                            {t("stillNeedHelp")}
                        </h2>
                        <p className='text-gray-300 max-w-2xl mx-auto'>
                            {t("stillNeedHelpDescription")}
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
                                    {t("sendMessage")}
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
                                                        {t("form.name")} *
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder={t("form.namePlaceholder")}
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
                                                        {t("form.email")} *
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="email"
                                                            placeholder={t("form.emailPlaceholder")}
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
                                                    {t("form.subject")} *
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={t("form.subjectPlaceholder")}
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
                                                    {t("form.message")} *
                                                </FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder={t("form.messagePlaceholder")}
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
                                                {t("form.submitting")}
                                            </>
                                        ) : (
                                            <>
                                                <Send className='w-4 h-4 mr-2' />
                                                {t("form.submit")}
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
