"use client"

import { useTranslations } from "next-intl"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { ChevronRight, Settings } from "lucide-react"
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

const panelSurface =
    "rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"

const switchRowClass =
    "cursor-default gap-3 rounded-lg px-2.5 py-2.5 text-[13px] font-medium leading-snug text-white/95 outline-none transition-colors focus:bg-white/[0.08] focus:text-white data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white"

const switchTrackClass =
    "shrink-0 border-0 shadow-md data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-indigo-500 data-[state=checked]:to-cyan-500 data-[state=checked]:shadow-[0_0_16px_-4px_rgba(99,102,241,0.55)] data-[state=unchecked]:bg-white/15"

const actionRowClass =
    "cursor-pointer gap-2 rounded-lg px-2.5 py-2.5 text-[13px] font-medium leading-snug text-white/95 outline-none transition-colors focus:bg-white/[0.08] focus:text-white data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white"

export type ComposerSettingsMenuProps = {
    showAutoPick?: boolean
    autoPickOn?: boolean
    onToggleAutoPick?: () => void
    /** When true, show a toggle for composer follow-up suggestion chips (synced with the strip dismiss control). */
    showComposerSuggestionsToggle?: boolean
    composerSuggestionsEnabled?: boolean
    onComposerSuggestionsEnabledChange?: (enabled: boolean) => void
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
    showComposerSuggestionsToggle = false,
    composerSuggestionsEnabled = true,
    onComposerSuggestionsEnabledChange = () => {},
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
    const showPreferencesBlock =
        showAutoPick || showComposerSuggestionsToggle
    const showActionsBlock = showBirthInMenu || showDrawInMenu

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type='button'
                    className={cn(
                        "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
                        "border border-white/12 bg-gradient-to-br from-white/[0.1] to-white/[0.02]",
                        "text-white/85 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.55)]",
                        "transition-all duration-200 hover:border-white/22 hover:from-white/[0.14] hover:to-white/[0.05] hover:text-white hover:shadow-[0_4px_20px_-4px_rgba(99,102,241,0.25)]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07060f]",
                    )}
                    aria-label={tMode("composerSettingsAriaLabel")}
                >
                    <Settings className='size-4' strokeWidth={1.75} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align='start'
                side='top'
                sideOffset={10}
                className={cn(
                    "min-w-[18.5rem] overflow-hidden rounded-2xl p-0",
                    "border border-white/12",
                    "bg-gradient-to-b from-[#141a2f]/[0.97] via-[#0d1020]/[0.98] to-[#080b14]/[0.99]",
                    "text-white shadow-[0_28px_56px_-16px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.04)_inset]",
                    "backdrop-blur-2xl",
                )}
            >
                <DropdownMenuLabel className='border-b border-white/[0.07] bg-gradient-to-r from-indigo-500/[0.08] via-transparent to-cyan-500/[0.06] px-3.5 py-3 text-[15px] font-semibold tracking-tight text-white'>
                    {tMode("composerSettingsPanelTitle")}
                </DropdownMenuLabel>

                {showPreferencesBlock ? (
                    <>
                        <div className='px-3.5 pt-3 pb-1.5'>
                            <p className='text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40'>
                                {tMode("composerSettingsSectionPreferences")}
                            </p>
                        </div>
                        <div className='px-2 pb-2'>
                            <div className={panelSurface}>
                                <DropdownMenuGroup className='flex flex-col gap-px'>
                                    {showAutoPick ? (
                                        <DropdownMenuItem
                                            onSelect={(e) =>
                                                e.preventDefault()
                                            }
                                            className={switchRowClass}
                                        >
                                            <span className='min-w-0 flex-1 truncate pr-1'>
                                                {tAction("autoPickLabel")}
                                            </span>
                                            <Switch
                                                checked={autoPickOn}
                                                onCheckedChange={(
                                                    checked,
                                                ) => {
                                                    if (
                                                        checked !==
                                                        autoPickOn
                                                    )
                                                        onToggleAutoPick()
                                                }}
                                                className={switchTrackClass}
                                            />
                                        </DropdownMenuItem>
                                    ) : null}
                                    {showAutoPick &&
                                    showComposerSuggestionsToggle ? (
                                        <div
                                            className='mx-1.5 h-px bg-white/[0.08]'
                                            aria-hidden
                                        />
                                    ) : null}
                                    {showComposerSuggestionsToggle ? (
                                        <DropdownMenuItem
                                            onSelect={(e) =>
                                                e.preventDefault()
                                            }
                                            className={switchRowClass}
                                        >
                                            <span className='min-w-0 flex-1 truncate pr-1'>
                                                {tAction(
                                                    "composerSuggestionsLabel",
                                                )}
                                            </span>
                                            <Switch
                                                checked={
                                                    composerSuggestionsEnabled
                                                }
                                                onCheckedChange={
                                                    onComposerSuggestionsEnabledChange
                                                }
                                                className={switchTrackClass}
                                            />
                                        </DropdownMenuItem>
                                    ) : null}
                                </DropdownMenuGroup>
                            </div>
                        </div>
                    </>
                ) : null}

                {showPreferencesBlock && showActionsBlock ? (
                    <DropdownMenuSeparator className='my-0 bg-white/[0.07]' />
                ) : null}

                {showActionsBlock ? (
                    <>
                        <div className='px-3.5 pt-2.5 pb-1.5'>
                            <p className='text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40'>
                                {tMode("composerSettingsSectionActions")}
                            </p>
                        </div>
                        <div className='px-2 pb-2.5'>
                            <div className={panelSurface}>
                                <DropdownMenuGroup className='flex flex-col gap-px'>
                                    {showBirthInMenu ? (
                                        <DropdownMenuItem
                                            onSelect={() =>
                                                onBirthInfoClick()
                                            }
                                            className={cn(
                                                actionRowClass,
                                                hasBirthDate &&
                                                    "bg-emerald-500/[0.08] ring-1 ring-emerald-400/20 focus:bg-emerald-500/15 data-[highlighted]:bg-emerald-500/15",
                                            )}
                                        >
                                            <span className='min-w-0 flex-1 truncate'>
                                                {hasBirthDate
                                                    ? tAction("editBirthInfo")
                                                    : tAction("newBirthInfo")}
                                            </span>
                                            <ChevronRight
                                                className='size-4 shrink-0 text-white/35'
                                                strokeWidth={2}
                                                aria-hidden
                                            />
                                        </DropdownMenuItem>
                                    ) : null}
                                    {showBirthInMenu && showDrawInMenu ? (
                                        <div
                                            className='mx-1.5 h-px bg-white/[0.08]'
                                            aria-hidden
                                        />
                                    ) : null}
                                    {showDrawInMenu ? (
                                        <DropdownMenuItem
                                            onSelect={() => onScrollToDraw()}
                                            className={actionRowClass}
                                        >
                                            <span className='min-w-0 flex-1 truncate text-left'>
                                                {showInsufficientStars
                                                    ? cardUi.topUpCta(
                                                          cardsToSelect,
                                                      )
                                                    : cardUi.drawCta(
                                                          cardsToSelect,
                                                      )}
                                            </span>
                                            <ChevronRight
                                                className='size-4 shrink-0 text-white/35'
                                                strokeWidth={2}
                                                aria-hidden
                                            />
                                        </DropdownMenuItem>
                                    ) : null}
                                </DropdownMenuGroup>
                            </div>
                        </div>
                    </>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
