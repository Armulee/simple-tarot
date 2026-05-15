"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { ArrowRight, Mail, Send } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { useAuth } from "@/hooks/use-auth"
import type { SupportBlockPayload } from "@/components/chat/types"
import { useSupportBlockTopicCopy } from "./use-support-block-topic-copy"

const schema = z.object({
    name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(50, "Name must be less than 50 characters"),
    email: z.string().email("Please enter a valid email address"),
    subject: z
        .string()
        .min(5, "Subject must be at least 5 characters")
        .max(100, "Subject must be less than 100 characters"),
    message: z
        .string()
        .min(10, "Message must be at least 10 characters")
        .max(1000, "Message must be less than 1000 characters"),
})

type ContactFormValues = z.infer<typeof schema>

export function ContactBlock({
    payload,
}: {
    payload: Extract<SupportBlockPayload, { kind: "contact" }>
}) {
    const t = useTranslations("Contact")
    const { title, description } = useSupportBlockTopicCopy(payload)
    const { user } = useAuth()
    const [submitted, setSubmitted] = useState(false)

    const form = useForm<ContactFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: user?.user_metadata?.full_name ?? "",
            email: user?.email ?? "",
            subject: "",
            message: "",
        },
    })

    const onSubmit = async (data: ContactFormValues) => {
        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            if (!response.ok) {
                const err = await response.json().catch(() => ({}))
                throw new Error(
                    err?.message || err?.error || `Request failed`,
                )
            }
            toast.success(t("form.success"))
            form.reset({
                name: data.name,
                email: data.email,
                subject: "",
                message: "",
            })
            setSubmitted(true)
        } catch (err) {
            const message =
                err instanceof Error ? err.message : t("form.error")
            toast.error(message)
        }
    }

    const isSubmitting = form.formState.isSubmitting

    return (
        <div className='w-full md:max-w-[85%] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-4'>
            <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                    <h4 className='text-sm font-semibold text-white'>
                        {title}
                    </h4>
                    <p className='mt-1 text-xs text-white/65'>
                        {description}
                    </p>
                </div>
                <a
                    href='mailto:admin@askingfate.com'
                    className='shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/80 hover:text-white hover:border-white/30'
                >
                    <Mail className='h-3 w-3' />
                    admin@askingfate.com
                </a>
            </div>

            {submitted ? (
                <div className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100'>
                    {t("form.success")}
                </div>
            ) : (
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className='space-y-3'
                    >
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                            <FormField
                                control={form.control}
                                name='name'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='text-[11px] uppercase tracking-wider text-white/65'>
                                            {t("form.name")} *
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t(
                                                    "form.namePlaceholder",
                                                )}
                                                className='bg-background/30 border-border/30 text-foreground'
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name='email'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='text-[11px] uppercase tracking-wider text-white/65'>
                                            {t("form.email")} *
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type='email'
                                                placeholder={t(
                                                    "form.emailPlaceholder",
                                                )}
                                                className='bg-background/30 border-border/30 text-foreground'
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
                            name='subject'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className='text-[11px] uppercase tracking-wider text-white/65'>
                                        {t("form.subject")} *
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t(
                                                "form.subjectPlaceholder",
                                            )}
                                            className='bg-background/30 border-border/30 text-foreground'
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name='message'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className='text-[11px] uppercase tracking-wider text-white/65'>
                                        {t("form.message")} *
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea
                                            rows={4}
                                            placeholder={t(
                                                "form.messagePlaceholder",
                                            )}
                                            className='bg-background/30 border-border/30 text-foreground resize-none'
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                            <Button
                                type='submit'
                                disabled={isSubmitting}
                                className='flex-1 bg-primary hover:bg-primary/90 text-primary-foreground'
                            >
                                <Send className='mr-2 h-4 w-4' />
                                {isSubmitting
                                    ? t("form.submitting")
                                    : t("form.submit")}
                            </Button>
                            <Link
                                href={payload.href}
                                className='inline-flex items-center justify-center gap-1.5 rounded-md border border-white/15 px-4 py-2 text-sm text-white/85 hover:text-white hover:border-white/30'
                            >
                                {t("title")}
                                <ArrowRight className='h-4 w-4' />
                            </Link>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    )
}
