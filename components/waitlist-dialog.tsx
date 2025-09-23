"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { 
    Sparkles, 
    Mail, 
    Clock, 
    Star,
    ArrowUpAZ,
    Hash,
    Palette,
    BookOpen
} from "lucide-react"
import Link from "next/link"
import mysticalServices from "@/components/navbar/mystical-services"

interface WaitlistDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    serviceId: string | null
    isLoggedIn: boolean
}

export function WaitlistDialog({ open, onOpenChange, serviceId, isLoggedIn }: WaitlistDialogProps) {
    const t = useTranslations("Services")
    // const s = useTranslations("Waitlist")
    const [email, setEmail] = useState("")
    const [emailConsent, setEmailConsent] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!serviceId) return null

    const service = mysticalServices.find(s => s.id === serviceId)
    if (!service) return null

    const getServiceIcon = (serviceId: string) => {
        const serviceMap: Record<string, React.ReactNode> = {
            tarot: <BookOpen className="w-6 h-6" />,
            astrology: <Star className="w-6 h-6" />,
            namelogy: <ArrowUpAZ className="w-6 h-6" />,
            numerology: <Hash className="w-6 h-6" />,
            luckyColors: <Palette className="w-6 h-6" />
        }
        return serviceMap[serviceId] || <Sparkles className="w-6 h-6" />
    }

    const getServiceDescription = (serviceId: string) => {
        const descriptions: Record<string, string> = {
            astrology: "Get personalized birth chart analysis and planetary insights",
            namelogy: "Discover the mystical meanings hidden in your name",
            numerology: "Uncover the power of numbers in your life journey",
            luckyColors: "Find your personal color palette for luck and harmony"
        }
        return descriptions[serviceId] || "Get personalized mystical insights"
    }

    const getEstimatedLaunch = (serviceId: string) => {
        const launches: Record<string, string> = {
            astrology: "Q2 2024",
            namelogy: "Q3 2024", 
            numerology: "Q3 2024",
            luckyColors: "Q4 2024"
        }
        return launches[serviceId] || "Coming Soon"
    }

    const handleSubmit = async () => {
        if (!emailConsent) return
        
        setIsSubmitting(true)
        try {
            // Here you would implement the actual waitlist signup logic
            await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
            onOpenChange(false)
            setEmail("")
            setEmailConsent(false)
        } catch (error) {
            console.error("Failed to join waitlist:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isLoggedIn) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border-border/30">
                    <DialogHeader className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/30">
                            {getServiceIcon(serviceId)}
                        </div>
                        <DialogTitle className="text-2xl font-bold text-white">
                            {t(serviceId)} Coming Soon!
                        </DialogTitle>
                        <DialogDescription className="text-white/80">
                            {getServiceDescription(serviceId)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="text-center space-y-3">
                            <Badge variant="outline" className="bg-white/10 text-white/80 border-white/20">
                                <Clock className="w-4 h-4 mr-2" />
                                Estimated Launch: {getEstimatedLaunch(serviceId)}
                            </Badge>
                            <p className="text-sm text-white/70">
                                Sign in to join the waitlist and be the first to experience this mystical service.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Link href="/signin" className="w-full">
                                <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white">
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Sign In to Join Waitlist
                                </Button>
                            </Link>
                            
                            <div className="text-center">
                                <Link 
                                    href="/signup" 
                                    className="text-sm text-white/70 hover:text-white transition-colors"
                                >
                                    Don&apos;t have an account? Create one
                                </Link>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border-border/30">
                <DialogHeader className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/30">
                        {getServiceIcon(serviceId)}
                    </div>
                    <DialogTitle className="text-2xl font-bold text-white">
                        Join the {t(serviceId)} Waitlist
                    </DialogTitle>
                    <DialogDescription className="text-white/80">
                        {getServiceDescription(serviceId)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="text-center space-y-3">
                        <Badge variant="outline" className="bg-white/10 text-white/80 border-white/20">
                            <Clock className="w-4 h-4 mr-2" />
                            Estimated Launch: {getEstimatedLaunch(serviceId)}
                        </Badge>
                        <p className="text-sm text-white/70">
                            Be the first to know when {t(serviceId)} becomes available!
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-white/90">
                                Email Address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="email-consent"
                                checked={emailConsent}
                                onCheckedChange={(checked) => setEmailConsent(checked as boolean)}
                                className="border-white/30"
                            />
                            <Label 
                                htmlFor="email-consent" 
                                className="text-sm text-white/80 cursor-pointer"
                            >
                                I want to receive email notifications about {t(serviceId)} launch and updates
                            </Label>
                        </div>

                        <Button
                            onClick={handleSubmit}
                            disabled={!email || !emailConsent || isSubmitting}
                            className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    Joining Waitlist...
                                </>
                            ) : (
                                <>
                                    <Mail className="w-5 h-5 mr-2" />
                                    Join Waitlist
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="text-center">
                        <p className="text-xs text-white/60">
                            By joining the waitlist, you agree to receive updates about this service.
                            You can unsubscribe at any time.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}