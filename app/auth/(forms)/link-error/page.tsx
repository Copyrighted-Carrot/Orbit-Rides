import Link from 'next/link'

export default function AuthLinkError() {
    return <div className="p-8 space-y-6">
        <h1 className="text-2xl">This sign-in link could not be verified</h1>
        <p>The link may have expired or already been used. Open a fresh link in the browser where you requested it.</p>
        <Link className="btn btn-primary" href="/auth/recover">Request a recovery link</Link>
        <Link className="link block" href="/auth/customer/login">Back to login</Link>
    </div>
}
