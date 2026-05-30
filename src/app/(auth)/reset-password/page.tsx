"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Lock, Loader2, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import api from "@/lib/api"

function ResetPasswordContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get("token")

    const [isLoading, setIsLoading] = React.useState<boolean>(false)
    const [password, setPassword] = React.useState("")
    const [confirmPassword, setConfirmPassword] = React.useState("")
    const [message, setMessage] = React.useState("")
    const [error, setError] = React.useState("")

    if (!token) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-red-400">
                <p>Invalid or missing reset token.</p>
                <Button variant="link" onClick={() => router.push("/login")}>Back to Login</Button>
            </div>
        )
    }

    async function onSubmit(event: React.SyntheticEvent) {
        event.preventDefault()
        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        setIsLoading(true)
        setError("")

        try {
            await api.post('/auth/reset-password', { token, new_password: password });
            setMessage("Password successfully reset! Redirecting to login...");
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.detail || "Failed to reset password. Token may be expired."
            setError(msg);
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col space-y-2 text-center"
            >
                <div className="flex justify-center mb-4">
                    <div className="p-3 bg-cyan-500/10 rounded-full border border-cyan-500/20">
                        <Lock className="h-6 w-6 text-cyan-400" />
                    </div>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-white drop-shadow-md">
                    Set New Password
                </h1>
                <p className="text-sm text-gray-400">
                    Enter your new password below
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="grid gap-6"
            >
                {message ? (
                    <div className="rounded-md bg-green-500/10 p-4 border border-green-500/20 text-center flex flex-col items-center">
                        <CheckCircle2 className="h-8 w-8 text-green-400 mb-2" />
                        <p className="text-sm text-green-400 font-medium">{message}</p>
                    </div>
                ) : (
                    <form onSubmit={onSubmit}>
                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors group-focus-within/pass:text-cyan-400">New Password</Label>
                                <div className="relative group/pass">
                                    <div className="absolute left-3 top-3.5 text-gray-500 transition-colors group-focus-within/pass:text-cyan-400">
                                        <Lock className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="password"
                                        placeholder="••••••••"
                                        type="password"
                                        disabled={isLoading}
                                        className="pl-10 h-11 bg-white/[0.02] border-white/10 rounded-xl focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 hover:bg-white/[0.04] hover:border-white/15 transition-all duration-300 placeholder:text-gray-600"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="confirm" className="text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors group-focus-within/confirm:text-cyan-400">Confirm Password</Label>
                                <div className="relative group/confirm">
                                    <div className="absolute left-3 top-3.5 text-gray-500 transition-colors group-focus-within/confirm:text-cyan-400">
                                        <Lock className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="confirm"
                                        placeholder="••••••••"
                                        type="password"
                                        disabled={isLoading}
                                        className="pl-10 h-11 bg-white/[0.02] border-white/10 rounded-xl focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 hover:bg-white/[0.04] hover:border-white/15 transition-all duration-300 placeholder:text-gray-600"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-xs text-red-400 flex items-center justify-center gap-1.5 bg-red-500/10 py-2.5 px-3 rounded-xl border border-red-500/20">{error}</p>
                            )}

                            <Button disabled={isLoading} className="w-full h-11 bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0 rounded-xl font-bold tracking-wide uppercase text-sm transition-all shadow-xl shadow-cyan-500/10">
                                {isLoading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Reset Password
                            </Button>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <React.Suspense fallback={<div className="text-center text-white">Loading...</div>}>
            <ResetPasswordContent />
        </React.Suspense>
    )
}
