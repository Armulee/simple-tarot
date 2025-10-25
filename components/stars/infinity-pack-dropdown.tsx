"use client"

import { Checkout } from "../checkout"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"

interface InfinityPackDropdownProps {
    packId: string
}

export default function InfinityPackDropdown({
    packId,
}: InfinityPackDropdownProps) {
    const t = useTranslations("InfinityPackDropdown")
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
                    className='absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200 cursor-pointer'
                    role='button'
                    aria-label={t("aria")}
                    tabIndex={0}
                >
                    <ChevronDown className='w-3 h-3 text-yellow-300' />
                </div>
            </PopoverTrigger>
            <PopoverContent className='w-48 bg-card/95 border-border/30 p-2 space-y-1 backdrop-blur-xl'>
                <Checkout
                    mode='pack'
                    packId={packId}
                    infinityTerm='month'
                    customTrigger={
                        <button className='w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-white/10 transition-colors duration-200'>
                            <div className='font-medium'>
                                {t("monthlyPass")}
                            </div>
                            <div className='text-xs text-gray-400'>
                                {t("monthlyPrice")}
                            </div>
                        </button>
                    }
                />
            </PopoverContent>
        </Popover>
    )
}
