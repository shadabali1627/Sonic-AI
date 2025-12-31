"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Sidebar } from "@/components/chat/sidebar"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatBubble } from "@/components/chat/chat-bubble"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, ArrowDown, Sparkles } from "lucide-react"
import { API_URL, getChat } from "@/lib/api"
import { ThinkingIndicator } from "@/components/chat/thinking-indicator"
import { cn } from "@/lib/utils"
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom"

import { LogoutDialog } from "@/components/logout-dialog"

export default function ChatPage() {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false) // Mobile
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = React.useState(true) // Desktop
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [inputMessage, setInputMessage] = React.useState("")
  const [chatId, setChatId] = React.useState<string | null>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  // Auto-scroll hook
  const { scrollRef, showScrollButton, scrollToBottom, handleScroll } = useScrollToBottom(messages)

  // Redirect if not authenticated
  React.useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const handleLogoutConfirm = () => {
    localStorage.removeItem('access_token')
    router.push('/login')
  }

  const handleNewChat = () => {
    setMessages([])
    setInputMessage("")
    setChatId(null)
    setIsSidebarOpen(false) // Close mobile sidebar
  }

  const handleLoadChat = async (id: string) => {
    try {
      setIsLoading(true)
      const chat = await getChat(id)
      setChatId(chat.id || chat._id)
      setMessages(chat.messages)
      setIsSidebarOpen(false)
    } catch (e) {
      console.error("Failed to load chat", e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoading(false)
    // Update last message to stop streaming visual
    setMessages(prev => {
      const newMessages = [...prev]
      const lastMsg = newMessages[newMessages.length - 1]
      if (lastMsg && lastMsg.role === 'assistant') {
        lastMsg.isStreaming = false
      }
      return newMessages
    })
  }

  const handleSendMessage = async (text: string, files?: File[]) => {
    if (!text && (!files || files.length === 0)) return;

    // Force scroll to bottom on new message to ensure auto-scroll logic kicks in
    scrollToBottom()

    // Abort previous request if active
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // 1. Optimistic User Message
    const attachments = files ? files.map(f => ({
      url: URL.createObjectURL(f),
      type: f.type,
      name: f.name
    })) : []

    const userMsg = { role: 'user', content: text, attachments }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const token = localStorage.getItem('access_token')
      const formData = new FormData()
      formData.append('message', text)
      // Currently backend only supports one file for simplicity in FileService or ChatService?
      // Let's check backend logic. ChatService takes image_bytes/audio_bytes. 
      // Route /chat accepts `file: UploadFile = File(None)`
      if (files && files.length > 0) {
        formData.append('file', files[0])
      }
      if (chatId) {
        formData.append('chat_id', chatId)
      }

      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData,
        signal: abortController.signal
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      if (!response.body) return;

      // 2. Prepare AI Message Placeholder
      setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }])

      // 3. Read Stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let accumulatedText = ""

      // Check for X-Chat-Id header
      const newChatId = response.headers.get('X-Chat-Id')
      if (newChatId && !chatId) {
        setChatId(newChatId)
        // Ideally refresh sidebar here...
      }

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading

        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          accumulatedText += chunk

          setMessages(prev => {
            const newMessages = [...prev]
            const lastMsg = newMessages[newMessages.length - 1]
            if (lastMsg.role === 'assistant') {
              lastMsg.content = accumulatedText
            }
            return newMessages
          })
        }
      }

      // Finalize
      setMessages(prev => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1].isStreaming = false
        return newMessages
      })

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Request aborted")
        return
      }
      console.error("Chat error:", error)
      // Add error message
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to the server.' }])
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleRegenerate = async () => {
    if (!chatId || isLoading) return;

    // Remove the last assistant message locally
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg.role === 'assistant') {
        return prev.slice(0, -1);
      }
      return prev;
    });

    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${API_URL}/regenerate/${chatId}`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate message');
      }

      if (!response.body) return;

      // Prepare AI Message Placeholder
      setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);

      // Stream Reading Logic (Similar to handleSendMessage)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          setMessages(prev => {
            const newMessages = [...prev]
            const lastMsg = newMessages[newMessages.length - 1]
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.content = accumulatedText
            }
            return newMessages
          })
        }
      }

      // Finalize
      setMessages(prev => {
        const newMessages = [...prev]
        if (newMessages.length > 0) {
          newMessages[newMessages.length - 1].isStreaming = false
        }
        return newMessages
      })

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error("Regenerate error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I failed to regenerate the response.' }]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }

  return (
    <div className="flex overflow-hidden bg-background text-gray-100 selection:bg-cyan-500/30 font-sans" style={{ height: '100dvh' }}>

      {/* Sidebar - Mobile & Desktop */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isDesktopOpen={isDesktopSidebarOpen}
        onDesktopToggle={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
        onLoadChat={handleLoadChat}
        onNewChat={handleNewChat}
      />

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col overflow-hidden relative min-w-0 bg-transparent transition-all duration-300">

        {/* Header (Top Bar) */}
        <header className="flex items-center justify-between p-3 sm:h-16 sm:px-6 border-b border-white/5 sticky top-0 z-30 bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                setIsSidebarOpen(true)
              }}
              className="lg:hidden text-gray-400 hover:text-white hover:bg-white/10"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Desktop trigger removed - handled by Sidebar component */}

            <div className={cn("flex items-center gap-2", isDesktopSidebarOpen ? "lg:hidden" : "flex")}>
              <div className="h-6 w-6 rounded-md bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                S
              </div>
              <span className="font-heading font-bold text-lg tracking-tight">Sonic AI</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 gap-2 transition-colors rounded-full px-3"
            onClick={() => setIsLogoutDialogOpen(true)}
          >
            <span className="hidden sm:inline text-xs font-medium uppercase tracking-wider">Log Out</span>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        {/* Chat Scroll Area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        >
          <div className="w-full max-w-5xl mx-auto px-2 py-4 sm:px-6 lg:px-8 min-h-full flex flex-col">

            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 sm:py-20 animate-in fade-in duration-700">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, type: "spring" }}
                  className="mb-10 text-center relative"
                >
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-cyan-500 blur-3xl opacity-20 animate-pulse rounded-full"></div>
                    <div className="relative h-28 w-28 mx-auto mb-6 rounded-3xl bg-linear-to-br from-[#0B0E14] to-[#1A1D24] border border-white/10 shadow-2xl flex items-center justify-center group overflow-hidden">
                      <div className="absolute inset-0 bg-linear-to-br from-cyan-500/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <Sparkles className="h-12 w-12 text-cyan-400 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  </div>

                  <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-white mb-4 tracking-tight drop-shadow-sm">
                    Hello, <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-purple-500">Human</span>
                  </h1>
                  <p className="text-lg text-gray-400 max-w-lg mx-auto leading-relaxed">
                    I'm Sonic AI. I can help you code, create content, or verify facts in seconds. What's on your mind?
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
                  {[
                    { icon: "📄", title: "Summarize PDF", text: "Upload a document for a quick summary", color: "from-blue-500/20 to-cyan-500/20" },
                    { icon: "🐍", title: "Python Script", text: "Generate automation scripts for data", color: "from-green-500/20 to-emerald-500/20" },
                    { icon: "✈️", title: "Travel Plan", text: "Itinerary for a 5-day trip to Tokyo", color: "from-orange-500/20 to-yellow-500/20" },
                    { icon: "📧", title: "Email Draft", text: "Professional follow-up to a client", color: "from-purple-500/20 to-pink-500/20" },
                    { icon: "🐛", title: "Debug Code", text: "Find and fix errors in React component", color: "from-red-500/20 to-rose-500/20" },
                    { icon: "🎨", title: "Generate Image", text: "Futuristic cityscape illustration", color: "from-indigo-500/20 to-violet-500/20" }
                  ].map((card, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i + 0.3, duration: 0.4 }}
                      onClick={() => setInputMessage(card.text)}
                      className="group relative flex flex-col items-start p-5 bg-white/3 hover:bg-white/6 border border-white/5 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-xl hover:border-cyan-500/30 overflow-hidden text-left"
                    >
                      <div className={`absolute inset-0 bg-linear-to-br ${card.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                      <span className="text-2xl mb-4 bg-white/5 p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-sm border border-white/5">{card.icon}</span>
                      <h3 className="font-heading font-semibold text-white mb-2 text-lg group-hover:text-cyan-400 transition-colors">{card.title}</h3>
                      <p className="text-sm text-gray-400 leading-snug">{card.text}</p>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 pb-4 pt-4">
                {messages.map((msg, i) => (
                  <ChatBubble
                    key={i}
                    role={msg.role}
                    content={msg.content}
                    isStreaming={msg.isStreaming}
                    attachments={msg.attachments}
                    isLast={i === messages.length - 1}
                    onRegenerate={i === messages.length - 1 && msg.role === 'assistant' ? handleRegenerate : undefined}
                  />
                ))}

                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="py-4">
                    <ThinkingIndicator />
                  </div>
                )}

                {/* Spacer for bottom input area */}
                <div className="h-24 sm:h-32" />
              </div>
            )}
          </div>
        </div>

        {/* Scroll Button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/80 text-white backdrop-blur-md border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:bg-cyan-400 transition-all"
            >
              <ArrowDown className="h-4 w-4 stroke-[3px]" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 z-20 w-full px-2 pb-2 sm:px-6 sm:pb-6">
          <div className="max-w-4xl mx-auto">
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              value={inputMessage}
              onInputChange={setInputMessage}
              onStop={handleStop}
            />
          </div>
        </div>
      </main>

      <LogoutDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  )
}
