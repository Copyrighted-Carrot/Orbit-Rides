'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signupCustomerWithEmail } from '@/app/auth/signupActions'
import { FormSubmitButton } from '@/app/components/FormSubmitButton'
import LogoLink from '@/app/components/LogoLink'
import PasswordTextBox from '@/app/components/PasswordTextBox'
import { LoginIcon } from '@/app/icons'
import type { AuthFormState } from '@/lib/auth/form'

export default function SignupWithEmailPage() {
    const [state, action, pending] = useActionState<AuthFormState, FormData>(signupCustomerWithEmail, {})
    return <form action={action} className="flex flex-col w-full py-8 px-4 sm:px-8 my-auto min-h-screen gap-6 justify-center">
        <LogoLink />
        <h1 className="text-2xl text-center">Create a customer account</h1>
        <div className="flex flex-col gap-1">
            <label htmlFor="username">Display name</label>
            <input id="username" name="username" required minLength={1} maxLength={80} autoComplete="name" defaultValue={state.data?.username} className="input input-bordered" />
        </div>
        <div className="flex flex-col gap-1">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={state.data?.email} className="input input-bordered" />
        </div>
        <PasswordTextBox id="password" label="Password" placeholder="At least 12 characters" autoComplete="new-password" />
        {state.error && <p role="alert">{state.error}</p>}
        {state.message && <p role="status">{state.message}</p>}
        <FormSubmitButton text="Create account" isPending={pending} icon={<LoginIcon />} />
        <p>Already registered? <Link href="/auth/customer/login" className="link">Log in</Link></p>
        <Link className="link text-sm" href="/privacy-policy">Privacy policy</Link>
    </form>
}
