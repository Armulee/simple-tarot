 "use client"
 
 import { useCallback, useEffect, useMemo, useRef, useState } from "react"
 import { useRouter } from "next/navigation"
 import { usePathname } from "@/i18n/navigation"
 import { useStars } from "@/contexts/stars-context"
 import AutoHeightTextarea from "@/components/ui/auto-height-textarea"
 import { Button } from "@/components/ui/button"
 import { LinearCardSpread } from "@/components/tarot/card-selection/linear-card-spread"
 import { CardImage } from "@/components/card-image"
 import {
     Dialog,
     DialogContent,
     DialogHeader,
     DialogTitle,
 } from "@/components/ui/dialog"
 import type { AgentAction, AgentContext, AgentMessage, AgentResponse } from "@/types/agent"
 import type { TarotCard } from "@/contexts/tarot-context"
 
 type ChatMessage = {
     id: string
     role: "user" | "assistant"
     text: string
     cards?: TarotCard[]
     isLoading?: boolean
 }
 
 type AgentChatProps = {
     initialMessages?: ChatMessage[]
 }
 
 const RETURNING_USER_KEY = "agent-returning-v1"
 
 export default function AgentChat({ initialMessages }: AgentChatProps) {
     const router = useRouter()
     const pathname = usePathname() || "/"
     const { isInfinity } = useStars()
 
     const [messages, setMessages] = useState<ChatMessage[]>(
         initialMessages && initialMessages.length > 0 ? initialMessages : []
     )
     const [input, setInput] = useState("")
     const [isLoading, setIsLoading] = useState(false)
     const [readingType, setReadingType] = useState<
         "love" | "career" | "future" | null
     >(null)
     const [readingFlow, setReadingFlow] = useState(false)
     const [cardsToSelect, setCardsToSelect] = useState(0)
     const [selectedCount, setSelectedCount] = useState(0)
     const [shuffleFn, setShuffleFn] = useState<(() => void) | null>(null)
     const [pickFn, setPickFn] = useState<(() => void) | null>(null)
     const [activeModalId, setActiveModalId] = useState<string | null>(null)
     const lastActionRef = useRef<string | null>(null)
     const lastActionAtRef = useRef<number>(0)
     const messagesEndRef = useRef<HTMLDivElement | null>(null)
 
     const userState = useMemo<AgentContext["user_state"]>(() => {
         if (typeof window === "undefined") return "returning_user"
         try {
             const seen = window.localStorage.getItem(RETURNING_USER_KEY)
             return seen ? "returning_user" : "first_time_user"
         } catch {
             return "returning_user"
         }
     }, [])
 
     useEffect(() => {
         if (typeof window === "undefined") return
         try {
             window.localStorage.setItem(RETURNING_USER_KEY, "1")
         } catch {
             // ignore
         }
     }, [])
 
     useEffect(() => {
         if (!messagesEndRef.current) return
         messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
     }, [messages, cardsToSelect])
 
     const context = useMemo<AgentContext>(
         () => ({
             current_page: pathname,
             user_state: userState,
             has_paid: Boolean(isInfinity),
         }),
         [pathname, userState, isInfinity]
     )
 
     const appendMessage = useCallback((message: ChatMessage) => {
         setMessages((prev) => [...prev, message])
     }, [])
 
     const executeAction = useCallback(
         (action: AgentAction) => {
             const signature = JSON.stringify(action)
             const now = Date.now()
             if (
                 lastActionRef.current === signature &&
                 now - lastActionAtRef.current < 1500
             ) {
                 return
             }
             lastActionRef.current = signature
             lastActionAtRef.current = now
 
             if (action.type === "NAVIGATE") {
                 router.push(action.payload.page)
                 return
             }
 
             if (action.type === "START_READING") {
                 setReadingFlow(true)
                 setReadingType(action.payload.type)
                 return
             }
 
             if (action.type === "DRAW_TAROT_CARD") {
                 if (!readingFlow) {
                     appendMessage({
                         id: `assistant-${Date.now()}`,
                         role: "assistant",
                         text: "Let’s start a reading first. Tell me what you want to explore, and I’ll guide you.",
                     })
                     return
                 }
                 setCardsToSelect(action.payload.count)
                 setSelectedCount(0)
                 return
             }
 
             if (action.type === "OPEN_MODAL") {
                 setActiveModalId(action.payload.modalId)
             }
         },
         [appendMessage, readingFlow, router]
     )
 
    const sendToAgent = useCallback(
        async (
            content: string,
            extra?: unknown,
            historyOverride?: ChatMessage[]
        ) => {
             setIsLoading(true)
             try {
                const sourceMessages = historyOverride ?? messages
                const baseMessages: AgentMessage[] = sourceMessages.map((m) => ({
                     role: m.role,
                     content: m.text,
                 }))
 
                 const nextMessages = [
                     ...baseMessages,
                     { role: "user", content },
                 ]
 
                 const response = await fetch("/api/agent", {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({
                         messages: nextMessages,
                         context,
                         event: extra ?? null,
                     }),
                 })
 
                const data = (await response.json()) as
                    | AgentResponse
                    | { error?: string }

                if (!response.ok || (data as { error?: string }).error) {
                    const message =
                        typeof (data as { error?: string }).error === "string"
                            ? (data as { error?: string }).error
                            : "AGENT_ERROR"
                    throw new Error(message)
                }
 
                const payload = data as AgentResponse
                appendMessage({
                     id: `assistant-${Date.now()}`,
                     role: "assistant",
                    text: payload.message,
                 })
 
                if (payload.action) {
                    executeAction(payload.action)
                 }
             } catch (error) {
                 appendMessage({
                     id: `assistant-error-${Date.now()}`,
                     role: "assistant",
                     text: "Sorry, something went wrong. Please try again.",
                 })
             } finally {
                 setIsLoading(false)
             }
         },
         [appendMessage, context, executeAction, messages]
     )
 
     const handleSubmit = async () => {
         const trimmed = input.trim()
         if (!trimmed || isLoading) return
 
         appendMessage({
             id: `user-${Date.now()}`,
             role: "user",
             text: trimmed,
         })
         setInput("")
         await sendToAgent(trimmed)
     }
 
     const handleCardsSelected = useCallback(
         async (cards: { name: string; isReversed: boolean }[]) => {
             if (!cards.length) return
             setCardsToSelect(0)
             setSelectedCount(0)
 
             const drawnCards: TarotCard[] = cards.map((card, index) => ({
                 id: index + 1,
                 name: card.name,
                 image: `assets/rider-waite-tarot/${card.name
                     .toLowerCase()
                     .replace(/\s+/g, "-")}.png`,
                 meaning: card.isReversed ? `${card.name} (Reversed)` : card.name,
                 isReversed: card.isReversed,
             }))
 
             const cardSummary = cards
                 .map((card) =>
                     card.isReversed
                         ? `${card.name} (Reversed)`
                         : card.name
                 )
                 .join(", ")
 
            const nextMessages = [
                ...messages,
                {
                    id: `assistant-cards-${Date.now()}`,
                    role: "assistant" as const,
                    text: "Here are your drawn cards.",
                    cards: drawnCards,
                },
                {
                    id: `user-cards-${Date.now()}`,
                    role: "user" as const,
                    text: `Cards drawn: ${cardSummary}`,
                },
            ]

            setMessages(nextMessages)

            await sendToAgent(
                 "Please interpret the drawn cards.",
                 {
                     type: "TAROT_RESULT",
                     cards,
                     readingType,
                },
                nextMessages
             )
         },
        [messages, readingType, sendToAgent]
     )
 
     const canSend = input.trim().length > 0 && !isLoading
     const readingLabel = readingFlow
         ? `Reading mode: ${readingType ?? "general"}`
         : null
 
     return (
         <div className='w-full h-full min-h-[calc(100dvh-65px)] flex flex-col overflow-hidden relative'>
             <div className='flex-1 overflow-y-auto px-6 py-6 space-y-4'>
                 {readingLabel && (
                     <div className='text-xs text-yellow-300'>{readingLabel}</div>
                 )}
                 {messages.map((message) => (
                     <div
                         key={message.id}
                         className={`flex ${
                             message.role === "user"
                                 ? "justify-end"
                                 : "justify-start"
                         }`}
                     >
                         <div
                             className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                 message.role === "user"
                                     ? "bg-primary text-white"
                                     : "bg-white/10 text-white"
                             }`}
                         >
                             {message.text}
                             {message.cards && message.cards.length > 0 && (
                                 <div className='mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3'>
                                     {message.cards.map((card) => (
                                         <div key={`${message.id}-${card.id}`}>
                                             <CardImage
                                                 card={card}
                                                 className='w-full'
                                             />
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                     </div>
                 ))}
                 <div ref={messagesEndRef} />
             </div>
 
             {cardsToSelect > 0 && (
                 <div className='px-6 pb-4 space-y-3'>
                     <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-center'>
                         <div className='space-y-1 text-white/80'>
                             <p className='text-xs'>
                                 Select {selectedCount}/{cardsToSelect} cards
                             </p>
                         </div>
                         <div className='flex items-center gap-2 justify-center'>
                             <Button
                                 type='button'
                                 variant='outline'
                                 onClick={() => shuffleFn?.()}
                                 disabled={!shuffleFn}
                             >
                                 Shuffle
                             </Button>
                             <Button
                                 type='button'
                                 variant='outline'
                                 onClick={() => pickFn?.()}
                                 disabled={!pickFn}
                             >
                                 Pick one
                             </Button>
                         </div>
                     </div>
                     <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                         <LinearCardSpread
                             cardsToSelect={cardsToSelect}
                             onCardsSelected={handleCardsSelected}
                             onPartialSelect={(_, __, count) =>
                                 setSelectedCount(count)
                             }
                             onProvideShuffle={(fn) => setShuffleFn(() => fn)}
                             onProvideRandomPick={(fn) => setPickFn(() => fn)}
                         />
                     </div>
                 </div>
             )}
 
             <div className='border-t border-white/10 px-6 py-4'>
                 <div className='flex gap-3 items-end'>
                     <AutoHeightTextarea
                         value={input}
                         onChange={(e) => setInput(e.target.value)}
                        placeholder='Ask Astra to guide you...'
                         className='flex-1 min-h-[44px] rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/50'
                         onKeyDown={(e) => {
                             if (e.key === "Enter" && !e.shiftKey) {
                                 e.preventDefault()
                                 void handleSubmit()
                             }
                         }}
                     />
                     <Button onClick={handleSubmit} disabled={!canSend}>
                         Send
                     </Button>
                 </div>
                 <p className='mt-2 text-xs text-white/50'>
                    You’re chatting with Astra, the official AskingFate guide.
                 </p>
             </div>
 
             <Dialog
                 open={Boolean(activeModalId)}
                 onOpenChange={(open) => {
                     if (!open) setActiveModalId(null)
                 }}
             >
                 <DialogContent className='max-w-lg'>
                     <DialogHeader>
                         <DialogTitle>Modal: {activeModalId}</DialogTitle>
                     </DialogHeader>
                     <p className='text-sm text-muted-foreground'>
                         This modal was opened by the AI agent. Wire in your
                         modal content for "{activeModalId}" here.
                     </p>
                 </DialogContent>
             </Dialog>
         </div>
     )
 }
