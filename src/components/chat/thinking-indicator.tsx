"use client"

import { motion } from "framer-motion"
import { Bot } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThinkingIndicator() {
    return (
        <div className="flex w-full self-start gap-4 p-4">
            <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 shadow-sm">
                <Bot className="h-5 w-5" />
            </div>
            <div className="relative flex items-center rounded-2xl rounded-tl-sm border border-white/5 bg-white/5 px-4 py-3 shadow-md">
                <div className="flex space-x-1">
                    {[0, 1, 2].map((dot) => (
                        <motion.div
                            key={dot}
                            initial={{ y: 0, opacity: 0.5 }}
                            animate={{ y: [-2, 2, -2], opacity: [0.5, 1, 0.5] }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: dot * 0.2,
                                ease: "easeInOut",
                            }}
                            className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                        />
                    ))}
                </div>
                <span className="ml-3 text-sm font-medium text-cyan-500/80 animate-pulse">
                    Thinking...
                </span>
            </div>
        </div>
    )
}
