"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useTranslations } from "next-intl"
import {
    ensureSupportedCurrency,
    getCurrencySymbol,
    POPULAR_CURRENCIES,
    SUPPORTED_PAYMENT_CURRENCIES,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"
import { usePreferredCurrency } from "@/hooks/use-preferred-currency"

type CurrencySelectorProps = {
    locale: string
    defaultCurrency: CurrencyCode
    onCurrencyChange: (currency: CurrencyCode) => void
}

export default function CurrencySelector({
    locale,
    defaultCurrency,
    onCurrencyChange,
}: CurrencySelectorProps) {
    const t = useTranslations("Pricing")
    const preferredCurrency = usePreferredCurrency(defaultCurrency)
    const [currency, setCurrency] = useState<CurrencyCode>(
        ensureSupportedCurrency(preferredCurrency)
    )
    const [isManualCurrency, setIsManualCurrency] = useState(false)
    const [currencyQuery, setCurrencyQuery] = useState("")

    useEffect(() => {
        if (!isManualCurrency) {
            const newCurrency = ensureSupportedCurrency(preferredCurrency)
            setCurrency(newCurrency)
            onCurrencyChange(newCurrency)
        }
    }, [preferredCurrency, isManualCurrency, onCurrencyChange])

    const currencyFormatter = useMemo(() => {
        if (typeof Intl.DisplayNames === "undefined") return null
        try {
            return new Intl.DisplayNames([locale], { type: "currency" })
        } catch {
            return null
        }
    }, [locale])

    const getCurrencyLabel = (code: CurrencyCode) =>
        currencyFormatter?.of(code) ?? code

    const currencyOptions = useMemo(() => {
        const ordered = [
            currency,
            ...SUPPORTED_PAYMENT_CURRENCIES,
            ...POPULAR_CURRENCIES,
            "THB",
        ] as CurrencyCode[]
        const deduped = [] as CurrencyCode[]
        const seen = new Set<CurrencyCode>()
        for (const code of ordered) {
            if (!code) continue
            if (seen.has(code)) continue
            seen.add(code)
            deduped.push(code)
        }
        return deduped
    }, [currency])

    const normalizedCurrencyQuery = currencyQuery.trim().toLowerCase()

    const filteredCurrencyOptions = useMemo(() => {
        if (!normalizedCurrencyQuery) {
            return currencyOptions
        }
        return currencyOptions.filter((code) => {
            const symbol = getCurrencySymbol(code).toLowerCase()
            const name = (currencyFormatter?.of(code) ?? code).toLowerCase()
            const normalizedCode = code.toLowerCase()
            return (
                normalizedCode.includes(normalizedCurrencyQuery) ||
                name.includes(normalizedCurrencyQuery) ||
                symbol.includes(normalizedCurrencyQuery)
            )
        })
    }, [currencyOptions, normalizedCurrencyQuery, currencyFormatter])

    const handleCurrencyChange = (value: string) => {
        setIsManualCurrency(true)
        const newCurrency = ensureSupportedCurrency(value)
        setCurrency(newCurrency)
        onCurrencyChange(newCurrency)
    }

    return (
        <div className='flex items-center justify-center pt-4'>
            <span className='text-sm text-white/70 px-4 py-2 bg-white/30 border-border/30 rounded-l-md'>
                {t("currency")}:
            </span>
            <Select
                value={currency}
                onValueChange={handleCurrencyChange}
                onOpenChange={(open) => {
                    if (!open) {
                        setCurrencyQuery("")
                    }
                }}
            >
                <SelectTrigger className='w-[190px] bg-accent/30 border-border/30 rounded-r-md rounded-l-none'>
                    <SelectValue
                        placeholder={`${getCurrencySymbol(currency)} · ${currency}`}
                    />
                </SelectTrigger>
                <SelectContent className='bg-black border-border/30 p-0'>
                    <div className='sticky top-0 z-10 bg-black/95 border-b border-border/30 p-2'>
                        <Input
                            value={currencyQuery}
                            autoFocus
                            onChange={(event) =>
                                setCurrencyQuery(event.target.value)
                            }
                            placeholder={t("currencySearchPlaceholder")}
                            className='h-9 bg-background/40 border-border/40 text-sm placeholder:text-white/50'
                        />
                    </div>
                    <div className='max-h-60 overflow-y-auto'>
                        {filteredCurrencyOptions.length === 0 ? (
                            <div className='px-4 py-6 text-center text-sm text-white/60'>
                                {t("currencyNoResults")}
                            </div>
                        ) : (
                            filteredCurrencyOptions.map((code) => (
                                <SelectItem key={code} value={code}>
                                    <div className='flex flex-col'>
                                        <span className='font-semibold text-white'>
                                            {getCurrencySymbol(code)} · {code}
                                        </span>
                                        <span className='text-xs text-white/60'>
                                            {getCurrencyLabel(code)}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))
                        )}
                    </div>
                </SelectContent>
            </Select>
        </div>
    )
}

