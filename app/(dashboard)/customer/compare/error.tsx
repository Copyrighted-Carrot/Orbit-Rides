'use client'
export default function ComparisonError() {
    return <div className="p-8 space-y-4"><div role="alert"><h1 className="text-2xl">Comparison could not be loaded</h1><p>Current vehicle attributes or reviews are unavailable. Please retry.</p></div><button className="btn btn-outline" onClick={() => window.location.reload()}>Try again</button></div>
}
