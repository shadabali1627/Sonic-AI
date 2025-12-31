import { Metadata } from 'next'
import * as React from "react"
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
    title: 'Login - Sonic AI',
    description: 'Login to your account',
}

export default function LoginPage() {
    return (
        <>
            <React.Suspense fallback={<div className="text-white">Loading...</div>}>
                <LoginForm />
            </React.Suspense>
        </>
    )
}
