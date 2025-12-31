"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, MessageSquare, Settings, LogOut, X, Menu, Trash2, Edit2, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { getChats, getCurrentUser } from "@/lib/api"
import { DeleteChatDialog } from "@/components/delete-chat-dialog"
import { SettingsDialog } from "@/components/settings-dialog"
import { RenameChatDialog } from "@/components/rename-chat-dialog"

interface SidebarProps {
    isOpen: boolean
    onClose: () => void
    isDesktopOpen?: boolean
    onDesktopToggle?: () => void
    onLoadChat: (chatId: string) => void
    onNewChat?: () => void
}

export function Sidebar({ isOpen, onClose, isDesktopOpen = true, onDesktopToggle, onLoadChat, onNewChat }: SidebarProps) {
    const router = useRouter()
    const [chats, setChats] = React.useState<any[]>([])
    const [user, setUser] = React.useState<{ username: string; email: string } | null>(null)
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)
    const [deleteChatState, setDeleteChatState] = React.useState<{ isOpen: boolean; chatId: string | null; title: string }>({
        isOpen: false,
        chatId: null,
        title: ""
    })
    const [renameChatState, setRenameChatState] = React.useState<{ isOpen: boolean; chatId: string | null; currentTitle: string }>({
        isOpen: false,
        chatId: null,
        currentTitle: ""
    })

    React.useEffect(() => {
        loadChats()
    }, [isOpen, isDesktopOpen])

    const loadChats = async () => {
        try {
            const data = await getChats()
            setChats(data)
        } catch (e) {
            console.error("Failed to load chats", e)
        }
    }

    const loadUser = async () => {
        try {
            const userData = await getCurrentUser()
            setUser(userData)
        } catch (e) {
            console.error("Failed to load user", e)
        }
    }

    React.useEffect(() => {
        if (typeof window !== 'undefined' && localStorage.getItem('access_token')) {
            loadUser()
        }
    }, [])

    const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null)
    const menuRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenuId(null)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Group chats by date
    const groupedChats = React.useMemo(() => {
        const groups: Record<string, any[]> = {
            "TODAY": [],
            "YESTERDAY": [],
            "PREVIOUS 7 DAYS": [],
            "OLDER": []
        }

        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const lastWeek = new Date(today)
        lastWeek.setDate(lastWeek.getDate() - 7)

        chats.forEach(chat => {
            const date = chat.created_at || chat.updated_at ? new Date(chat.created_at || chat.updated_at) : new Date()

            if (date >= today) {
                groups["TODAY"].push(chat)
            } else if (date >= yesterday) {
                groups["YESTERDAY"].push(chat)
            } else if (date >= lastWeek) {
                groups["PREVIOUS 7 DAYS"].push(chat)
            } else {
                groups["OLDER"].push(chat)
            }
        })

        return groups
    }, [chats])

    const toggleMenu = (e: React.MouseEvent, chatId: string) => {
        e.preventDefault()
        e.stopPropagation()
        setActiveMenuId(activeMenuId === chatId ? null : chatId)
    }

    const handleDeleteChat = async (e: React.MouseEvent, chatId: string, title?: string) => {
        e.preventDefault()
        e.stopPropagation()
        setDeleteChatState({ isOpen: true, chatId, title: title || "Untitled Chat" })
        setActiveMenuId(null)
    }

    const confirmDeleteChat = async () => {
        if (deleteChatState.chatId) {
            setChats(chats.filter(c => (c.id || c._id) !== deleteChatState.chatId))
            setDeleteChatState({ ...deleteChatState, isOpen: false })
        }
    }

    const handleRenameChat = (e: React.MouseEvent, chatId: string, currentTitle: string) => {
        e.preventDefault()
        e.stopPropagation()
        setActiveMenuId(null)
        setRenameChatState({ isOpen: true, chatId, currentTitle })
    }

    const confirmRenameChat = (newTitle: string) => {
        if (renameChatState.chatId) {
            setChats(chats.map(c => (c.id || c._id) === renameChatState.chatId ? { ...c, title: newTitle } : c))
        }
    }

    // DESKTOP LOGIC: Expanded 260px, Collapsed 64px
    const isCollapsed = !isDesktopOpen;
    const desktopWidth = isCollapsed ? 64 : 260; // 64px = w-16, 260px custom

    // MOBILE LOGIC: Drawer Overlay
    // isOpen controls mobile visibility

    return (
        <>
            {/* Mobile Drawer Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm lg:hidden z-50"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="fixed inset-y-0 left-0 w-[280px] bg-[#0B0E11] border-r border-white/5 z-50 flex flex-col lg:hidden"
                        >
                            {/* Mobile Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/5">
                                <div className="flex items-center gap-3 font-heading font-bold text-xl text-white">
                                    <div className="h-8 w-8 rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                                        S
                                    </div>
                                    <span>Sonic<span className="text-cyan-400">AI</span></span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Mobile Content (Full Expanded) */}
                            <div className="p-4">
                                <Button
                                    onClick={() => { onNewChat?.(); onClose(); }}
                                    className="w-full bg-linear-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 rounded-xl h-11 justify-start gap-3 relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-cyan-500/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                                    <Plus className="h-5 w-5" />
                                    <span className="font-medium">New Chat</span>
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-2">
                                {Object.entries(groupedChats).map(([label, groupItems]) => (
                                    groupItems.length > 0 && (
                                        <div key={label} className="mb-6">
                                            <div className="px-4 py-2 text-xs font-bold text-gray-500 tracking-wider mb-1">
                                                {label}
                                            </div>
                                            <div className="space-y-0.5">
                                                {groupItems.map((chat) => (
                                                    <div key={chat.id || chat._id} className="relative group/item">
                                                        <Button
                                                            variant="ghost"
                                                            className="w-full justify-start gap-3 h-10 px-4 text-gray-400 hover:text-white hover:bg-white/5 font-normal rounded-lg"
                                                            onClick={() => { onLoadChat(chat.id || chat._id); onClose(); }}
                                                        >
                                                            <MessageSquare className="h-4 w-4 shrink-0" />
                                                            <span className="truncate flex-1 text-left">{chat.title || "Untitled Chat"}</span>
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>

                            {/* Mobile Footer */}
                            <div className="p-4 border-t border-white/5 bg-black/20">
                                {user ? (
                                    <div className="flex items-center justify-between" onClick={() => router.push('/settings/profile')}>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                                                {user.username?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-white">{user.username}</div>
                                                <div className="text-xs text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-purple-400 font-medium">Pro Plan</div>
                                            </div>
                                        </div>
                                        <Settings className="h-5 w-5 text-gray-500" />
                                    </div>
                                ) : (
                                    <Button variant="ghost" className="w-full justify-start gap-3 text-gray-400" onClick={() => router.push('/login')}>
                                        <Settings className="h-4 w-4" /> Settings
                                    </Button>
                                )}
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: desktopWidth }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="hidden lg:flex flex-col h-full bg-[#0B0E11] border-r border-white/5 overflow-hidden whitespace-nowrap z-40 relative"
            >
                {/* Header */}
                <div className={cn("flex items-center h-16 shrink-0 px-4 border-b border-white/5", isCollapsed ? "justify-center" : "justify-between")}>
                    <div className={cn("flex items-center gap-3 font-heading font-bold text-xl text-white", isCollapsed && "hidden")}>
                        <div className="h-8 w-8 rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                            S
                        </div>
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                            Sonic<span className="text-cyan-400">AI</span>
                        </motion.span>
                    </div>
                    {/* Collapsed Logo */}


                    <Button variant="ghost" size="icon" onClick={onDesktopToggle} className="text-gray-500 hover:text-white hover:bg-white/5">
                        <Menu className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* New Chat Button */}
                    <div className={cn("p-4 shrink-0", isCollapsed && "px-2 flex justify-center")}>
                        <Button
                            onClick={onNewChat}
                            className={cn(
                                "bg-linear-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 transition-all rounded-xl h-10 group overflow-hidden relative",
                                isCollapsed ? "w-10 p-0 justify-center" : "w-full justify-start gap-3"
                            )}
                            title="New Chat"
                        >
                            <div className="absolute inset-0 bg-linear-to-r from-transparent via-cyan-500/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                            <Plus className={cn("h-5 w-5 shrink-0", !isCollapsed && "group-hover:rotate-90 transition-transform")} />
                            {!isCollapsed && <span className="font-medium">New Chat</span>}
                        </Button>
                    </div>

                    {/* Chat History List (HIDDEN IF COLLAPSED) */}
                    {!isCollapsed && (
                        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {Object.entries(groupedChats).map(([label, groupItems]) => (
                                groupItems.length > 0 && (
                                    <div key={label} className="mb-5 animate-in slide-in-from-left-2 fade-in duration-500">
                                        <div className="px-3 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                            {label}
                                        </div>
                                        <div className="space-y-0.5">
                                            {groupItems.map((chat) => (
                                                <div key={chat.id || chat._id} className="relative group/item">
                                                    <Button
                                                        variant="ghost"
                                                        className="w-full justify-start gap-3 h-9 px-3 text-gray-400 hover:text-white hover:bg-white/5 font-normal rounded-lg text-sm"
                                                        onClick={() => onLoadChat(chat.id || chat._id)}
                                                    >
                                                        <MessageSquare className="h-4 w-4 shrink-0 opacity-70 group-hover/item:text-cyan-400 group-hover/item:opacity-100 transition-all" />
                                                        <span className="truncate">{chat.title || "Untitled Chat"}</span>
                                                    </Button>
                                                    {/* Context Menu (Hover) */}
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-gray-500 hover:text-white hover:bg-black/40 rounded-md"
                                                            onClick={(e) => toggleMenu(e, chat.id || chat._id)}
                                                        >
                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>

                                                    {/* Context Menu Dropdown Simplified */}
                                                    {activeMenuId === (chat.id || chat._id) && (
                                                        <div ref={menuRef} className="absolute right-0 top-8 z-50 w-32 bg-[#1A1D21] border border-white/10 rounded-lg shadow-xl py-1 animate-in zoom-in-95 duration-100">
                                                            <div
                                                                className="px-3 py-2 text-xs text-gray-300 hover:bg-white/5 cursor-pointer flex items-center gap-2"
                                                                onClick={(e) => handleRenameChat(e, chat.id || chat._id, chat.title)}
                                                            >
                                                                <Edit2 className="h-3 w-3" /> Rename
                                                            </div>
                                                            <div
                                                                className="px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 cursor-pointer flex items-center gap-2"
                                                                onClick={(e) => handleDeleteChat(e, chat.id || chat._id, chat.title)}
                                                            >
                                                                <Trash2 className="h-3 w-3" /> Delete
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer (Sticky) */}
                <div className={cn("border-t border-white/5 bg-[#0B0E11] p-4 shrink-0", isCollapsed && "p-2 flex justify-center")}>
                    {user ? (
                        <div
                            className={cn(
                                "flex items-center rounded-xl cursor-pointer hover:bg-white/5 transition-colors group relative",
                                isCollapsed ? "justify-center p-2" : "justify-between p-2"
                            )}
                            onClick={() => router.push('/settings/profile')}
                            title={isCollapsed ? user.username : undefined}
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 shrink-0 rounded-lg bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20 ring-1 ring-white/10">
                                    {user.username?.charAt(0).toUpperCase()}
                                </div>
                                {!isCollapsed && (
                                    <div className="flex flex-col min-w-0">
                                        <span className="truncate text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">{user.username}</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-1.5 w-1.5 rounded-full bg-linear-to-r from-cyan-400 to-purple-400 animate-pulse" />
                                            <span className="truncate text-xs text-gray-400 font-medium">Pro Plan</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {!isCollapsed && <Settings className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />}
                        </div>
                    ) : (
                        <div className={cn("space-y-2", isCollapsed && "flex justify-center")}>
                            <Button variant="ghost" className={cn("text-gray-400 hover:text-white hover:bg-white/5", isCollapsed ? "h-10 w-10 p-0 justify-center" : "w-full justify-start gap-2")} onClick={() => router.push('/login')}>
                                <Settings className="h-4 w-4" />
                                {!isCollapsed && "Settings"}
                            </Button>
                        </div>
                    )}
                </div>
            </motion.aside>

            <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} />
            <DeleteChatDialog isOpen={deleteChatState.isOpen} onClose={() => setDeleteChatState({ ...deleteChatState, isOpen: false })} onConfirm={confirmDeleteChat} chatTitle={deleteChatState.title} />
            <RenameChatDialog isOpen={renameChatState.isOpen} onClose={() => setRenameChatState({ ...renameChatState, isOpen: false })} onConfirm={confirmRenameChat} currentTitle={renameChatState.currentTitle} />
        </>
    )
}
