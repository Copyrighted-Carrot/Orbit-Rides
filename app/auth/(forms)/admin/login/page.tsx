import { LoginPage } from '@/app/pages/LoginPage'

export const metadata = { title: 'Administrator login | Orbit Rides', robots: { index: false, follow: false } }

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
    const params = await searchParams
    return <LoginPage isAdmin next={params.next} />
}
