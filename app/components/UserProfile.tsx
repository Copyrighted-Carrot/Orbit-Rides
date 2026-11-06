'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { logout } from '@/app/auth/accountActions'
import { isAccountRole, type AccountRole } from '@/lib/auth/paths'

type Profile = { displayName: string; role: AccountRole | null }

export default function UserProfile() {
    const supabase = useMemo(() => createClient(), [])
    const pathname = usePathname()
    const router = useRouter()
    const identity = useRef<string | null | undefined>(undefined)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(false)

    useEffect(() => {
        let active = true
        let generation = 0
        function observeIdentity(userId: string | null) {
            const previous = identity.current
            identity.current = userId
            if (previous !== undefined && previous !== userId) router.refresh()
        }
        async function load() {
            const request = ++generation
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (!active || request !== generation) return
            observeIdentity(user?.id || null)
            if (!user || authError) {
                setProfile(null)
                setLoadError(Boolean(authError && authError.name !== 'AuthSessionMissingError'))
                setLoading(false)
                return
            }
            const [account, role] = await Promise.all([
                supabase.from('user_profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
                supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
            ])
            if (!active || request !== generation) return
            setProfile({ displayName: account.data?.display_name?.trim() || 'Customer', role: isAccountRole(role.data?.role) ? role.data.role : null })
            setLoadError(Boolean(account.error || role.error))
            setLoading(false)
        }
        void load()
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            generation++
            setProfile(null)
            setLoading(true)
            setTimeout(() => {
                if (active) {
                    observeIdentity(session?.user.id || null)
                    void load()
                }
            }, 0)
        })
        const refresh = () => { void load() }
        window.addEventListener('orbit-profile-updated', refresh)
        window.addEventListener('focus', refresh)
        return () => {
            active = false
            subscription.unsubscribe()
            window.removeEventListener('orbit-profile-updated', refresh)
            window.removeEventListener('focus', refresh)
        }
    }, [supabase, pathname, router])

    if (loading) return <span className="text-sm" role="status">Loading account…</span>
    if (!profile) return <Link className="btn btn-primary btn-sm" href="/auth/customer/login">{loadError ? 'Retry login' : 'Log in'}</Link>
    return <details className="dropdown dropdown-end">
        <summary className="btn btn-ghost btn-sm" aria-label="Account menu">{profile.displayName}</summary>
        <ul className="menu dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-56 p-2 shadow">
            {loadError && <li><span role="status">Account details could not be refreshed.</span></li>}
            {profile.role === 'customer' && <li><Link href="/customer/profile">Profile</Link></li>}
            {profile.role === 'admin' && <li><Link href="/admin">Admin dashboard</Link></li>}
            {!profile.role && <li><Link href="/auth/access-unavailable">Check account access</Link></li>}
            <li><Link href={profile.role === 'customer' ? '/customer/settings' : '/auth/account'}>Account settings</Link></li>
            <li><form action={logout}><button type="submit">Sign out</button></form></li>
        </ul>
    </details>
}
