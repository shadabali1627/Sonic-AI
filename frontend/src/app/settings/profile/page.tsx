"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Sidebar } from "@/components/chat/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Menu, LogOut, Camera, Save, User, Loader2 } from "lucide-react"

import { LogoutDialog } from "@/components/logout-dialog"

import { getCurrentUser } from "@/lib/api"

// ... imports

export default function ProfilePage() {
    const router = useRouter()
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = React.useState(true)
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)

    // Form State
    const [name, setName] = React.useState("")
    const [bio, setBio] = React.useState("") // We might want to persist bio in backend later, currently just local state or if backend supports it
    const [avatarUrl, setAvatarUrl] = React.useState("")
    const [email, setEmail] = React.useState("")

    React.useEffect(() => {
        loadUser()
    }, [])

    const loadUser = async () => {
        try {
            const userData = await getCurrentUser()
            if (userData) {
                setName(userData.username || "")
                setEmail(userData.email || "")
                // If backend provided bio/avatar, we would set them here. 
                // userData currently key: { username: string; email: string } based on Sidebar usage.
            }
        } catch (e) {
            console.error("Failed to load user", e)
        }
    }

    // Redirect if not authenticated (Same as page.tsx)
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 1500))
        setIsLoading(false)
    }

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const url = URL.createObjectURL(file)
            setAvatarUrl(url)
        }
    }

    return (
        <div className="flex h-screen overflow-hidden bg-[#0B0E14] text-gray-100 selection:bg-cyan-500/30">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                isDesktopOpen={isDesktopSidebarOpen}
                onDesktopToggle={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
                onLoadChat={() => { }} // No-op
                onNewChat={() => router.push('/')}
            />

            <main className="flex flex-1 flex-col overflow-hidden relative">
                <div className="flex items-center justify-between p-2 h-14 sm:p-4 sm:h-auto border-b border-white/5 sm:border-none">
                    <div className="flex items-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation()
                                setIsSidebarOpen(true)
                            }}
                            className="lg:hidden text-gray-400"
                        >
                            <Menu className="h-6 w-6" />
                        </Button>
                        {!isDesktopSidebarOpen && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setIsDesktopSidebarOpen(true)
                                }}
                                className="hidden lg:flex text-gray-400"
                            >
                                <Menu className="h-6 w-6" />
                            </Button>
                        )}
                        <span className="ml-2 font-bold text-lg">Profile Settings</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-white hover:bg-white/10"
                        onClick={() => setIsLogoutDialogOpen(true)}
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl mx-auto space-y-8"
                    >
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center space-y-4">
                            <div className="relative group">
                                <Avatar className="h-32 w-32 border-4 border-gray-800 shadow-xl">
                                    <AvatarImage src={avatarUrl || undefined} />
                                    <AvatarFallback className="text-4xl bg-linear-to-br from-cyan-500 to-blue-600 text-white">
                                        {name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <label
                                    htmlFor="avatar-upload"
                                    className="absolute bottom-0 right-0 p-2 bg-cyan-500 rounded-full text-white shadow-lg cursor-pointer hover:bg-cyan-400 transition-colors"
                                >
                                    <Camera className="h-5 w-5" />
                                    <input
                                        id="avatar-upload"
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                    />
                                </label>
                            </div>
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-white">{name}</h2>
                                <p className="text-gray-400 text-sm">Update your photo and personal details</p>
                            </div>
                        </div>

                        {/* Profile Form */}
                        <form onSubmit={handleSave} className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-gray-300">Display Name</Label>
                                <div className="relative">
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="bg-black/50 border-gray-700 focus-visible:border-cyan-500 pl-10"
                                    />
                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bio" className="text-gray-300">Bio</Label>
                                <Textarea
                                    id="bio"
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    className="bg-black/50 border-gray-700 focus-visible:border-cyan-500 min-h-[100px]"
                                />
                                <p className="text-xs text-gray-500 text-right">
                                    {bio.length}/160 characters
                                </p>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white min-w-[120px]"
                                >
                                    {isLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </motion.div>
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
