import { redirect } from 'next/navigation'

export default async function LegacyAuthCallback({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
    const { code } = await searchParams
    if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`)
    redirect('/auth/customer/login')
}
