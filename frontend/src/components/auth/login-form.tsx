

"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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

const loginSchema = z.object({
    email: z.string().min(1, "Email is required"),
    password: z.string().min(1, "Password is required"),
    remember: z.boolean().default(false),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const controls = useAnimation()
    const [isLoading, setIsLoading] = React.useState<boolean>(false)
    const [showPassword, setShowPassword] = React.useState(false)
    const [serverError, setServerError] = React.useState("")

    const form = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
            remember: false,
        },
    })

    const { register, handleSubmit, formState: { errors, touchedFields }, watch } = form
    const emailValue = watch("email")

    React.useEffect(() => {
        // Initial entry animation
        controls.start({ opacity: 1, y: 0 })
    }, [controls])

    React.useEffect(() => {
        const errorMsg = searchParams.get("error")
        if (errorMsg) {
            setServerError(errorMsg)
            controls.start({
                x: [0, -10, 10, -10, 10, 0],
                transition: { duration: 0.5 }
            })
        }
    }, [searchParams, controls])

    async function onSubmit(data: LoginValues) {
        setIsLoading(true)
        setServerError("")

        try {
            const formData = new FormData();
            formData.append('username', data.email);
            formData.append('password', data.password);

            const response = await api.post('/auth/login', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const { access_token } = response.data;
            localStorage.setItem('access_token', access_token);
            router.push('/');
        } catch (err: any) {
            setServerError("Invalid credentials. Please try again.")
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
                    <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 shadow-[0_0_25px_-5px_rgba(6,182,212,0.4)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-cyan-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <h1 className="relative text-3xl font-heading font-bold tracking-tight text-white drop-shadow-md">
                            Sign In
                        </h1>
                    </div>
                </div>
                <p className="text-sm text-gray-400">
                    Welcome back to <span className="text-cyan-400 font-semibold">Sonic AI</span>
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
                            <Label htmlFor="email" className={cn("text-gray-300 transition-colors", errors.email ? "text-red-400" : "group-focus-within/email:text-cyan-400")}>
                                Email or Username
                            </Label>
                            <div className="relative group/email">
                                <div className={cn("absolute left-3 top-3 text-gray-500 transition-colors duration-300",
                                    errors.email ? "text-red-400" : "group-focus-within/email:text-cyan-400")}>
                                    <Mail className="h-4 w-4" />
                                </div>
                                <Input
                                    id="email"
                                    placeholder="name@example.com"
                                    type="text"
                                    autoCapitalize="none"
                                    disabled={isLoading}
                                    className={cn(
                                        "pl-10 h-11 bg-white/3 border-white/10 rounded-xl focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:border-transparent transition-all placeholder:text-gray-600 hover:bg-white/5",
                                        errors.email && "border-red-500/50 focus-visible:ring-red-500/30"
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
                                <p className="text-xs text-red-400 flex items-center gap-1 animate-in slide-in-from-left-2">
                                    <AlertCircle className="h-3 w-3" /> {errors.email.message}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className={cn("text-gray-300 transition-colors", errors.password && "text-red-400")}>
                                    Password
                                </Label>
                                <Link href="/forgot-password" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium hover:underline underline-offset-4">
                                    Forgot Password?
                                </Link>
                            </div>
                            <div className="relative group/pass">
                                <div className={cn("absolute left-3 top-3 text-gray-500 transition-colors duration-300",
                                    errors.password ? "text-red-400" : "group-focus-within/pass:text-cyan-400")}>
                                    <Lock className="h-4 w-4" />
                                </div>
                                <Input
                                    id="password"
                                    placeholder="••••••••"
                                    type={showPassword ? "text" : "password"}
                                    disabled={isLoading}
                                    className={cn(
                                        "pl-10 pr-10 h-11 bg-white/3 border-white/10 rounded-xl focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:border-transparent transition-all placeholder:text-gray-600 hover:bg-white/5",
                                        errors.password && "border-red-500/50 focus-visible:ring-red-500/30"
                                    )}
                                    {...register("password")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-gray-500 hover:text-cyan-400 transition-colors focus:outline-hidden"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-red-400 flex items-center gap-1 animate-in slide-in-from-left-2">
                                    <AlertCircle className="h-3 w-3" /> {errors.password.message}
                                </p>
                            )}
                        </div>

                        {serverError && (
                            <div className="rounded-xl bg-red-500/10 p-3 border border-red-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 backdrop-blur-sm">
                                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                                <p className="text-sm text-red-400 font-medium">{serverError}</p>
                            </div>
                        )}

                        <div className="flex items-center space-x-2 my-1">
                            <input
                                type="checkbox"
                                id="remember"
                                className="w-4 h-4 rounded border-gray-600 bg-gray-900/50 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-0 transition-all"
                                {...register("remember")}
                            />
                            <label htmlFor="remember" className="text-sm text-gray-400 select-none cursor-pointer hover:text-gray-300 transition-colors">Remember me</label>
                        </div>

                        <div className="relative group">
                            <div className="absolute -inset-1 bg-linear-to-r from-cyan-500 to-blue-600 rounded-xl blur-lg opacity-50 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
                            <Button disabled={isLoading} className="relative w-full h-11 bg-black border border-white/10 hover:bg-black/80 text-white overflow-hidden rounded-xl transition-all shadow-xl">
                                <div className="absolute inset-0 bg-linear-to-r from-cyan-500/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                {isLoading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                <span className="relative z-10 flex items-center justify-center font-bold tracking-wide uppercase text-sm">
                                    Sign In <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                                </span>
                            </Button>
                        </div>
                    </div>
                </form>

                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#0B0E14] px-4 text-gray-500 font-medium tracking-wider">
                            Or continue with
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <Button
                        variant="outline"
                        type="button"
                        disabled={isLoading}
                        className="h-11 border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all text-gray-300 rounded-xl"
                        onClick={() => window.location.href = `${api.defaults.baseURL}/auth/google/login`}
                    >
                        <svg className="mr-2 h-4 w-4 grayscale group-hover:grayscale-0 transition-all" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                        Google
                    </Button>
                </div>

                <p className="text-center text-sm text-gray-500">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors hover:underline underline-offset-4">
                        Sign Up
                    </Link>
                </p>
            </motion.div>
        </div>
    )
}
