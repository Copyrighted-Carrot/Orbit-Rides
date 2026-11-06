import Link from 'next/link'
import { logout } from '@/app/auth/accountActions'

export default function AccessUnavailable() {
    return <div className="p-8 space-y-6">
        <h1 className="text-2xl">Account access is unavailable</h1>
        <p>Your account permissions could not be verified. Try again or contact the operator.</p>
        <Link href="/customer" className="btn btn-primary">Try again</Link>
        <form action={logout}><button className="btn" type="submit">Sign out</button></form>
    </div>
}
