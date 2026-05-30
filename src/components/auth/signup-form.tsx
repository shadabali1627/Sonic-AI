

"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, useAnimation } from "framer-motion"
import { Mail, Lock, Loader2, Eye, EyeOff, Check, AlertCircle } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import api from "@/lib/api"
import { cn } from "@/lib/utils"

const signupSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(), // We'll validate matching in refine
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type SignupValues = z.infer<typeof signupSchema>

export function SignupForm() {
    const router = useRouter()
    const controls = useAnimation()
    const [isLoading, setIsLoading] = React.useState<boolean>(false)
    const [showPassword, setShowPassword] = React.useState(false)
    const [serverError, setServerError] = React.useState("")
    const [strength, setStrength] = React.useState(0)

    const form = useForm<SignupValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: "", // Although not in API, good validation practice
        },
    })

    const { register, handleSubmit, formState: { errors, touchedFields }, watch } = form
    const emailValue = watch("email")
    const passwordValue = watch("password")
    const confirmPasswordValue = watch("confirmPassword")

    React.useEffect(() => {
        controls.start({ opacity: 1, y: 0 })
    }, [controls])

    // Calculate password strength
    React.useEffect(() => {
        if (!passwordValue) {
            setStrength(0)
            return
        }
        let score = 0;
        if (passwordValue.length > 8) score += 1;
        if (/[A-Z]/.test(passwordValue)) score += 1;
        if (/[0-9]/.test(passwordValue)) score += 1;
        if (/[^A-Za-z0-9]/.test(passwordValue)) score += 1;
        setStrength(score);
    }, [passwordValue])


    async function onSubmit(data: SignupValues) {
        setIsLoading(true)
        setServerError("")

        try {
            const response = await api.post('/auth/register', {
                email: data.email,
                password: data.password
                // username is auto-generated
            });

            // Auto-login logic
            const { access_token } = response.data;
            if (access_token) {
                localStorage.setItem('access_token', access_token);
                router.push('/');
            } else {
                router.push('/login');
            }
        } catch (err: any) {
            console.error(err);
            const errorMessage = err.response?.data?.detail || "Registration failed. Please try again.";
            setServerError(errorMessage);
            controls.start({
                x: [0, -10, 10, -10, 10, 0],
                transition: { duration: 0.5 }
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={controls}
                transition={{ duration: 0.5 }}
                className="flex flex-col space-y-2 text-center"
            >
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/25 shadow-[0_0_35px_-5px_rgba(168,85,247,0.3)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-purple-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <h1 className="relative text-3xl font-heading font-black tracking-tight text-white drop-shadow-md">
                            Sign Up
                        </h1>
                    </div>
                </div>
                <p className="text-sm text-gray-400 font-medium">
                    Create your account to get started
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="grid gap-6"
            >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid gap-5">
                        <div className="grid gap-2">
                            <Label htmlFor="email" className={cn("text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors", errors.email ? "text-red-400" : "group-focus-within/email:text-purple-400")}>
                                Email
                            </Label>
                            <div className="relative group/email">
                                <div className={cn("absolute left-3 top-3.5 text-gray-500 transition-colors duration-300",
                                    errors.email ? "text-red-400" : "group-focus-within/email:text-purple-400")}>
                                    <Mail className="h-4 w-4" />
                                </div>
                                <Input
                                    id="email"
                                    placeholder="name@example.com"
                                    type="email"
                                    autoCapitalize="none"
                                    disabled={isLoading}
                                    className={cn(
                                        "pl-10 h-11 bg-white/[0.02] border-white/10 rounded-xl focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 hover:bg-white/[0.04] hover:border-white/15 transition-all duration-300 placeholder:text-gray-600",
                                        errors.email && "border-red-500/50 focus:ring-red-500/10"
                                    )}
                                    {...register("email")}
                                />
                                {!errors.email && touchedFields.email && emailValue && (
                                    <div className="absolute right-3 top-3.5 text-green-500 animate-in fade-in zoom-in">
                                        <Check className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                            {errors.email && (
                                <p className="text-xs text-red-400 flex items-center gap-1.5 animate-in slide-in-from-left-2 mt-0.5">
                                    <AlertCircle className="h-3.5 w-3.5" /> {errors.email.message}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password" className={cn("text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors", errors.password ? "text-red-400" : "group-focus-within/pass:text-purple-400")}>
                                Password
                            </Label>
                            <div className="relative group/pass">
                                <div className={cn("absolute left-3 top-3.5 text-gray-500 transition-colors duration-300",
                                    errors.password ? "text-red-400" : "group-focus-within/pass:text-purple-400")}>
                                    <Lock className="h-4 w-4" />
                                </div>
                                <Input
                                    id="password"
                                    placeholder="••••••••"
                                    type={showPassword ? "text" : "password"}
                                    disabled={isLoading}
                                    className={cn(
                                        "pl-10 pr-10 h-11 bg-white/[0.02] border-white/10 rounded-xl focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 hover:bg-white/[0.04] hover:border-white/15 transition-all duration-300 placeholder:text-gray-600",
                                        errors.password && "border-red-500/50 focus:ring-red-500/10"
                                    )}
                                    {...register("password")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3.5 text-gray-500 hover:text-purple-400 transition-colors focus:outline-hidden"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>

                            {/* Strength Indicator */}
                            <div className="flex gap-1.5 h-1.5 mt-1 px-1">
                                <div className={cn("flex-1 rounded-full transition-all duration-500", strength >= 1 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "bg-white/10")} />
                                <div className={cn("flex-1 rounded-full transition-all duration-500", strength >= 2 ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" : "bg-white/10")} />
                                <div className={cn("flex-1 rounded-full transition-all duration-500", strength >= 3 ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]" : "bg-white/10")} />
                                <div className={cn("flex-1 rounded-full transition-all duration-500", strength >= 4 ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-white/10")} />
                            </div>

                            {errors.password && (
                                <p className="text-xs text-red-400 flex items-center gap-1.5 animate-in slide-in-from-left-2 mt-0.5">
                                    <AlertCircle className="h-3.5 w-3.5" /> {errors.password.message}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword" className={cn("text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors", errors.confirmPassword ? "text-red-400" : "group-focus-within/confirm:text-purple-400")}>
                                Confirm Password
                            </Label>
                            <div className="relative group/confirm">
                                <div className={cn("absolute left-3 top-3.5 text-gray-500 transition-colors duration-300",
                                    errors.confirmPassword ? "text-red-400" : "group-focus-within/confirm:text-purple-400")}>
                                    <Lock className="h-4 w-4" />
                                </div>
                                <Input
                                    id="confirmPassword"
                                    placeholder="••••••••"
                                    type="password"
                                    disabled={isLoading}
                                    className={cn(
                                        "pl-10 h-11 bg-white/[0.02] border-white/10 rounded-xl focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 hover:bg-white/[0.04] hover:border-white/15 transition-all duration-300 placeholder:text-gray-600",
                                        errors.confirmPassword && "border-red-500/50 focus:ring-red-500/10"
                                    )}
                                    {...register("confirmPassword")}
                                />
                                {!errors.confirmPassword && confirmPasswordValue && passwordValue === confirmPasswordValue && (
                                    <div className="absolute right-3 top-3.5 text-green-500 animate-in fade-in zoom-in">
                                        <Check className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                            {errors.confirmPassword && (
                                <p className="text-xs text-red-400 flex items-center gap-1.5 animate-in slide-in-from-left-2 mt-0.5">
                                    <AlertCircle className="h-3.5 w-3.5" /> {errors.confirmPassword.message}
                                </p>
                            )}
                        </div>

                        {serverError && (
                            <div className="rounded-xl bg-red-500/10 p-3 border border-red-500/20 flex flex-col items-center gap-1 animate-in fade-in slide-in-from-top-2 backdrop-blur-sm">
                                <p className="text-sm text-red-400 font-medium text-center">{serverError}</p>
                                {serverError.includes("already exists") && (
                                    <Link href="/login" className="text-xs text-red-400 underline hover:text-red-300">
                                        Go to Sign In
                                    </Link>
                                )}
                            </div>
                        )}

                        <div className="relative group mt-2">
                            <div className="absolute -inset-1 bg-linear-to-r from-purple-600 to-pink-600 rounded-xl blur-lg opacity-40 group-hover:opacity-80 transition duration-500 animate-pulse"></div>
                            <Button disabled={isLoading} className="relative w-full h-11 bg-black border border-white/10 hover:bg-black/80 text-white overflow-hidden rounded-xl transition-all shadow-xl">
                                <div className="absolute inset-0 bg-linear-to-r from-purple-600/20 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                {isLoading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                <span className="relative z-10 font-bold tracking-wide uppercase text-sm">Sign Up</span>
                            </Button>
                        </div>
                    </div>
                </form>

                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/5" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#030305] px-4 text-gray-500 font-medium tracking-wider">
                            Or continue with
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <Button variant="outline" type="button" disabled={isLoading}
                        className="h-11 border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all text-gray-300 rounded-xl flex items-center justify-center"
                        onClick={() => window.location.href = `${api.defaults.baseURL}/auth/google/login?action=signup`}
                    >
                        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                        </svg>
                        Google
                    </Button>
                </div>

                <p className="px-8 text-center text-sm text-gray-500">
                    Already have an account?{" "}
                    <Link href="/login" className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors hover:underline underline-offset-4">
                        Sign In
                    </Link>
                </p>
            </motion.div >
        </div >
    )
}
