import { ChevronDown, Sparkles } from "lucide-react"
import { Button } from "../ui/button"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "../ui/sheet"
import mysticalServices from "./mystical-services"
import Link from "next/link"

export default function MysticalServicesSheet({
    mysticalOpen,
    setMysticalOpen,
}: {
    mysticalOpen: boolean
    setMysticalOpen: (open: boolean) => void
}) {
    return (
        <Sheet open={mysticalOpen} onOpenChange={setMysticalOpen}>
            <SheetTrigger asChild>
                <Button
                    variant='ghost'
                    className='inline-flex items-center space-x-2 text-white hover:bg-white/10 px-4 py-2 rounded-md transition-colors !mr-0'
                >
                    <Sparkles className='h-4 w-4' />
                    <span>Tarot</span>
                    <ChevronDown className='h-4 w-4' />
                </Button>
            </SheetTrigger>
            <SheetContent
                side='right'
                className='w-80 bg-card/95 backdrop-blur-md border-border/30'
            >
                <SheetHeader>
                    <SheetTitle className='flex items-center space-x-2 text-white'>
                        <Sparkles className='h-5 w-5' />
                        <span>Services</span>
                    </SheetTitle>
                </SheetHeader>
                <div className='mt-8 space-y-2'>
                    {mysticalServices.map(
                        ({ href, label, Icon, available }) => (
                            <div key={label}>
                                {available ? (
                                    <Link
                                        href={href}
                                        className='flex items-center space-x-3 px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors group'
                                        onClick={() => setMysticalOpen(false)}
                                    >
                                        <Icon className='h-5 w-5 text-primary' />
                                        <span className='font-medium text-primary'>
                                            {label}
                                        </span>
                                    </Link>
                                ) : (
                                    <div className='flex items-center space-x-3 px-4 py-3 rounded-lg text-white/50 cursor-not-allowed opacity-60'>
                                        <Icon className='h-5 w-5' />
                                        <span className='font-medium'>
                                            {label}
                                        </span>
                                        <span className='ml-auto text-xs bg-white/10 px-2 py-1 rounded-full'>
                                            Coming Soon
                                        </span>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
