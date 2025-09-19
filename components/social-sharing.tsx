"use client"

import { useStars } from "@/contexts/stars-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Share2, Facebook, Twitter, Instagram, MessageCircle, Star } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface SocialSharingProps {
    shareUrl?: string
    shareText?: string
    className?: string
}

export function SocialSharing({ 
    shareUrl = window.location.href, 
    shareText = "Check out my tarot reading from Asking Fate!",
    className = ""
}: SocialSharingProps) {
    const { shareOnSocial } = useStars()
    const [isSharing, setIsSharing] = useState<string | null>(null)

    const handleShare = async (platform: string) => {
        setIsSharing(platform)
        try {
            const result = await shareOnSocial(platform, shareUrl)
            if (result.success) {
                toast.success(result.message)
            } else {
                toast.error(result.message)
            }
        } finally {
            setIsSharing(null)
        }
    }

    const shareButtons = [
        {
            platform: "facebook",
            label: "Facebook",
            icon: Facebook,
            color: "bg-blue-500 hover:bg-blue-600",
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        },
        {
            platform: "twitter",
            label: "Twitter",
            icon: Twitter,
            color: "bg-sky-500 hover:bg-sky-600",
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
        },
        {
            platform: "instagram",
            label: "Instagram",
            icon: Instagram,
            color: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600",
            url: `https://www.instagram.com/`
        },
        {
            platform: "whatsapp",
            label: "WhatsApp",
            icon: MessageCircle,
            color: "bg-green-500 hover:bg-green-600",
            url: `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`
        }
    ]

    return (
        <Card className={`bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 ${className}`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-400">
                    <Share2 className="w-5 h-5" />
                    Share & Earn Stars
                </CardTitle>
                <CardDescription>
                    Share your reading on social media and earn 2 stars for each share!
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Share Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        {shareButtons.map(({ platform, label, icon: Icon, color, url }) => (
                            <Button
                                key={platform}
                                variant="outline"
                                onClick={() => {
                                    if (platform === "instagram") {
                                        // Instagram doesn't support direct URL sharing, so we'll just record the share
                                        handleShare(platform)
                                    } else {
                                        // Open share URL in new tab and record the share
                                        window.open(url, '_blank', 'width=600,height=400')
                                        handleShare(platform)
                                    }
                                }}
                                disabled={isSharing === platform}
                                className={`${color} text-white border-0 hover:opacity-90`}
                            >
                                <Icon className="w-4 h-4 mr-2" />
                                {isSharing === platform ? "Sharing..." : label}
                            </Button>
                        ))}
                    </div>

                    {/* Share Benefits */}
                    <div className="bg-indigo-500/5 rounded-lg p-3 border border-indigo-500/20">
                        <div className="flex items-center gap-2 text-sm text-indigo-300">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span>Earn 2 stars for each social media share</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}