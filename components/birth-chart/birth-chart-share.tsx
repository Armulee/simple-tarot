"use client"

import {
    FaFacebook,
    FaTwitter,
    FaWhatsapp,
    FaLink,
} from "react-icons/fa"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Share2 } from "lucide-react"

export default function BirthChartShare() {
    const [copied, setCopied] = useState(false)

    const getShareUrl = () => {
        if (typeof window !== "undefined") {
            return window.location.href
        }
        return ""
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(getShareUrl())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleShare = (platform: string) => {
        const url = encodeURIComponent(getShareUrl())
        const text = encodeURIComponent("Check out my Birth Chart!")
        
        let href = ""
        switch (platform) {
            case "facebook":
                href = `https://www.facebook.com/sharer/sharer.php?u=${url}`
                break
            case "twitter":
                href = `https://twitter.com/intent/tweet?url=${url}&text=${text}`
                break
            case "whatsapp":
                href = `https://api.whatsapp.com/send?text=${text}%20${url}`
                break
        }
        
        if (href) {
            window.open(href, "_blank", "noopener,noreferrer")
        }
    }

    return (
        <Card className="p-6 bg-card/10 backdrop-blur-sm border-border/20">
            <div className="flex items-center gap-2 mb-4">
                <Share2 className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-serif font-semibold text-white">Share Your Chart</h2>
            </div>
            
            <div className="flex flex-wrap gap-2">
                <Button 
                    variant="outline" 
                    className="bg-blue-600 hover:bg-blue-700 text-white border-none gap-2"
                    onClick={() => handleShare("facebook")}
                >
                    <FaFacebook /> Facebook
                </Button>
                <Button 
                    variant="outline" 
                    className="bg-sky-500 hover:bg-sky-600 text-white border-none gap-2"
                    onClick={() => handleShare("twitter")}
                >
                    <FaTwitter /> Twitter
                </Button>
                <Button 
                    variant="outline" 
                    className="bg-green-500 hover:bg-green-600 text-white border-none gap-2"
                    onClick={() => handleShare("whatsapp")}
                >
                    <FaWhatsapp /> WhatsApp
                </Button>
                <Button 
                    variant="outline" 
                    className="bg-secondary/20 hover:bg-secondary/30 text-white border-white/10 gap-2"
                    onClick={handleCopy}
                >
                    <FaLink /> {copied ? "Copied!" : "Copy Link"}
                </Button>
            </div>
        </Card>
    )
}
