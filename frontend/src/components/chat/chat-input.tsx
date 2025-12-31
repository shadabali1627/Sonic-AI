"use client"

import * as React from "react"
import { Paperclip, Mic, Send, X, FileText, Square, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { motion, AnimatePresence } from "framer-motion"

interface ChatInputProps {
    onSendMessage: (text: string, files?: File[]) => void
    isLoading?: boolean
    value?: string
    onInputChange?: (value: string) => void
    onStop?: () => void
}

export function ChatInput({ onSendMessage, isLoading, value, onInputChange, onStop }: ChatInputProps) {
    const [localInput, setLocalInput] = React.useState("")
    const [files, setFiles] = React.useState<File[]>([])
    const [isRecording, setIsRecording] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const recognitionRef = React.useRef<any>(null)

    const isControlled = value !== undefined
    const inputValue = isControlled ? value : localInput

    // Keep track of the latest input value for the closure
    const inputValueRef = React.useRef(inputValue)

    React.useEffect(() => {
        inputValueRef.current = inputValue
    }, [inputValue])

    // Initialize Speech Recognition
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition()
                recognition.lang = 'en-US'
                recognition.continuous = true
                recognition.interimResults = true

                recognition.onresult = (event: any) => {
                    let finalTranscript = ''
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript
                        }
                    }
                    if (finalTranscript) {
                        // Use ref to get the latest value without triggering re-init
                        const currentVal = inputValueRef.current
                        const newVal = (currentVal ? currentVal + ' ' : '') + finalTranscript
                        handleInputChange(newVal)
                    }
                }

                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error)
                    // Only stop if it's a fatal error or aborted
                    if (event.error === 'not-allowed' || event.error === 'aborted') {
                        setIsRecording(false)
                    }
                }

                recognition.onstart = () => {
                    setIsRecording(true)
                }

                recognition.onend = () => {
                    setIsRecording(false)
                }

                recognitionRef.current = recognition
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
        }
    }, []) // Empty dependency array - init once

    // Toggle Recording
    const toggleRecording = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition not supported in this browser.")
            return
        }

        try {
            if (isRecording) {
                recognitionRef.current.stop()
            } else {
                recognitionRef.current.start()
            }
        } catch (err) {
            console.error("Error toggling speech recognition:", err)
            // If we get an error stating it's already started, we assume it's recording
            setIsRecording(true)
        }
    }

    const handleInputChange = (val: string) => {
        if (isControlled && onInputChange) {
            onInputChange(val)
        } else {
            setLocalInput(val)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleSend = () => {
        if (!inputValue.trim() && files.length === 0) return

        // Stop recording if active
        if (isRecording && recognitionRef.current) {
            recognitionRef.current.stop()
            setIsRecording(false)
        }

        onSendMessage(inputValue, files)

        if (isControlled && onInputChange) {
            onInputChange("")
        } else {
            setLocalInput("")
        }
        setFiles([])
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files || [])])
        }
    }

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index))
    }

    return (
        <div className="relative w-full mx-auto max-w-3xl">
            {/* Morphing Glow Background */}
            <div className={cn(
                "absolute -inset-1 rounded-4xl bg-linear-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-0 blur-xl transition-opacity duration-500",
                (isFocused || isRecording) && "opacity-20",
                isLoading && "opacity-10 animate-pulse"
            )} />

            {/* Main Container */}
            <div
                className={cn(
                    "relative flex flex-col gap-2 rounded-3xl border bg-[#12141a]/90 p-2 shadow-2xl transition-all duration-300 backdrop-blur-xl",
                    isFocused ? "border-cyan-500/30 shadow-[0_0_40px_-10px_rgba(0,242,255,0.15)] ring-1 ring-white/10" : "border-white/10 shadow-black/50"
                )}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
                    }
                }}
            >
                {/* File Previews - Inside the capsule */}
                <AnimatePresence>
                    {files.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="flex gap-3 overflow-x-auto px-2 pt-2 scrollbar-thin scrollbar-thumb-white/10"
                        >
                            {files.map((file, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 group"
                                >
                                    {file.type.startsWith('image/') ? (
                                        <img src={URL.createObjectURL(file)} alt="preview" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                                    ) : (
                                        <FileText className="h-6 w-6 text-cyan-400" />
                                    )}
                                    <button
                                        onClick={() => removeFile(i)}
                                        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Input Row */}
                <div className="flex items-end gap-2 px-2 pb-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-full transition-all"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach file"
                    >
                        <Paperclip className="h-5 w-5" />
                        <span className="sr-only">Attach file</span>
                    </Button>
                    <input
                        type="file"
                        multiple
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                    />

                    <textarea
                        value={inputValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isRecording ? "Listening..." : "Ask anything..."}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className="flex-1 max-h-[200px] bg-transparent py-2.5 text-[15px] leading-relaxed text-gray-100 placeholder:text-gray-500 focus:outline-none resize-none font-medium scrollbar-hide min-h-[44px]"
                        rows={1}
                        style={{ height: 'auto' }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                        }}
                    />

                    <div className="flex items-center gap-2 pb-1">
                        {/* Recording Indicator Pulse */}
                        {isRecording && (
                            <div className="flex gap-1 h-6 items-center px-2">
                                <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-red-500 rounded-full" />
                                <motion.div animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }} className="w-1 bg-red-500 rounded-full" />
                                <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }} className="w-1 bg-red-500 rounded-full" />
                            </div>
                        )}

                        {isLoading ? (
                            <Button
                                size="icon"
                                onClick={onStop}
                                className="h-10 w-10 shrink-0 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border border-red-500/20 shadow-lg shadow-red-500/10 transition-all hover:scale-105"
                            >
                                <Square className="h-4 w-4 fill-current" />
                            </Button>
                        ) : inputValue.trim() || files.length > 0 ? (
                            <Button
                                size="icon"
                                onClick={handleSend}
                                disabled={isLoading}
                                className="h-10 w-10 shrink-0 rounded-full bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 hover:shadow-cyan-500/40"
                            >
                                <Send className="h-4 w-4 ml-0.5" />
                            </Button>
                        ) : (
                            <Button
                                size="icon"
                                className={cn(
                                    "h-10 w-10 shrink-0 rounded-full transition-all duration-300",
                                    isRecording
                                        ? "bg-red-500/20 text-red-500 shadow-red-500/20 shadow-lg border border-red-500/30"
                                        : "bg-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                                )}
                                onClick={toggleRecording}
                                title="Voice input"
                            >
                                {isRecording ? <X className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="hidden sm:flex mt-3 justify-between px-4 text-xs text-gray-500 font-medium select-none">
                <div className="flex items-center gap-1.5 ">
                    <Sparkles className="h-3 w-3 text-cyan-500" />
                    <span>AI can make mistakes. Check important info.</span>
                </div>
                <span className="opacity-60">Cmd + Enter to send</span>
            </div>
        </div>
    )
}
