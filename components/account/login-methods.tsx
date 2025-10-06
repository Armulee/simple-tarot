"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
    Shield, 
    Mail
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export function LoginMethods() {
    const { user } = useAuth()

    const getCurrentProvider = () => {
        if (!user) return null
        return user.app_metadata?.provider || 'email'
    }

    return (
        <Card className="p-6 space-y-6">
            <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                    <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-foreground">
                        Login Methods
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Manage how you sign in to your account
                    </p>
                </div>
            </div>

            {/* Current Login Method */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Current Login Method</h4>
                <div className="flex items-center space-x-3 p-4 rounded-lg bg-accent/30 border-2 border-accent/60 shadow-lg">
                    <div className="p-2 rounded-lg bg-accent/40">
                        <Mail className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div className="flex-1">
                        <span className="text-sm font-semibold text-foreground">
                            {user?.email || 'No email found'}
                        </span>
                        <p className="text-xs text-muted-foreground">
                            Your current login method
                        </p>
                    </div>
                    <Badge variant="secondary" className="bg-accent/50 text-accent-foreground border-accent/60 font-medium">
                        {getCurrentProvider() === 'email' ? 'Email & Password' : getCurrentProvider()}
                    </Badge>
                </div>
            </div>

            {/* Available Login Methods */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Available Login Methods</h4>
                <div className="p-4 rounded-lg bg-muted/30 border border-muted text-center">
                    <p className="text-sm text-muted-foreground">
                        Currently, only email and password login is available. 
                        Social login methods will be added in future updates.
                    </p>
                </div>
            </div>

            {/* Info */}
            <div className="p-4 rounded-lg bg-muted/50 border border-muted">
                <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> Currently, only email and password login is available. 
                    Social login methods will be added in future updates. You can manage your 
                    password settings in the Password Settings section below.
                </p>
            </div>
        </Card>
    )
}