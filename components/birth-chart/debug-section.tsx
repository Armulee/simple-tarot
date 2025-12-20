"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ChevronDown, ChevronUp, Bug } from "lucide-react"

interface BirthChartDebugSectionProps {
    data: unknown
}

export default function BirthChartDebugSection({
    data,
}: BirthChartDebugSectionProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <Card className='mt-8 p-4 bg-card/10 backdrop-blur-sm border-border/20'>
            <Button
                variant='ghost'
                onClick={() => setIsOpen(!isOpen)}
                className='w-full flex items-center justify-between text-white hover:text-white/80 hover:bg-white/5'
            >
                <div className='flex items-center gap-2'>
                    <Bug className='w-4 h-4' />
                    <span>Debug Data</span>
                </div>
                {isOpen ? (
                    <ChevronUp className='w-4 h-4' />
                ) : (
                    <ChevronDown className='w-4 h-4' />
                )}
            </Button>

            {isOpen && (
                <div className='mt-4 overflow-x-auto'>
                    <pre className='text-xs text-white/70 font-mono whitespace-pre-wrap break-all bg-black/30 p-4 rounded-lg'>
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            )}
        </Card>
    )
}
