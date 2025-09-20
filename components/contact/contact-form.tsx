"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function ContactForm() {
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

        alert("Thank you for your message! We'll get back to you soon.")

        // Reset form
        setFormData({ name: "", email: "", subject: "", message: "" })
        setIsSubmitting(false)
    }

    const updateFormData = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    return (
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
                                    updateFormData("name", e.target.value)
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
                                    updateFormData("email", e.target.value)
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
                                updateFormData("subject", e.target.value)
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
                                updateFormData("message", e.target.value)
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
                    {isSubmitting ? "Sending Message..." : "Send Message"}
                </Button>
            </form>
        </Card>
    )
}
