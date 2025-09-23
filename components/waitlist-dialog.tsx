"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"

export function WaitlistDialog({
    open,
    onOpenChange,
    serviceLabel,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    serviceLabel: string
}) {
    const { user, loading } = useAuth()
    const [consent, setConsent] = useState(false)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle className='text-white'>
                        {serviceLabel} — Coming Soon
                    </DialogTitle>
                    <DialogDescription>
                        {loading
                            ? "Checking your account..."
                            : user
                            ? "This feature is in development. Opt-in below to be notified when it launches."
                            : "Please sign in to join the waitlist and get notified when this feature is available."}
                    </DialogDescription>
                </DialogHeader>

                {user ? (
                    <div className='space-y-4'>
                        <div className='flex items-start gap-3'>
                            <Checkbox
                                id='consent'
                                checked={consent}
                                onCheckedChange={(v: boolean | "indeterminate") => setConsent(v === true)}
                            />
                            <label
                                htmlFor='consent'
                                className='text-sm text-white/80'
                            >
                                Email me when {serviceLabel} is ready and share occasional updates.
                            </label>
                        </div>
                        <p className='text-xs text-white/60'>
                            You can unsubscribe anytime. We respect your privacy.
                        </p>
                    </div>
                ) : null}

                <DialogFooter className='gap-2 sm:justify-between'>
                    <Button
                        type='button'
                        variant='ghost'
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                    {loading ? null : user ? (
                        <Button
                            type='button'
                            onClick={() => onOpenChange(false)}
                            disabled={!consent}
                        >
                            Join Waitlist
                        </Button>
                    ) : (
                        <Button asChild>
                            <Link href='/signin'>Sign In</Link>
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

