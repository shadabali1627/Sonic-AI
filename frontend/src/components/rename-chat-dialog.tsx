"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Edit2, X } from "lucide-react"

interface RenameChatDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (newTitle: string) => void
    currentTitle: string
}

export function RenameChatDialog({ isOpen, onClose, onConfirm, currentTitle }: RenameChatDialogProps) {
    const [title, setTitle] = React.useState(currentTitle)

    // Reset title when dialog opens
    React.useEffect(() => {
        setTitle(currentTitle)
    }, [currentTitle, isOpen])

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault()
        if (title.trim()) {
            onConfirm(title.trim())
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md"
                        style={{ zIndex: 80 }}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 90 }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0B0E14] shadow-2xl ring-1 ring-white/5"
                        >
                            {/* Decorative Top Gradient/Glow */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-cyan-500/50 to-blue-500/50" />

                            <div className="p-6">
                                <div className="flex flex-col items-center text-center">
                                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 shadow-[0_0_30px_-10px_rgba(34,211,238,0.3)]">
                                        <Edit2 className="h-8 w-8" />
                                    </div>

                                    <h3 className="mb-2 text-xl font-bold text-white tracking-tight">Rename Chat</h3>
                                    <p className="text-sm text-gray-400 leading-relaxed mb-6">
                                        Enter a new name for this conversation.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium"
                                        placeholder="Chat title..."
                                        autoFocus
                                    />

                                    <div className="mt-4 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!title.trim()}
                                            className="flex-1 rounded-xl bg-linear-to-r from-cyan-600 to-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Close Button Top Right */}
                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
