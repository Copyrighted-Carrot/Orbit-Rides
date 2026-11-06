import RecoveryForm from '@/app/pages/RecoveryForm'
import { requireAccount } from '@/lib/auth/account'

export const metadata = { title: 'Reset password | Orbit Rides', robots: { index: false, follow: false } }

export default async function ResetPasswordPage() {
    const { user } = await requireAccount()
    return <RecoveryForm update userId={user.id} />
}
