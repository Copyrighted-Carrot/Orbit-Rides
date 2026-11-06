'use client'

export default function FleetError() {
    return <div className="flex flex-col gap-5 p-8 min-h-96 justify-center items-center">
        <div role="alert"><h2 className="text-2xl">Fleet could not be loaded</h2>
            <p>Vehicle or availability information is temporarily unavailable. Please retry.</p></div>
        <button className="btn btn-outline" onClick={() => window.location.reload()}>Try again</button>
    </div>
}