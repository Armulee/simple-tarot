"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

type CustomPlanFormState = {
    name: string
    email: string
    starsPerDay: string
    isRecurring: boolean
    notes: string
}

export default function CustomPlanPage() {
    const t = useTranslations("CustomPlan")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formState, setFormState] = useState<CustomPlanFormState>({
        name: "",
        email: "",
        starsPerDay: "",
        isRecurring: true,
        notes: "",
    })

    const updateForm = (
        field: keyof CustomPlanFormState,
        value: string | boolean
    ) => {
        setFormState((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (isSubmitting) return

        const starsPerDay = Number(formState.starsPerDay)
        if (!Number.isFinite(starsPerDay) || starsPerDay <= 0) {
            toast.error(t("validation.starsPerDay"))
            return
        }

        setIsSubmitting(true)
        try {
            const response = await fetch("/api/custom-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formState.name.trim(),
                    email: formState.email.trim(),
                    starsPerDay,
                    isRecurring: formState.isRecurring,
                    notes: formState.notes.trim(),
                }),
            })
            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data?.error || t("error"))
            }
            toast.success(t("success"))
            setFormState({
                name: "",
                email: "",
                starsPerDay: "",
                isRecurring: false,
                notes: "",
            })
        } catch (error) {
            const message =
                error instanceof Error ? error.message : t("error")
            toast.error(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <section className='relative z-10 max-w-3xl mx-auto px-6 py-14'>
            <div className='text-center space-y-3 mb-10'>
                <h1 className='text-3xl md:text-4xl font-serif font-bold text-white'>
                    {t("title")}
                </h1>
                <p className='text-muted-foreground text-base'>
                    {t("subtitle")}
                </p>
            </div>

            <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20'>
                <form onSubmit={handleSubmit} className='space-y-6'>
                    <div className='grid md:grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='name'>{t("fields.name")}</Label>
                            <Input
                                id='name'
                                value={formState.name}
                                onChange={(event) =>
                                    updateForm("name", event.target.value)
                                }
                                placeholder={t("placeholders.name")}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='email'>{t("fields.email")}</Label>
                            <Input
                                id='email'
                                type='email'
                                value={formState.email}
                                onChange={(event) =>
                                    updateForm("email", event.target.value)
                                }
                                placeholder={t("placeholders.email")}
                                required
                            />
                        </div>
                    </div>

                    <div className='grid md:grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='starsPerDay'>
                                {t("fields.starsPerDay")}
                            </Label>
                            <Input
                                id='starsPerDay'
                                type='number'
                                min='1'
                                value={formState.starsPerDay}
                                onChange={(event) =>
                                    updateForm("starsPerDay", event.target.value)
                                }
                                placeholder={t("placeholders.starsPerDay")}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <div className='flex items-center gap-3 rounded-md border border-border/30 bg-black/20 px-3 py-2'>
                                <Checkbox
                                    id='isRecurring'
                                    checked={formState.isRecurring}
                                    onCheckedChange={(value) =>
                                        updateForm("isRecurring", Boolean(value))
                                    }
                                />
                                <span className='text-sm text-muted-foreground'>
                                    {t("placeholders.recurring")}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className='space-y-2'>
                        <Label htmlFor='notes'>{t("fields.notes")}</Label>
                        <Textarea
                            id='notes'
                            value={formState.notes}
                            onChange={(event) =>
                                updateForm("notes", event.target.value)
                            }
                            placeholder={t("placeholders.notes")}
                            className='min-h-[120px] resize-none'
                        />
                    </div>

                    <Button
                        type='submit'
                        size='lg'
                        className='w-full'
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? t("submitting") : t("submit")}
                    </Button>
                </form>
            </Card>
        </section>
    )
}
