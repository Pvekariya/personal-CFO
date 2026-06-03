"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const { messages, status, sendMessage } = useChat()
  const isLoading = status === "submitted" || status === "streaming"
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-gradient-to-tr from-primary to-purple-600 shadow-xl hover:shadow-2xl hover:scale-105 transition-all z-50 group border-2 border-background ring-4 ring-primary/20"
      >
        <img 
          src="https://img.icons8.com/ios/50/bot.png" 
          alt="AI Advisor" 
          className="w-7 h-7 filter brightness-0 invert group-hover:rotate-12 transition-transform" 
        />
      </button>
    )
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[380px] h-[600px] max-h-[80vh] flex flex-col shadow-2xl z-50 overflow-hidden border-border/50 bg-background/95 backdrop-blur-xl animate-in slide-in-from-bottom-5">
      <CardHeader className="bg-muted/30 border-b border-border/50 pb-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <img src="https://img.icons8.com/ios/50/bot.png" alt="AI Advisor" className="w-5 h-5 dark:invert opacity-80" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Financial Advisor AI</CardTitle>
            <p className="text-[10px] text-muted-foreground">Premium Wealth Management</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)} 
          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
        >
          <img src="https://img.icons8.com/ios/50/delete-sign--v1.png" className="w-4 h-4 dark:invert opacity-60 hover:opacity-100" alt="Close" />
        </button>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-secondary/10">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-70">
            <div className="p-4 rounded-full bg-primary/10 mb-2">
              <img src="https://img.icons8.com/ios/50/sparkling.png" className="w-8 h-8 dark:invert opacity-60" alt="AI" />
            </div>
            <p className="text-sm font-medium">How can I assist you with your finances today?</p>
            <p className="text-xs text-muted-foreground max-w-[250px]">Ask me about wealth building, debt management, or general financial strategies.</p>
          </div>
        )}
        
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm shadow-sm"
                  : "bg-secondary text-secondary-foreground rounded-tl-sm border border-border/50 shadow-sm"
              }`}
            >
              {m.parts?.map((part, i) => {
                if (part.type === "text") return <span key={i}>{part.text}</span>
                return null
              })}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 text-sm flex gap-1 items-center border border-border/50">
              <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <CardFooter className="p-3 border-t border-border/50 bg-background">
        <form 
          onSubmit={(e) => {
            e.preventDefault()
            if (!input.trim() || isLoading) return
            sendMessage({ text: input })
            setInput("")
          }} 
          className="flex w-full items-center gap-2 relative"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your advisor..."
            className="flex h-10 w-full rounded-full border border-input bg-secondary/50 px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-10"
          />
          <button 
            type="submit" 
            disabled={isLoading || !(input || "").trim()}
            className="absolute right-1 top-1 bottom-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center disabled:opacity-50 transition-opacity"
          >
            <img src="https://img.icons8.com/ios/50/paper-plane.png" className="w-4 h-4 filter brightness-0 invert -ml-0.5" alt="Send" />
          </button>
        </form>
      </CardFooter>
    </Card>
  )
}
