import { redirect } from 'next/navigation'

export default function AdminEmailSignupPage() {
    redirect('/auth/admin/login')
}
