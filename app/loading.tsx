export default function Loading() {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-r from-slate-50 to-gray-300 dark:from-slate-900 dark:to-base-300 p-6">
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
                <h3 className="text-xl font-semibold tracking-wide bg-gradient-to-r from-emerald-600 to-teal-800 bg-clip-text text-transparent">
                    Loading Orbit Rides...
                </h3>
                <p className="text-sm text-base-content/70">
                    Preparing your rental experience...
                </p>
            </div>
        </div>
    );
}
