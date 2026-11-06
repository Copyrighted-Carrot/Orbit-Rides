'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset, updatePassword } from '@/app/auth/accountActions'
import PasswordTextBox from '@/app/components/PasswordTextBox'
import { FormSubmitButton } from '@/app/components/FormSubmitButton'
import { LoginIcon } from '@/app/icons'
import type { AuthFormState } from '@/lib/auth/form'

export default function RecoveryForm({ update = false, userId }: { update?: boolean; userId?: string }) {
    const [state, action, pending] = useActionState<AuthFormState, FormData>(update ? updatePassword : requestPasswordReset, {})
    return <form action={action} className="p-8 flex flex-col gap-6">
        <h1 className="text-2xl">{update ? 'Choose a new password' : 'Recover your account'}</h1>
        {update ? <>
            <input type="hidden" name="user_id" value={userId || ''} />
            <PasswordTextBox id="password" label="New password" placeholder="At least 12 characters" autoComplete="new-password" />
            <PasswordTextBox id="confirm-password" label="Confirm password" placeholder="Repeat the new password" autoComplete="new-password" />
        </> : <div className="flex flex-col gap-1">
            <label htmlFor="email">Email</label>
            <input className="input input-bordered" required type="email" autoComplete="email" name="email" id="email" maxLength={254} defaultValue={state.data?.email} />
        </div>}
        {state.error && <p role="alert">{state.error}</p>}
        {state.message && <p role="status">{state.message}</p>}
        <FormSubmitButton text={update ? 'Update password' : 'Send recovery link'} isPending={pending} icon={<LoginIcon />} />
        <Link className="link" href="/auth/customer/login">Back to login</Link>
    </form>
}
