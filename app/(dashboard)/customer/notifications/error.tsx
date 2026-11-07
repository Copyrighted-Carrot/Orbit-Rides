'use client'

export default function NotificationError() {
    return <div className="p-8 space-y-5"><div role="alert"><h2 className="text-2xl font-semibold">Notifications could not be loaded</h2><p>Please retry to load your saved notifications.</p></div><button className="btn btn-outline" onClick={() => window.location.reload()}>Try again</button></div>
}
