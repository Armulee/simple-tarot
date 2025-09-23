"use client"

import { useState } from "react"

export function SimpleQuestionInput() {
    const [question, setQuestion] = useState("")
    
    return (
        <div className="w-full mb-6 text-left">
            <label className="block mb-2 text-lg text-white">
                Your question
            </label>
            <div className="relative group w-full">
                <textarea
                    placeholder="Ask me anything about your future, past, or present..."
                    className="relative z-10 w-full pl-4 pr-15 py-2 text-white placeholder:text-white/70 bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl border border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/40 rounded-2xl resize-none shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)] appearance-none min-h-[60px]"
                    onChange={(e) => setQuestion(e.target.value)}
                    value={question}
                />
            </div>
        </div>
    )
}