import NavBar from '@/app/components/NavBar'
import Footer from '@/app/components/Footer'
import { requireAccount } from '@/lib/auth/account'
import type { ReactNode } from 'react'

export const metadata = { robots: { index: false, follow: false } }

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
    await requireAccount('admin')
    return <><NavBar role="admin" /><section className="grow">{children}</section><Footer /></>
}
