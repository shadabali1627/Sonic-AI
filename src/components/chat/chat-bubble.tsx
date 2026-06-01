"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import { Volume2, User, Bot, Copy, Check, FileText, RefreshCw, Download, Sparkles, X, ZoomIn } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { franc } from 'franc-min'
import { useSmoothStream } from "@/hooks/use-smooth-stream"
import { motion, AnimatePresence } from "framer-motion"

interface Attachment {
    url: string
    type: string
    name: string
}

interface ChatBubbleProps {
    role: "user" | "assistant"
    content: string
    type?: "text" | "image"
    imageUrl?: string
    attachments?: Attachment[] | string[]
    isStreaming?: boolean
    onRegenerate?: () => void
    isLast?: boolean
    isGeneratingImage?: boolean
}

const MemoizedReactMarkdown = React.memo(ReactMarkdown, (prev: any, next: any) => {
    return prev.children === next.children && prev.className === next.className
})

// Sub-component for code blocks to optimize rerenders and state management
const CodeBlock = React.memo(({ language, code }: { language: string; code: string }) => {
    const [copied, setCopied] = React.useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="relative my-4 rounded-xl border border-white/10 bg-[#08090c] shadow-lg overflow-hidden">
            {/* macOS window controls style header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-black/35 border-b border-white/5">
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] opacity-80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] opacity-80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f] opacity-80" />
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">{language || 'code'}</span>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-cyan-400 transition-all bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md border border-white/5 font-semibold"
                    >
                        {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                </div>
            </div>
            <div className="p-4 overflow-x-auto text-sm font-mono leading-relaxed scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <code>{code}</code>
            </div>
        </div>
    )
})
CodeBlock.displayName = "CodeBlock"

// Image generation loading skeleton with shimmer effect
const ImageSkeleton = React.memo(() => (
    <div className="relative w-full max-w-[400px] aspect-square rounded-2xl overflow-hidden border border-white/10 bg-[#0a0b0f]">
        {/* Shimmer animation */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-[shimmer_2s_infinite]" 
             style={{ backgroundSize: '200% 100%' }} />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10"
             style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="relative">
                <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 animate-pulse rounded-full" />
                <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-purple-400 animate-pulse" />
                </div>
            </div>
            <div className="flex flex-col items-center gap-1.5">
                <span className="text-sm font-semibold text-gray-300">Generating image</span>
                <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    </div>
))
ImageSkeleton.displayName = "ImageSkeleton"

export const ChatBubble = React.memo(function ChatBubble({ role, content, type, imageUrl, attachments, isStreaming, onRegenerate, isLast, isGeneratingImage }: ChatBubbleProps) {
    const [isSpeaking, setIsSpeaking] = React.useState(false)
    const [copied, setCopied] = React.useState(false)
    const [isModalOpen, setIsModalOpen] = React.useState(false)

    const openModal = React.useCallback(() => {
        if (typeof window !== 'undefined') {
            window.history.pushState({ modalOpen: true }, "")
        }
        setIsModalOpen(true)
    }, [])

    const closeModal = React.useCallback(() => {
        if (typeof window !== 'undefined' && window.history.state?.modalOpen) {
            window.history.back()
        } else {
            setIsModalOpen(false)
        }
    }, [])

    React.useEffect(() => {
        if (isModalOpen) {
            const handlePopState = () => {
                setIsModalOpen(false)
            }
            window.addEventListener("popstate", handlePopState)
            return () => {
                window.removeEventListener("popstate", handlePopState)
            }
        }
    }, [isModalOpen])

    React.useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && (window as any).__activeSpeechCleanup) {
                try {
                    window.speechSynthesis.cancel()
                } catch (e) {}
                try {
                    (window as any).__activeSpeechCleanup()
                } catch (e) {}
            }
        }
    }, [])

    const isImageMessage = type === 'image'

    // Apply smooth streaming effect only for assistant and when streaming is active
    const rawDisplayText = useSmoothStream(content, role === 'assistant' && !!isStreaming)

    // Fix incomplete markdown code blocks to prevent flickering
    const displayText = React.useMemo(() => {
        let text = rawDisplayText;
        const codeBlockCount = (text.match(/```/g) || []).length;
        if (codeBlockCount % 2 !== 0) {
            text += "\n```";
        }
        return text;
    }, [rawDisplayText]);

    const handleCopy = () => {
        navigator.clipboard.writeText(content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDownloadImage = () => {
        if (!imageUrl) return
        const link = document.createElement('a')
        link.href = imageUrl
        link.download = `sonic-ai-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const stripMarkdown = (text: string) => {
        return text
            .replace(/\*\*/g, '') // Bold
            .replace(/\*/g, '')   // Italic/List
            .replace(/#/g, '')    // Headers
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
            .replace(/`{3}[\s\S]*?`{3}/g, 'code block') // Code blocks
            .replace(/`/g, '')    // Inline code
            .replace(/>/g, '')    // Blockquotes
            .replace(/- /g, '')   // List items
            .trim();
    }

    const handleSpeak = () => {
        if (typeof window === 'undefined') return

        if (isSpeaking) {
            try {
                window.speechSynthesis.cancel()
            } catch (e) {}
            setIsSpeaking(false)
            if ((window as any).__activeSpeechCleanup) {
                (window as any).__activeSpeechCleanup = null
            }
        } else {
            // 1. Cancel any active speech globally and reset previous speaking states
            try {
                window.speechSynthesis.cancel()
            } catch (e) {}
            if (typeof (window as any).__activeSpeechCleanup === 'function') {
                try {
                    (window as any).__activeSpeechCleanup()
                } catch (e) {}
            }

            const cleanText = stripMarkdown(content)
            if (!cleanText) return

            const utterance = new SpeechSynthesisUtterance(cleanText)
            
            // Auto-detect language using the existing franc-min library
            const getLanguageCode = (text: string) => {
                const langMap: { [key: string]: string } = {
                    'eng': 'en-US',
                    'spa': 'es-ES',
                    'fra': 'fr-FR',
                    'deu': 'de-DE',
                    'ita': 'it-IT',
                    'por': 'pt-PT',
                    'rus': 'ru-RU',
                    'zho': 'zh-CN',
                    'jpn': 'ja-JP',
                    'hin': 'hi-IN',
                    'urd': 'ur-PK',
                };
                const supportedLangs = Object.keys(langMap);
                const langCode = franc(text, { only: supportedLangs });
                return langMap[langCode] || 'en-US';
            }

            utterance.lang = getLanguageCode(cleanText)

            const cleanup = () => {
                setIsSpeaking(false)
                if ((window as any).__activeSpeechCleanup === cleanup) {
                    (window as any).__activeSpeechCleanup = null
                }
            }

            utterance.onend = cleanup;
            utterance.onerror = cleanup;

            // Register this cleanup globally
            (window as any).__activeSpeechCleanup = cleanup;

            setIsSpeaking(true)
            try {
                window.speechSynthesis.speak(utterance)
            } catch (e) {
                console.error('SpeechSynthesis speak failed:', e)
                cleanup()
                alert('Speech synthesis failed to start')
            }

            // Workaround for Safari iOS bug where speech randomly pauses
            const resumeInterval = setInterval(() => {
                if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
                    try {
                        window.speechSynthesis.resume()
                    } catch (e) {}
                } else {
                    clearInterval(resumeInterval)
                }
            }, 5000)

            // Wrap cleanup to clear interval
            const originalCleanup = cleanup;
            (window as any).__activeSpeechCleanup = () => {
                clearInterval(resumeInterval)
                originalCleanup()
            }
        }
    }

    return (
        <div
            className={cn(
                "flex w-full gap-2 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative",
                role === "user" ? "flex-row-reverse self-end" : "self-start"
            )}
        >
            {/* Avatar */}
            <div className={cn(
                "shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-lg transform translate-y-1 transition-all duration-300",
                role === "user"
                    ? "bg-linear-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/20 ring-1 ring-white/10"
                    : "bg-linear-to-br from-purple-600/10 to-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-purple-500/5"
            )}>
                {role === "user" ? <User className="h-4 w-4 sm:h-5 sm:w-5" /> : <Bot className="h-5 w-5 sm:h-6 sm:w-6" />}
            </div>

            {/* Bubble */}
            <div
                className={cn(
                    "relative group flex-1 transition-all duration-300 max-w-full md:max-w-[85%]",
                    role === "user"
                        ? "px-4 py-3 sm:p-6 shadow-md rounded-3xl rounded-tr-sm bg-linear-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 text-white backdrop-blur-md shadow-[0_10px_30px_-5px_rgba(6,182,212,0.15)]"
                        : isImageMessage || isGeneratingImage
                            ? "text-gray-100 pb-14"
                            : "px-4 py-3 sm:p-6 shadow-md rounded-3xl rounded-tl-sm glass-card text-gray-100 pb-14",
                    isStreaming && role === "assistant" && "border-cyan-500/30 ring-1 ring-cyan-500/10"
                )}
            >
                <div className="prose prose-invert max-w-none w-full prose-headings:font-heading prose-headings:text-gray-100 prose-p:text-gray-300 prose-strong:text-white prose-code:text-cyan-300">
                    {/* Image Generation: Loading Skeleton */}
                    {isGeneratingImage && (
                        <ImageSkeleton />
                    )}

                    {/* Image Generation: Rendered Image */}
                    {isImageMessage && imageUrl && !isGeneratingImage && (
                        <div className="space-y-3 mb-4">
                            <div 
                                onClick={openModal}
                                className="relative group/img w-full max-w-[400px] rounded-2xl overflow-hidden border border-white/10 shadow-lg hover:shadow-purple-500/20 hover:border-purple-500/30 transition-all duration-500 cursor-zoom-in"
                            >
                                <img
                                    src={imageUrl}
                                    alt={content || 'Generated image'}
                                    className="w-full h-auto object-cover transition-transform duration-500 group-hover/img:scale-[1.02]"
                                    loading="lazy"
                                />
                                {/* Hover overlay for zoom */}
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <div className="h-10 w-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white scale-90 group-hover/img:scale-100 transition-all duration-300 shadow-lg">
                                        <ZoomIn className="h-5 w-5 text-white" />
                                    </div>
                                </div>
                                {/* Download overlay button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadImage();
                                    }}
                                    className="absolute top-3 right-3 h-9 w-9 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-100 md:opacity-0 group-hover/img:opacity-100 transition-all duration-300 hover:scale-110 shadow-lg z-10"
                                    title="Download image"
                                >
                                    <Download className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Regular text message / image prompt description */}
                    {!isGeneratingImage && (isImageMessage ? content : true) && (
                        <MemoizedReactMarkdown
                            components={{
                                h1: ({ node, ...props }) => <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-purple-400 mt-6 mb-4 pb-2 border-b border-white/10" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-xl sm:text-2xl font-bold text-gray-100 mt-5 mb-3" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-lg sm:text-xl font-bold text-gray-200 mt-4 mb-2" {...props} />,
                                p: ({ node, ...props }) => <p className="mb-4 last:mb-0 leading-7 text-[15px]" {...props} />,
                                a: ({ node, ...props }) => <a className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors font-medium" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1 text-gray-300 marker:text-cyan-500" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-gray-300 marker:text-cyan-500" {...props} />,
                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-cyan-500/50 pl-4 py-1 my-4 bg-white/5 rounded-r italic text-gray-400" {...props} />,
                                hr: ({ node, ...props }) => <hr className="border-white/10 my-6" {...props} />,
                                code: ({ node, inline, className, children, ...props }: any) => {
                                    const match = /language-(\w+)/.exec(className || '')
                                    return !inline ? (
                                        <CodeBlock language={match ? match[1] : ''} code={String(children).replace(/\n$/, '')} />
                                    ) : (
                                        <code className="bg-white/10 text-cyan-300 px-1.5 py-0.5 rounded text-xs font-mono border border-white/5" {...props}>
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                        >
                            {displayText}
                        </MemoizedReactMarkdown>
                    )}
                </div>

                {attachments && attachments.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {attachments.map((att, i) => {
                            const isString = typeof att === 'string';
                            const url = isString ? att : att.url;
                            const type = isString ? 'image/jpeg' : att.type;
                            const name = isString ? 'Attachment' : att.name;

                            if (type.startsWith('image/')) {
                                return (
                                    <img
                                        key={i}
                                        src={url}
                                        alt={name}
                                        loading="lazy"
                                        className="w-full max-w-[240px] rounded-xl border border-white/10 shadow-md hover:scale-[1.02] transition-transform duration-300"
                                    />
                                );
                            } else {
                                return (
                                    <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 pr-5 max-w-[260px] shadow-sm hover:bg-white/10 transition-colors cursor-pointer group/file">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-500 group-hover/file:bg-red-500/30 transition-colors">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate text-sm font-medium text-white">{name}</span>
                                            <span className="text-xs text-gray-400 uppercase">{name.split('.').pop()} File</span>
                                        </div>
                                    </div>
                                );
                            }
                        })}
                    </div>
                )}

                {role === "assistant" && !isStreaming && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 transform translate-y-1 sm:group-hover:translate-y-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-cyan-400 bg-white/5 hover:bg-cyan-500/15 border border-white/5 rounded-xl transition-all shadow-md backdrop-blur-md"
                            onClick={handleSpeak}
                            title="Read aloud"
                        >
                            <Volume2 className={cn("h-3.5 w-3.5", isSpeaking && "text-cyan-400 animate-pulse")} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-cyan-400 bg-white/5 hover:bg-cyan-500/15 border border-white/5 rounded-xl transition-all shadow-md backdrop-blur-md"
                            onClick={handleCopy}
                            title="Copy text"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        {isLast && onRegenerate && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-cyan-400 bg-white/5 hover:bg-cyan-500/15 border border-white/5 rounded-xl transition-all shadow-md backdrop-blur-md"
                                onClick={onRegenerate}
                                title="Regenerate response"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                )}
            </div>
            {/* Image Popup Modal */}
            <AnimatePresence>
                {isModalOpen && imageUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeModal}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 cursor-zoom-out"
                    >
                        {/* Top bar with actions */}
                        <div className="absolute top-4 right-4 flex items-center gap-3 z-55" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={handleDownloadImage}
                                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white hover:text-cyan-400 hover:scale-110 transition-all duration-300 shadow-md cursor-pointer"
                                title="Download image"
                            >
                                <Download className="h-5 w-5" />
                            </button>
                            <button
                                onClick={closeModal}
                                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white hover:text-red-400 hover:scale-110 transition-all duration-300 shadow-md cursor-pointer"
                                title="Close preview"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Image Container */}
                        <motion.div
                            initial={{ scale: 0.95, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 15 }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="relative max-w-full max-h-[80vh] rounded-2xl overflow-hidden border border-white/10 bg-[#0a0b0f] shadow-2xl flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={imageUrl}
                                alt={content || "Generated image"}
                                className="max-w-full max-h-[80vh] object-contain select-none cursor-default"
                            />
                        </motion.div>

                        {/* Prompt Caption */}
                        {content && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ delay: 0.05 }}
                                className="mt-4 max-w-2xl text-center px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-lg"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <p className="text-sm text-gray-200 leading-relaxed italic flex items-center justify-center gap-2 select-text cursor-default">
                                    <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
                                    <span>{content}</span>
                                </p>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
})
