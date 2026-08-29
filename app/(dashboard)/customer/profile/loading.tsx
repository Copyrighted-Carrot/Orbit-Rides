export default function ProfileLoading() {
    return (
        <div className="px-4 md:px-8 lg:px-14 py-10 max-w-5xl mx-auto w-full flex flex-col gap-8">
            {/* Avatar + Name skeleton */}
            <div className="flex items-center gap-6">
                <div className="skeleton w-24 h-24 rounded-full" />
                <div className="flex flex-col gap-3">
                    <div className="skeleton h-8 w-48" />
                    <div className="skeleton h-4 w-32" />
                </div>
            </div>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="skeleton h-24 rounded-2xl" />
                <div className="skeleton h-24 rounded-2xl" />
                <div className="skeleton h-24 rounded-2xl" />
            </div>
            {/* Content sections */}
            <div className="skeleton h-64 rounded-2xl" />
            <div className="skeleton h-48 rounded-2xl" />
        </div>
    );
}
