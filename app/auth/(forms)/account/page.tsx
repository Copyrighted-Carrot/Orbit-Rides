import { getOwnProfile } from '@/lib/auth/account'
import SettingsPageContent from '@/app/(dashboard)/customer/settings/SettingsPageContent'
import Link from 'next/link'
import { accountHome } from '@/lib/auth/paths'

export const metadata = { title: 'Account settings | Orbit Rides', robots: { index: false, follow: false } }

export default async function AccountPage() {
    const { user, profile, role } = await getOwnProfile()
    return <><Link className="link p-6 block" href={accountHome(role)}>Back to dashboard</Link><SettingsPageContent key={user.id} userId={user.id} email={user.email || ''} displayName={profile?.display_name || ''} /></>
}
