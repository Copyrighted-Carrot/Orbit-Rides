'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { FormSubmitButton } from '@/app/components/FormSubmitButton'
import LogoLink from '@/app/components/LogoLink'
import { loginAdmin, loginCustomer } from '@/app/auth/loginActions'
import { beginGoogleLogin } from '@/app/auth/accountActions'
import PasswordTextBox from '@/app/components/PasswordTextBox'
import { LoginIcon } from '@/app/icons'
import type { AuthFormState } from '@/lib/auth/form'

export function LoginPage({ isAdmin, next = '', passwordUpdated = false }: { isAdmin: boolean; next?: string; passwordUpdated?: boolean }) {
    const [state, action, pending] = useActionState<AuthFormState, FormData>(isAdmin ? loginAdmin : loginCustomer, {})
    const [oauth, oauthAction, oauthPending] = useActionState(beginGoogleLogin, {})
    return <div className="flex flex-col w-full py-8 px-4 sm:px-8 my-auto min-h-screen gap-7 justify-center relative z-[1]">
        <LogoLink className="mx-auto" />
        <h1 className="text-2xl text-center">{isAdmin ? 'Administrator login' : 'Log in'}</h1>
        {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true' && <>
            <form action={oauthAction}><button className="btn w-full" disabled={oauthPending}>Continue with Google</button></form>
            {oauth.error && <p role="alert">{oauth.error}</p>}
        </>}
        <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="next" value={next} />
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={state.data?.email} className="input input-bordered" />
            <PasswordTextBox label="Password" id="password" placeholder="Password" autoComplete="current-password" />
            {state.error && <p role="alert">{state.error}</p>}
            {passwordUpdated && <p role="status">Your password was updated. Log in with your new password.</p>}
            <FormSubmitButton text="Log in" isPending={pending} icon={<LoginIcon />} />
        </form>
        <Link href="/auth/recover" className="link">Forgot password?</Link>
        {isAdmin ? <Link href="/auth/customer/login" className="link">Customer login</Link> : <p>Need an account? <Link href="/auth/customer/signup" className="link">Sign up</Link></p>}
    </div>
}
