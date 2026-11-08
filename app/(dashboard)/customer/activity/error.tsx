'use client'
export default function ActivityError() {
    return <div className="p-8 space-y-4"><div role="alert"><h1 className="text-2xl">Saved activity could not be loaded</h1><p>Your saved records have not been replaced with an empty list. Please retry.</p></div><button className="btn btn-outline" onClick={() => window.location.reload()}>Try again</button></div>
}
