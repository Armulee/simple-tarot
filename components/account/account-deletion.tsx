"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export function AccountDeletion() {
    const t = useTranslations("Account.accountDeletion")
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDeleteAccount = async () => {
        setIsDeleting(true)

        try {
            // TODO: Implement account deletion API call
            // This would typically involve calling your backend API
            // to delete the user account and all associated data
            console.log("Deleting account...")

            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 2000))

            toast.success(t("accountDeleted"), {
                description: t("accountDeleted"),
            })

            // Sign out the user
            await supabase.auth.signOut()
        } catch (error) {
            console.error("Failed to delete account:", error)
            toast.error(t("deletionFailed"), {
                description: t("deletionFailed"),
            })
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Card className='w-full bg-red-500/10 backdrop-blur-sm border border-red-500/30 p-6 shadow-xl shadow-red-500/20 hover:bg-red-500/15 transition-all duration-300'>
            <div className='space-y-6'>
                <div className='flex items-center space-x-3'>
                    <div className='p-2 rounded-lg bg-red-500/30'>
                        <AlertTriangle className='w-5 h-5 text-red-400' />
                    </div>
                    <h2 className='text-2xl font-bold text-white'>
                        {t("title")}
                    </h2>
                </div>

                <div className='space-y-4'>
                    <div>
                        <h3 className='text-lg font-semibold text-white mb-2'>
                            {t("deleteAccount")}
                        </h3>
                        <p className='text-red-100 text-sm leading-relaxed'>
                            {t("warning")}
                        </p>
                    </div>
                </div>

                <div className='flex justify-start pt-2'>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant='destructive'
                                size='sm'
                                className='bg-red-600 hover:bg-red-700 text-white'
                            >
                                <Trash2 className='w-4 h-4 mr-2' />
                                {t("deleteAccount")}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className='bg-background/95 backdrop-blur-sm border border-border/50'>
                            <AlertDialogHeader>
                                <AlertDialogTitle className='text-white font-semibold'>
                                    {t("confirmDeletion")}
                                </AlertDialogTitle>
                                <AlertDialogDescription className='text-muted-foreground'>
                                    {t("warning")}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className='border-border/40 text-muted-foreground hover:bg-background/20'>
                                    {t("cancel")}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting}
                                    className='bg-red-600 hover:bg-red-700 text-white'
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className='w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent' />
                                            {t("deleting")}
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className='w-4 h-4 mr-2' />
                                            {t("deleteAccount")}
                                        </>
                                    )}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </Card>
    )
}
