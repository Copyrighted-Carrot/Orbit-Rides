import { LoginPage } from '@/app/pages/LoginPage'

export const metadata = { title: 'Login | Orbit Rides', robots: { index: false, follow: false } }

export default async function CustomerLoginPage({ searchParams }: { searchParams: Promise<{ next?: string; passwordUpdated?: string }> }) {
    const params = await searchParams
    return <LoginPage isAdmin={false} next={params.next} passwordUpdated={params.passwordUpdated === '1'} />
}
