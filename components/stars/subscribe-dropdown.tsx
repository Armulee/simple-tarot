"use client"

import { Checkout } from "../checkout"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"

export default function SubscribeDropdown() {
    const t = useTranslations("SubscribeDropdown")
    return (
        <Popover>
            <PopoverTrigger asChild>
                <div
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            e.stopPropagation()
                        }
                    }}
                    className='inline-flex items-center justify-center w-7 h-7 rounded-full bg-black/10 hover:bg-black/20 transition-colors duration-200 cursor-pointer'
                    role='button'
                    aria-label={t("aria")}
                    tabIndex={0}
                >
                    <ChevronDown className='w-4 h-4 text-black' />
                </div>
            </PopoverTrigger>
            <PopoverContent className='w-48 bg-card/95 border-border/30 p-2 space-y-1 backdrop-blur-xl'>
                <Checkout
                    mode='subscribe'
                    plan='monthly'
                    customTrigger={
                        <button className='w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-white/10 transition-colors duration-200'>
                            <div className='font-medium'>{t("monthly")}</div>
                            <div className='text-xs text-gray-400'>
                                {t("monthlyPrice")}
                            </div>
                        </button>
                    }
                />
                <Checkout
                    mode='subscribe'
                    plan='annual'
                    customTrigger={
                        <button className='w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-white/10 transition-colors duration-200'>
                            <div className='font-medium'>{t("annual")}</div>
                            <div className='text-xs text-gray-400'>
                                {t("annualPrice")}
                            </div>
                        </button>
                    }
                />
            </PopoverContent>
        </Popover>
    )
}
