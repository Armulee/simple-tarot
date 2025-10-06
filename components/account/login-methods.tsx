"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
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
        <Card className='bg-background/20 backdrop-blur-sm border border-border/30 hover:bg-background/30 transition-all duration-300'>
            <div className='p-6 space-y-6'>
                <div className='flex items-center space-x-3'>
                    <div className='p-2 rounded-lg bg-primary/20'>
                        <Shield className='w-5 h-5 text-primary' />
                    </div>
                    <h2 className='text-2xl font-bold text-white'>Login Methods</h2>
                </div>

                <div className='space-y-4'>
                    <div>
                        <Label className='text-white font-medium'>
                            Current Login Method
                        </Label>
                        <div className='flex items-center space-x-2 mt-1'>
                            <div className='flex items-center space-x-3 p-3 rounded-lg bg-accent/20 border border-accent/40 flex-1'>
                                <Mail className='w-5 h-5 text-accent' />
                                <span className='text-sm font-medium text-white'>
                                    {user?.email || 'No email found'}
                                </span>
                            </div>
                            <Badge
                                variant='outline'
                                className='bg-accent/30 text-accent-foreground border-accent/50'
                            >
                                {getCurrentProvider() === 'email' ? 'Email & Password' : getCurrentProvider()}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className='space-y-4'>
                    <div>
                        <Label className='text-white font-medium'>
                            Available Login Methods
                        </Label>
                        <div className='p-4 rounded-lg bg-background/30 border border-border/50 text-center mt-1'>
                            <p className='text-sm text-muted-foreground'>
                                Currently, only email and password login is available. 
                                Social login methods will be added in future updates.
                            </p>
                        </div>
                    </div>
                </div>

                <div className='p-4 rounded-lg bg-background/30 border border-border/50'>
                    <p className='text-xs text-muted-foreground'>
                        <strong>Note:</strong> Currently, only email and password login is available. 
                        Social login methods will be added in future updates. You can manage your 
                        password settings in the Password Settings section below.
                    </p>
                </div>
            </div>
        </Card>
    )
}