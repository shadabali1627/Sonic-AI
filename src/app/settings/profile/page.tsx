"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Sidebar } from "@/components/chat/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Menu, LogOut, Camera, Save, User, Loader2, Shield, Zap, Brain, Activity, Lock, CheckCircle2, AlertTriangle, HelpCircle 
} from "lucide-react"

import { LogoutDialog } from "@/components/logout-dialog"
import { getCurrentUser, updateUserProfile } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
    const router = useRouter()
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = React.useState(true)
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)
    const [activeTab, setActiveTab] = React.useState<'profile' | 'guardrails'>('profile')

    // Form State
    const [name, setName] = React.useState("")
    const [bio, setBio] = React.useState("")
    const [avatarUrl, setAvatarUrl] = React.useState("")
    const [email, setEmail] = React.useState("")

    // Guardrail settings state
    const [guardrails, setGuardrails] = React.useState({
        inputValidation: true,
        topicEnforcement: true,
        modelRouting: true,
        outputValidation: true,
        rateLimiting: true,
        crossModelConsistency: false,
        routerStrategy: 'auto' as 'auto' | 'gemini' | 'llama'
    })

    const [successMsg, setSuccessMsg] = React.useState("")
    const [errorMsg, setErrorMsg] = React.useState("")

    React.useEffect(() => {
        loadUser()
    }, [])

    const loadUser = async () => {
        try {
            const userData = await getCurrentUser()
            if (userData) {
                setName(userData.username || "")
                setEmail(userData.email || "")
                setBio(userData.bio || "")
                if (userData.guardrails) {
                    setGuardrails(userData.guardrails)
                }
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
        setSuccessMsg("")
        setErrorMsg("")
        
        try {
            const response = await updateUserProfile({
                username: name,
                bio,
                guardrails
            })
            
            if (response.access_token) {
                localStorage.setItem('access_token', response.access_token)
            }
            
            setSuccessMsg("Settings updated successfully!")
            setTimeout(() => setSuccessMsg(""), 3000)
            
            // Reload user data
            if (response.user) {
                setName(response.user.username || "")
                setBio(response.user.bio || "")
                if (response.user.guardrails) {
                    setGuardrails(response.user.guardrails)
                }
            }
        } catch (err: any) {
            console.error("Failed to save settings", err)
            setErrorMsg(err.response?.data?.detail || "Failed to save settings")
        } finally {
            setIsLoading(false)
        }
    }

    const toggleGuardrail = (key: keyof typeof guardrails) => {
        if (key === 'routerStrategy') return;
        setGuardrails(prev => ({
            ...prev,
            [key]: !prev[key]
        }))
    }

    const handleStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setGuardrails(prev => ({
            ...prev,
            routerStrategy: e.target.value as any
        }))
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

            <main className="flex flex-1 flex-col overflow-hidden relative bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.1),transparent)]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 h-14 border-b border-white/5 sm:h-16">
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
                        <span className="ml-2 font-bold text-lg">Settings</span>
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

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl mx-auto space-y-8"
                    >
                        {/* Avatar / Profile Summary */}
                        <div className="flex flex-col items-center space-y-4">
                            <div className="relative group">
                                <Avatar className="h-28 w-28 border-4 border-gray-800 shadow-xl">
                                    <AvatarImage src={avatarUrl || undefined} />
                                    <AvatarFallback className="text-3xl bg-linear-to-br from-cyan-500 to-blue-600 text-white font-black">
                                        {name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <label
                                    htmlFor="avatar-upload"
                                    className="absolute bottom-0 right-0 p-2 bg-cyan-500 rounded-full text-white shadow-lg cursor-pointer hover:bg-cyan-400 transition-colors"
                                >
                                    <Camera className="h-4 w-4" />
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
                                <p className="text-gray-400 text-xs">{email}</p>
                            </div>
                        </div>

                        {/* Glassmorphic Tabs Selector */}
                        <div className="flex gap-2 rounded-xl bg-white/5 p-1 border border-white/5 max-w-sm mx-auto backdrop-blur-md">
                            <button
                                type="button"
                                onClick={() => setActiveTab('profile')}
                                className={cn(
                                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5",
                                    activeTab === 'profile'
                                        ? "bg-linear-to-r from-cyan-500/25 to-blue-600/25 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                                )}
                            >
                                <User className="h-3.5 w-3.5" />
                                Profile Details
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('guardrails')}
                                className={cn(
                                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5",
                                    activeTab === 'guardrails'
                                        ? "bg-linear-to-r from-cyan-500/25 to-blue-600/25 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                                )}
                            >
                                <Shield className="h-3.5 w-3.5" />
                                AI Guardrails
                            </button>
                        </div>

                        {/* Status Message Alerts */}
                        <AnimatePresence mode="wait">
                            {successMsg && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm shadow-lg shadow-emerald-500/5"
                                >
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    <span>{successMsg}</span>
                                </motion.div>
                            )}
                            {errorMsg && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm shadow-lg shadow-red-500/5"
                                >
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    <span>{errorMsg}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Active Panel View */}
                        <form onSubmit={handleSave} className="space-y-6">
                            {activeTab === 'profile' ? (
                                <div className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm shadow-2xl relative overflow-hidden group">
                                    <div className="absolute inset-x-0 top-0 h-[1px] bg-linear-to-r from-transparent via-cyan-500/30 to-transparent" />
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-gray-300 text-xs font-bold uppercase tracking-wider">Display Name</Label>
                                        <div className="relative">
                                            <Input
                                                id="name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="bg-black/50 border-white/5 focus-visible:border-cyan-500 focus-visible:ring-1 focus-visible:ring-cyan-500/20 pl-10 h-11 rounded-xl text-sm"
                                            />
                                            <User className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="bio" className="text-gray-300 text-xs font-bold uppercase tracking-wider">Bio</Label>
                                        <Textarea
                                            id="bio"
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            className="bg-black/50 border-white/5 focus-visible:border-cyan-500 focus-visible:ring-1 focus-visible:ring-cyan-500/20 min-h-[120px] rounded-xl text-sm resize-none"
                                            placeholder="Write something about yourself..."
                                        />
                                        <p className="text-[10px] text-gray-500 text-right">
                                            {bio.length}/160 characters
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Sub-header */}
                                    <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                                        <div className="flex items-center gap-2 text-cyan-400">
                                            <Activity className="h-4 w-4" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Rate Limiter Status</span>
                                        </div>
                                        <span className="text-xs text-gray-400">Active (Max 30 req/min)</span>
                                    </div>

                                    {/* 1. Input Guardrail */}
                                    <div className="flex items-center justify-between gap-6 p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm hover:border-cyan-500/20 transition-all duration-300 group">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                <Shield className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-white">Input Guardrail</h4>
                                                <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                                                    Filters dangerous prompt injection scripts and length overflows.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleGuardrail('inputValidation')}
                                            className={cn(
                                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                                                guardrails.inputValidation ? "bg-cyan-500" : "bg-gray-700"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                                    guardrails.inputValidation ? "translate-x-4" : "translate-x-0"
                                                )}
                                            />
                                        </button>
                                    </div>

                                    {/* 2. Topic Classifier */}
                                    <div className="flex items-center justify-between gap-6 p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm hover:border-cyan-500/20 transition-all duration-300 group">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                <Brain className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-white">Topic Classifier</h4>
                                                <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                                                    Restricts inputs to friendly conversation topics. Blocks complex scripting/code.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleGuardrail('topicEnforcement')}
                                            className={cn(
                                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                                                guardrails.topicEnforcement ? "bg-cyan-500" : "bg-gray-700"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                                    guardrails.topicEnforcement ? "translate-x-4" : "translate-x-0"
                                                )}
                                            />
                                        </button>
                                    </div>

                                    {/* 3. Model Router Strategy */}
                                    <div className="p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm hover:border-cyan-500/20 transition-all duration-300 space-y-4">
                                        <div className="flex items-center justify-between gap-6">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                                                    <Zap className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-white">Model Router</h4>
                                                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                                                        Selects the optimal model dynamically (Gemini vs. OpenRouter/Llama).
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => toggleGuardrail('modelRouting')}
                                                className={cn(
                                                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                                                    guardrails.modelRouting ? "bg-cyan-500" : "bg-gray-700"
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                                        guardrails.modelRouting ? "translate-x-4" : "translate-x-0"
                                                    )}
                                                />
                                            </button>
                                        </div>
                                        {guardrails.modelRouting && (
                                            <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                <Label htmlFor="router-strategy" className="text-xs text-gray-300 font-semibold uppercase">Routing Priority</Label>
                                                <select
                                                    id="router-strategy"
                                                    value={guardrails.routerStrategy}
                                                    onChange={handleStrategyChange}
                                                    className="bg-black/50 border border-white/5 text-xs text-white rounded-lg p-2 focus:border-cyan-500 focus:outline-hidden font-medium min-w-[180px]"
                                                >
                                                    <option value="auto">Auto-Route (Optimal)</option>
                                                    <option value="gemini">Force Gemini (Multimodal)</option>
                                                    <option value="llama">Force Llama (Fast Text)</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* 4. Output Validator */}
                                    <div className="flex items-center justify-between gap-6 p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm hover:border-cyan-500/20 transition-all duration-300 group">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                <Lock className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-white">Output Validator</h4>
                                                <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                                                    Redacts PII (emails, phone numbers) and formats markdown tags for easy TTS playback.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleGuardrail('outputValidation')}
                                            className={cn(
                                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                                                guardrails.outputValidation ? "bg-cyan-500" : "bg-gray-700"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                                    guardrails.outputValidation ? "translate-x-4" : "translate-x-0"
                                                )}
                                            />
                                        </button>
                                    </div>

                                    {/* 5. Cross-Model Consistency */}
                                    <div className="flex items-center justify-between gap-6 p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm hover:border-cyan-500/20 transition-all duration-300 group">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                <Activity className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-white">Cross-Model Consistency</h4>
                                                <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                                                    Uses a secondary model to audit the response for instruction consistency (opt-in).
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleGuardrail('crossModelConsistency')}
                                            className={cn(
                                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                                                guardrails.crossModelConsistency ? "bg-cyan-500" : "bg-gray-700"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                                    guardrails.crossModelConsistency ? "translate-x-4" : "translate-x-0"
                                                )}
                                            />
                                        </button>
                                    </div>

                                    {/* 6. Rate Limiting */}
                                    <div className="flex items-center justify-between gap-6 p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm hover:border-cyan-500/20 transition-all duration-300 group">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                <Shield className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-white">Rate Limiter</h4>
                                                <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                                                    Prevents server overload and blocks account spam abuse.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleGuardrail('rateLimiting')}
                                            className={cn(
                                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                                                guardrails.rateLimiting ? "bg-cyan-500" : "bg-gray-700"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                                    guardrails.rateLimiting ? "translate-x-4" : "translate-x-0"
                                                )}
                                            />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Save Button */}
                            <div className="pt-4 flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white min-w-[120px] font-bold tracking-tight rounded-xl h-11 transition-all duration-300 shadow-lg shadow-cyan-500/15 hover:shadow-cyan-500/25"
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
