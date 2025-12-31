"use client"

import * as React from "react"
import { X, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

import { LogoutDialog } from "@/components/logout-dialog"

interface SettingsDialogProps {
    isOpen: boolean
    onClose: () => void
    user: { username: string; email: string } | null
}

export function SettingsDialog({ isOpen, onClose, user }: SettingsDialogProps) {
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = React.useState(false)

    if (!isOpen) return null

    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token')
            window.location.href = '/login'
        }
    }

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0B0E14] shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/5 p-4">
                        <h2 className="text-lg font-semibold text-white">Settings</h2>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-gray-400 hover:text-white">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Profile Section */}
                        <div className="space-y-4">
                            <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">Account</div>

                            <div className="flex items-center gap-4 rounded-xl bg-white/5 p-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-blue-600 text-white font-bold text-xl shadow-lg shadow-cyan-500/20">
                                    {user?.username?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <div>
                                    <div className="text-white font-medium">{user?.username}</div>
                                    <div className="text-sm text-gray-400">{user?.email}</div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                className="w-full justify-start text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-300 transition-all"
                                onClick={() => setIsLogoutDialogOpen(true)}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign Out
                            </Button>
                        </div>

                        <div className="text-center text-xs text-gray-600 pt-4">
                            Sonic AI v1.0.0
                        </div>
                    </div>
                </div>
            </div>

            <LogoutDialog
                isOpen={isLogoutDialogOpen}
                onClose={() => setIsLogoutDialogOpen(false)}
                onConfirm={handleLogout}
            />
        </>
    )
}
