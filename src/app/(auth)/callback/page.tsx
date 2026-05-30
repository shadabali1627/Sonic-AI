"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

function AuthCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    React.useEffect(() => {
        const token = searchParams.get("token")
        const error = searchParams.get("error")

        if (token) {
            localStorage.setItem("access_token", token)
            router.push("/")
        } else if (error) {
            router.push("/login?error=" + error)
        } else {
            // No token, no error?
            router.push("/login")
        }
    }, [router, searchParams])

    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#0B0E14] text-white">
            <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                <p className="text-gray-400">Authenticating...</p>
            </div>
        </div>
    )
}

export default function AuthCallbackPage() {
    return (
        <React.Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-[#0B0E14] text-white">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
        }>
            <AuthCallbackContent />
        </React.Suspense>
    )
}
