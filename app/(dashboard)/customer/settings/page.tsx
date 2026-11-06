import { getOwnProfile, requireAccount } from '@/lib/auth/account'
import SettingsPageContent from './SettingsPageContent'

export const metadata = { title: 'Account settings | Orbit Rides', robots: { index: false, follow: false } }

export default async function SettingsPage() {
    await requireAccount('customer')
    const { user, profile } = await getOwnProfile()
    return <SettingsPageContent key={user.id} userId={user.id} email={user.email || ''} displayName={profile?.display_name || ''} />
}
