"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, X } from "lucide-react"

interface LogoutDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
}

export function LogoutDialog({ isOpen, onClose, onConfirm }: LogoutDialogProps) {
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
                        className="fixed inset-0 z-60 bg-black/60 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0B0E14] shadow-2xl ring-1 ring-white/5"
                        >
                            {/* Decorative Top Gradient/Glow */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-red-500/50 to-orange-500/50" />

                            <div className="p-6">
                                <div className="flex flex-col items-center text-center">
                                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_30px_-10px_rgba(239,68,68,0.3)]">
                                        <AlertTriangle className="h-8 w-8" />
                                    </div>

                                    <h3 className="mb-2 text-xl font-bold text-white tracking-tight">Sign Out</h3>
                                    <p className="text-sm text-gray-400 leading-relaxed max-w-[260px]">
                                        Are you sure you want to sign out of your session? You will need to log in again to access your chats.
                                    </p>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={onConfirm}
                                        className="flex-1 rounded-xl bg-linear-to-r from-red-600 to-red-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 hover:from-red-500 hover:to-red-400 hover:shadow-red-500/40 transition-all"
                                    >
                                        Sign Out
                                    </button>
                                </div>
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
