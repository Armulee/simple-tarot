"use client"

import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StarsDialog } from "@/components/star-consent"
import { cn } from "@/lib/utils"

type PlanSummary = {
    name: string
    price: string
    stars: number
}

type PlanChangeDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
    confirmDisabled?: boolean
    action: "upgrade" | "downgrade"
    title: string
    description?: string
    summaryTitle: string
    starsTitle: string
    currentPlanLabel: string
    targetPlanLabel: string
    differenceLabel: string
    refillLabel: string
    currentStarsLabel: string
    projectedStarsLabel: string
    currentPlan: PlanSummary
    targetPlan: PlanSummary
    differenceValue: string
    refillDateValue: string
    currentStarsValue: string
    projectedStarsValue: string
    confirmLabel: string
    cancelLabel: string
}

export function PlanChangeDialog({
    open,
    onOpenChange,
    onConfirm,
    confirmDisabled,
    action,
    title,
    description,
    summaryTitle,
    starsTitle,
    currentPlanLabel,
    targetPlanLabel,
    differenceLabel,
    refillLabel,
    currentStarsLabel,
    projectedStarsLabel,
    currentPlan,
    targetPlan,
    differenceValue,
    refillDateValue,
    currentStarsValue,
    projectedStarsValue,
    confirmLabel,
    cancelLabel,
}: PlanChangeDialogProps) {
    const isDowngrade = action === "downgrade"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <StarsDialog className='relative overflow-hidden'>
                <DialogHeader>
                    <DialogTitle className='text-yellow-300 font-serif text-xl'>
                        {title}
                    </DialogTitle>
                    {description ? (
                        <DialogDescription className='text-white/85'>
                            {description}
                        </DialogDescription>
                    ) : null}
                </DialogHeader>

                <div className='mt-4 space-y-4'>
                    <div className='rounded-2xl border border-yellow-400/20 bg-black/40 p-4'>
                        <div className='text-[10px] uppercase tracking-widest text-yellow-200/70'>
                            {summaryTitle}
                        </div>
                        <div className='mt-3 space-y-3 text-sm'>
                            <SummaryRow
                                label={currentPlanLabel}
                                value={currentPlan.name}
                                secondary={currentPlan.price}
                            />
                            <SummaryRow
                                label={targetPlanLabel}
                                value={targetPlan.name}
                                secondary={targetPlan.price}
                            />
                            <SummaryRow
                                label={differenceLabel}
                                value={differenceValue}
                                highlight={!isDowngrade}
                            />
                            <SummaryRow
                                label={refillLabel}
                                value={refillDateValue}
                            />
                        </div>
                    </div>

                    <div className='rounded-2xl border border-yellow-400/10 bg-black/30 p-4'>
                        <div className='text-[10px] uppercase tracking-widest text-yellow-200/70'>
                            {starsTitle}
                        </div>
                        <div className='mt-3 grid grid-cols-2 gap-3'>
                            <StarsStat
                                label={currentStarsLabel}
                                value={currentStarsValue}
                            />
                            <StarsStat
                                label={projectedStarsLabel}
                                value={projectedStarsValue}
                                accent
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className='mt-6 flex flex-row justify-end gap-3'>
                    <button
                        type='button'
                        onClick={() => onOpenChange(false)}
                        className='px-3 py-2 rounded-md border border-white/20 text-white hover:bg-white/10'
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type='button'
                        onClick={onConfirm}
                        disabled={confirmDisabled}
                        className={cn(
                            "px-3 py-2 rounded-md border shadow-[0_12px_30px_-10px_rgba(234,179,8,0.45)]",
                            isDowngrade
                                ? "border-red-500/30 bg-red-600/80 text-white hover:bg-red-600"
                                : "border-yellow-500/40 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-300 hover:to-yellow-500",
                            confirmDisabled ? "opacity-60 cursor-not-allowed" : ""
                        )}
                    >
                        {confirmLabel}
                    </button>
                </DialogFooter>
            </StarsDialog>
        </Dialog>
    )
}

function SummaryRow({
    label,
    value,
    secondary,
    highlight,
}: {
    label: string
    value: string
    secondary?: string
    highlight?: boolean
}) {
    return (
        <div className='flex items-center justify-between gap-4'>
            <div className='text-white/70 text-xs uppercase tracking-widest'>
                {label}
            </div>
            <div className='text-right'>
                <div
                    className={cn(
                        "text-sm font-semibold",
                        highlight ? "text-yellow-300" : "text-white"
                    )}
                >
                    {value}
                </div>
                {secondary ? (
                    <div className='text-[11px] text-white/60'>
                        {secondary}
                    </div>
                ) : null}
            </div>
        </div>
    )
}

function StarsStat({
    label,
    value,
    accent,
}: {
    label: string
    value: string
    accent?: boolean
}) {
    return (
        <div
            className={cn(
                "rounded-xl border border-white/10 bg-black/30 px-3 py-3",
                accent ? "border-yellow-400/30" : ""
            )}
        >
            <div className='text-[10px] uppercase tracking-widest text-white/60'>
                {label}
            </div>
            <div
                className={cn(
                    "mt-2 text-lg font-bold",
                    accent ? "text-yellow-300" : "text-white"
                )}
            >
                {value}
            </div>
        </div>
    )
}
