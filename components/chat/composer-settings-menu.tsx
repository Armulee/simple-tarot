"use client"

import { useTranslations } from "next-intl"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CornerDownRight, Settings } from "lucide-react"
import type { HoroscopeBirthData } from "@/types/horoscope"
import type { CardUiText } from "@/components/chat/types"

const DUMMY_CARD_UI: CardUiText = {
    selected: () => "",
    consumeStar: "",
    shuffle: "",
    pick: "",
    cardCount: () => "",
    decreaseCardCount: "",
    increaseCardCount: "",
    swipe: "",
    drawCta: () => "",
    topUpCta: () => "",
    pickAllCta: () => "",
    pickAllPlaceholder: "",
}

export type ComposerSettingsMenuProps = {
    showAutoPick?: boolean
    autoPickOn?: boolean
    onToggleAutoPick?: () => void
    /** When true, draw also lives in this menu (composer shows follow-up pills); birth is always in the menu. */
    exposeBirthDrawInMenu?: boolean
    savedBirth: HoroscopeBirthData | null
    onBirthInfoClick: () => void
    showDrawTrigger?: boolean
    showInsufficientStars?: boolean
    cardsToSelect?: number
    cardUi?: CardUiText
    onScrollToDraw?: () => void
}

export function ComposerSettingsMenu({
    showAutoPick = false,
    autoPickOn = false,
    onToggleAutoPick = () => {},
    exposeBirthDrawInMenu = false,
    savedBirth,
    onBirthInfoClick,
    showDrawTrigger = false,
    showInsufficientStars = false,
    cardsToSelect = 0,
    cardUi = DUMMY_CARD_UI,
    onScrollToDraw = () => {},
}: ComposerSettingsMenuProps) {
    const tMode = useTranslations("InterpretationMode")
    const tAction = useTranslations("ActionTrigger")
    const hasBirthDate = Boolean(
        savedBirth?.day && savedBirth?.month && savedBirth?.year,
    )
    const showDrawInMenu =
        exposeBirthDrawInMenu && showDrawTrigger && !autoPickOn
    const showBirthInMenu = true

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type='button'
                    className='inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-colors hover:border-white/30 hover:text-white'
                    aria-label={tMode("composerSettingsAriaLabel")}
                >
                    <Settings className='size-4' />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align='start'
                side='top'
                className='min-w-[12rem] rounded-xl border-white/10 bg-[#0A0F26] p-2 text-white'
            >
                {showAutoPick ? (
                    <DropdownMenuCheckboxItem
                        checked={autoPickOn}
                        onCheckedChange={() => onToggleAutoPick()}
                        className='cursor-pointer rounded-lg text-sm focus:bg-white/10 focus:text-white'
                    >
                        <span className='flex flex-col gap-0.5 py-0.5'>
                            <span className='text-white/75'>
                                {tAction("autoPickLabel")}
                            </span>
                            <span
                                className={
                                    autoPickOn
                                        ? "font-medium text-green-400"
                                        : "font-medium text-white/80"
                                }
                            >
                                {autoPickOn
                                    ? tAction("autoPickOn")
                                    : tAction("autoPickOff")}
                            </span>
                        </span>
                    </DropdownMenuCheckboxItem>
                ) : null}
                {showAutoPick && (showBirthInMenu || showDrawInMenu) ? (
                    <DropdownMenuSeparator className='bg-white/10' />
                ) : null}
                {showBirthInMenu ? (
                    <DropdownMenuItem
                        onClick={() => onBirthInfoClick()}
                        className={`cursor-pointer gap-2 rounded-lg text-sm focus:bg-white/10 focus:text-white ${
                            hasBirthDate
                                ? "border border-primary/30 bg-primary/10"
                                : ""
                        }`}
                    >
                        <CornerDownRight className='size-4 shrink-0' />
                        {hasBirthDate
                            ? tAction("editBirthInfo")
                            : tAction("newBirthInfo")}
                    </DropdownMenuItem>
                ) : null}
                {showBirthInMenu && showDrawInMenu ? (
                    <DropdownMenuSeparator className='bg-white/10' />
                ) : null}
                {showDrawInMenu ? (
                    <DropdownMenuItem
                        onClick={() => onScrollToDraw()}
                        className='cursor-pointer gap-2 rounded-lg text-sm focus:bg-white/10 focus:text-white'
                    >
                        <CornerDownRight className='size-4 shrink-0' />
                        {showInsufficientStars
                            ? cardUi.topUpCta(cardsToSelect)
                            : cardUi.drawCta(cardsToSelect)}
                    </DropdownMenuItem>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
