"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import { Volume2, User, Bot, Copy, Check, FileText, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { franc } from 'franc-min'
import { useSmoothStream } from "@/hooks/use-smooth-stream"

interface Attachment {
    url: string
    type: string
    name: string
}

interface ChatBubbleProps {
    role: "user" | "assistant"
    content: string
    attachments?: Attachment[] | string[]
    isStreaming?: boolean
    onRegenerate?: () => void
    isLast?: boolean
}

const MemoizedReactMarkdown = React.memo(ReactMarkdown, (prev: any, next: any) => {
    return prev.children === next.children && prev.className === next.className
})

export const ChatBubble = React.memo(function ChatBubble({ role, content, attachments, isStreaming, onRegenerate, isLast }: ChatBubbleProps) {
    const [isSpeaking, setIsSpeaking] = React.useState(false)
    const [copied, setCopied] = React.useState(false)

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

    const handleSpeak = () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel()
            setIsSpeaking(false)
        } else {
            const cleanText = stripMarkdown(content)
            const utterance = new SpeechSynthesisUtterance(cleanText)
            utterance.lang = getLanguageCode(cleanText)
            utterance.onend = () => setIsSpeaking(false)
            window.speechSynthesis.speak(utterance)
            setIsSpeaking(true)
        }
    }

    return (
        <div
            className={cn(
                "flex w-full gap-2 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500",
                role === "user" ? "flex-row-reverse self-end" : "self-start"
            )}
        >
            {/* Avatar */}
            <div className={cn(
                "shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-lg transform translate-y-1",
                role === "user"
                    ? "bg-linear-to-br from-cyan-500 to-blue-600 text-white"
                    : "bg-white/10 text-cyan-400 border border-white/10"
            )}>
                {role === "user" ? <User className="h-4 w-4 sm:h-5 sm:w-5" /> : <Bot className="h-5 w-5 sm:h-6 sm:w-6" />}
            </div>

            {/* Bubble */}
            <div
                className={cn(
                    "relative group flex-1 overflow-hidden px-3 py-2.5 sm:p-6 shadow-md transition-all duration-300 max-w-full md:max-w-[85%]",
                    role === "user"
                        ? "rounded-2xl rounded-tr-sm bg-linear-to-br from-cyan-600/20 to-blue-700/20 border border-cyan-500/20 text-white backdrop-blur-sm shadow-[0_4px_20px_-5px_rgba(0,180,255,0.15)]"
                        : "rounded-2xl rounded-tl-sm glass-card text-gray-100 pb-12",
                    isStreaming && role === "assistant" && "border-cyan-500/30 ring-1 ring-cyan-500/10"
                )}
            >
                <div className="prose prose-invert max-w-none w-full prose-headings:font-heading prose-headings:text-gray-100 prose-p:text-gray-300 prose-strong:text-white prose-code:text-cyan-300">
                    <MemoizedReactMarkdown
                        components={{
                            h1: ({ node, ...props }) => <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-purple-400 mt-6 mb-4 pb-2 border-b border-white/10" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-xl sm:text-2xl font-bold text-gray-100 mt-5 mb-3" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-lg sm:text-xl font-bold text-gray-200 mt-4 mb-2" {...props} />,
                            p: ({ node, ...props }) => <p className="mb-4 last:mb-0 leading-7" {...props} />,
                            a: ({ node, ...props }) => <a className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1 text-gray-300 marker:text-cyan-500" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-gray-300 marker:text-cyan-500" {...props} />,
                            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-cyan-500/50 pl-4 py-1 my-4 bg-white/5 rounded-r italic text-gray-400" {...props} />,
                            hr: ({ node, ...props }) => <hr className="border-white/10 my-6" {...props} />,
                            code: ({ node, inline, className, children, ...props }: any) => {
                                const match = /language-(\w+)/.exec(className || '')
                                return !inline ? (
                                    <div className="relative my-4 rounded-xl border border-white/10 bg-[#0d1017] shadow-lg overflow-hidden group/code">
                                        <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/5">
                                            <div className="flex gap-1.5">
                                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
                                                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
                                                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
                                            </div>
                                            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">{match ? match[1] : 'CODE'}</span>
                                        </div>
                                        <div className="p-4 overflow-x-auto text-sm font-mono leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
                                            <code className={className} {...props}>
                                                {children}
                                            </code>
                                        </div>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(String(children))}
                                            className="absolute top-2 right-2 p-1.5 rounded-md text-gray-500 hover:text-cyan-400 hover:bg-white/10 opacity-0 group-hover/code:opacity-100 transition-all"
                                            title="Copy code"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <code className="bg-white/10 text-cyan-200 px-1.5 py-0.5 rounded text-xs font-mono border border-white/5" {...props}>
                                        {children}
                                    </code>
                                )
                            }
                        }}
                    >
                        {displayText}
                    </MemoizedReactMarkdown>
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
                                        className="w-full max-w-[240px] rounded-xl border border-white/10 shadow-md hover:scale-[1.02] transition-transform"
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
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg"
                            onClick={handleSpeak}
                            title="Read aloud"
                        >
                            <Volume2 className={cn("h-3.5 w-3.5", isSpeaking && "text-cyan-400 animate-pulse")} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg"
                            onClick={handleCopy}
                            title="Copy text"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        {isLast && onRegenerate && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg"
                                onClick={onRegenerate}
                                title="Regenerate response"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
})
