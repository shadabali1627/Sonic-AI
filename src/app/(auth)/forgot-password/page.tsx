"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Mail, Loader2, ArrowLeft, Lock, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import api from "@/lib/api"

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = React.useState<boolean>(false)
    const [step, setStep] = React.useState<"email" | "password">("email")
    const [email, setEmail] = React.useState("")
    const [password, setPassword] = React.useState("")
    const [confirmPassword, setConfirmPassword] = React.useState("")
    const [showPassword, setShowPassword] = React.useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
    const [error, setError] = React.useState("")
    const [success, setSuccess] = React.useState(false)

    // Step 1: Verify Email
    async function onEmailSubmit(event: React.SyntheticEvent) {
        event.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            await api.post('/auth/forgot-password', { email });
            setStep("password")
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.detail || "User not found."
            setError(msg);
        } finally {
            setIsLoading(false)
        }
    }

    // Step 2: Set New Password
    async function onPasswordSubmit(event: React.SyntheticEvent) {
        event.preventDefault()

        if (password.length < 8) {
            setError("Password must be at least 8 characters long")
            return
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        setIsLoading(true)
        setError("")

        try {
            await api.post('/auth/reset-password-direct', {
                email,
                new_password: password
            });
            setSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.detail || "Failed to reset password."
            setError(msg);
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-3 bg-green-500/10 rounded-full border border-green-500/20">
                        <div className="h-6 w-6 text-green-400">✓</div>
                    </div>
                    <h2 className="text-xl font-semibold text-white">Password Updated</h2>
                    <p className="text-sm text-gray-400">Redirecting to login...</p>
                </motion.div>
            </div>
        )
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
                        {step === "email" ? <Mail className="h-6 w-6 text-cyan-400" /> : <Lock className="h-6 w-6 text-cyan-400" />}
                    </div>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-white drop-shadow-md">
                    {step === "email" ? "Forgot Password" : "Reset Password"}
                </h1>
                <p className="text-sm text-gray-400">
                    {step === "email" ? "Enter your email to verify your account" : `Set a new password for ${email}`}
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="grid gap-6"
            >
                {step === "email" ? (
                    <form onSubmit={onEmailSubmit}>
                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors group-focus-within/email:text-cyan-400">Email Address</Label>
                                <div className="relative group/email">
                                    <div className="absolute left-3 top-3.5 text-gray-500 transition-colors group-focus-within/email:text-cyan-400">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="email"
                                        placeholder="name@example.com"
                                        type="email"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        disabled={isLoading}
                                        className="pl-10 h-11 bg-white/[0.02] border-white/10 rounded-xl focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 hover:bg-white/[0.04] hover:border-white/15 transition-all duration-300 placeholder:text-gray-600"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
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
                                Verify Account
                            </Button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={onPasswordSubmit}>
                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors group-focus-within/pass:text-cyan-400">New Password</Label>
                                <div className="relative group/pass">
                                    <div className="absolute left-3 top-3.5 text-gray-500 transition-colors group-focus-within/pass:text-cyan-400">
                                        <Lock className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        disabled={isLoading}
                                        className="pl-10 pr-10 h-11 bg-white/[0.02] border-white/10 rounded-xl focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 hover:bg-white/[0.04] hover:border-white/15 transition-all duration-300 placeholder:text-gray-600"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                    />
                                    {password && (
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3.5 text-gray-500 hover:text-cyan-400 transition-colors focus:outline-hidden"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    )}
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
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        disabled={isLoading}
                                        className="pl-10 pr-10 h-11 bg-white/[0.02] border-white/10 rounded-xl focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 hover:bg-white/[0.04] hover:border-white/15 transition-all duration-300 placeholder:text-gray-600"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={8}
                                    />
                                    {confirmPassword && (
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-3.5 text-gray-500 hover:text-cyan-400 transition-colors focus:outline-hidden"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {error && (
                                <p className="text-xs text-red-400 flex items-center justify-center gap-1.5 bg-red-500/10 py-2.5 px-3 rounded-xl border border-red-500/20">{error}</p>
                            )}

                            <div className="flex gap-3 mt-2">
                                <Button type="button" variant="outline" onClick={() => setStep("email")} className="flex-1 h-11 border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white rounded-xl transition-all">
                                    Back
                                </Button>
                                <Button disabled={isLoading} className="flex-2 h-11 bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0 rounded-xl font-bold tracking-wide uppercase text-sm transition-all shadow-xl shadow-cyan-500/10">
                                    {isLoading && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Update
                                </Button>
                            </div>
                        </div>
                    </form>
                )}

                {!success && step === "email" && (
                    <div className="text-center mt-2">
                        <Link href="/login" className="inline-flex items-center justify-center text-sm text-gray-500 hover:text-cyan-400 transition-colors">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Sign In
                        </Link>
                    </div>
                )}
            </motion.div>
        </div>
    )
}
