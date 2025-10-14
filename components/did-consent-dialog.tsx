"use client"

import { useState } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Shield, Cookie, Eye } from "lucide-react"

interface DIDConsentDialogProps {
    open: boolean
    onAccept: () => void
}

export default function DIDConsentDialog({ open, onAccept }: DIDConsentDialogProps) {
    const [isAccepting, setIsAccepting] = useState(false)

    const handleAccept = async () => {
        setIsAccepting(true)
        try {
            // Generate a new DID by calling the API
            await fetch("/api/did", { method: "POST" })
            onAccept()
        } catch (error) {
            console.error("Failed to generate DID:", error)
            // Still call onAccept to proceed
            onAccept()
        } finally {
            setIsAccepting(false)
        }
    }

    return (
        <Sheet open={open}>
            <SheetContent 
                side="bottom" 
                className="h-auto max-h-[80vh] overflow-y-auto"
                // Hide the close button by targeting the first button child
                style={{ 
                    ['--close-button-display' as any]: 'none' 
                }}
            >
                <div className="flex flex-col items-center text-center space-y-6 py-8">
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>

                    {/* Header */}
                    <SheetHeader className="space-y-4">
                        <SheetTitle className="text-2xl font-bold">
                            Device Identification Required
                        </SheetTitle>
                        <SheetDescription className="text-base leading-relaxed max-w-md">
                            To provide you with the best experience and ensure proper functionality, 
                            we need to create a unique device identifier for your browser.
                        </SheetDescription>
                    </SheetHeader>

                    {/* Content */}
                    <div className="space-y-6 max-w-lg">
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <Cookie className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <div className="text-left">
                                    <h4 className="font-semibold text-sm">What we collect:</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        A unique device identifier (DID) stored locally in your browser to track your tarot readings and prevent duplicate star awards.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <Eye className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <div className="text-left">
                                    <h4 className="font-semibold text-sm">How we use it:</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        To identify you as the owner of your tarot readings and ensure you don&apos;t earn stars from viewing your own shared links.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-muted/50 rounded-lg p-4">
                            <p className="text-sm text-muted-foreground">
                                <strong>Note:</strong> This identifier is stored locally in your browser and is not shared with third parties. 
                                You can clear it anytime by clearing your browser&apos;s local storage.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <SheetFooter className="w-full">
                        <Button 
                            onClick={handleAccept}
                            disabled={isAccepting}
                            className="w-full sm:w-auto min-w-[200px]"
                            size="lg"
                        >
                            {isAccepting ? "Setting up..." : "Accept & Continue"}
                        </Button>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    )
}