import { Metadata } from 'next'
import { SignupForm } from '@/components/auth/signup-form'

export const metadata: Metadata = {
    title: 'Sign Up - Sonic AI',
    description: 'Create a new account',
}

export default function SignupPage() {
    return (
        <>
            <SignupForm />
        </>
    )
}
