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
import { useTranslations } from "next-intl"
import { usePathname } from "@/i18n/navigation"

export default function MysticalServicesSheet({
    mysticalOpen,
    setMysticalOpen,
}: {
    mysticalOpen: boolean
    setMysticalOpen: (open: boolean) => void
}) {
    const pathname = usePathname()
    const t = useTranslations("Sidebar")
    const s = useTranslations("Services")
    return (
        <Sheet open={mysticalOpen} onOpenChange={setMysticalOpen}>
            <SheetTrigger asChild>
                <Button
                    variant='ghost'
                    size='sm'
                    className='inline-flex items-center space-x-1 text-white hover:bg-white/10 hover:bg-transparent'
                >
                    <Sparkles className='h-4 w-4' />
                    <span>{s("tarot")}</span>
                    <ChevronDown className='h-4 w-4' />
                </Button>
            </SheetTrigger>
            <SheetContent
                side='right'
                className='w-80 bg-card/95 backdrop-blur-md border-border/30 p-0'
            >
                <div className='px-4 py-4 border-b border-white/10'>
                    <SheetHeader>
                        <SheetTitle className='flex items-center space-x-2 text-white'>
                            <Sparkles className='h-5 w-5' />
                            <span>{t("services")}</span>
                        </SheetTitle>
                    </SheetHeader>
                </div>
                <div className='px-4 mt-8 space-y-2'>
                    {mysticalServices.map(
                        ({ href, label, Icon, available, id }) => {
                            const itemPath = id === "tarot" ? "/" : href
                            const isActive = pathname === itemPath
                            return (
                                <div key={label}>
                                    {available ? (
                                        <Link
                                            href={itemPath}
                                            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors group ${
                                                isActive
                                                    ? "bg-accent text-white"
                                                    : "text-white hover:bg-white/10"
                                            }`}
                                            onClick={() =>
                                                setMysticalOpen(false)
                                            }
                                        >
                                            <Icon
                                                className={`h-5 w-5 ${isActive ? "text-white" : "text-primary"}`}
                                            />
                                            <span
                                                className={`font-medium ${isActive ? "text-white" : "text-primary"}`}
                                            >
                                                {s(id)}
                                            </span>
                                        </Link>
                                    ) : (
                                        <div className='flex items-center space-x-3 px-4 py-3 rounded-lg text-white/50 cursor-not-allowed opacity-60'>
                                            <Icon className='h-5 w-5' />
                                            <span className='font-medium'>
                                                {s(id)}
                                            </span>
                                            <span className='ml-auto text-xs bg-white/10 px-2 py-1 rounded-full'>
                                                {t("comingSoon")}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )
                        }
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
