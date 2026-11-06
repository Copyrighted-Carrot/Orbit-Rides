'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from './actions'

export default function SettingsPageContent({ email, displayName, userId }: { email: string; displayName: string; userId: string }) {
    const [name, setName] = useState(displayName)
    const [feedback, setFeedback] = useState<{ error?: string; message?: string }>({})
    const [pending, startTransition] = useTransition()
    const router = useRouter()

    function save(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFeedback({})
        startTransition(async () => {
            try {
                const result = await updateProfile({ display_name: name, user_id: userId })
                if (!result.success) {
                    setFeedback({ error: result.error })
                    return
                }
                setName(name.trim())
                setFeedback({ message: 'Your profile was saved.' })
                window.dispatchEvent(new Event('orbit-profile-updated'))
                router.refresh()
            } catch {
                setFeedback({ error: 'Your profile could not be saved. Please try again.' })
            }
        })
    }

    return <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-white">Account settings</h1>
            <form onSubmit={save} className="bg-slate-900/80 border border-white/10 rounded-3xl p-8 space-y-6">
                <p className="text-slate-300">{email}</p>
                <div className="space-y-2">
                    <label htmlFor="display_name" className="block text-slate-300">Display name</label>
                    <input id="display_name" name="display_name" required minLength={1} maxLength={80}
                        autoComplete="name" value={name} onChange={event => setName(event.target.value)}
                        className="input input-bordered w-full" />
                </div>
                {feedback.error && <p role="alert" className="text-red-300">{feedback.error}</p>}
                {feedback.message && <p role="status" className="text-emerald-300">{feedback.message}</p>}
                <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</button>
            </form>
        </div>
    </div>
}
