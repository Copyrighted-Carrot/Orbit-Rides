export default function SettingsLoading() {
    return (
        <div className="px-4 md:px-8 lg:px-14 py-10 max-w-2xl mx-auto w-full flex flex-col gap-6">
            <div className="skeleton h-10 w-40" />
            <div className="skeleton h-4 w-64" />
            <div className="flex flex-col gap-4 mt-4">
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-12 w-full rounded-xl" />
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-12 w-full rounded-xl" />
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-12 w-full rounded-xl" />
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-12 w-full rounded-xl" />
            </div>
            <div className="skeleton h-12 w-full rounded-xl mt-4" />
        </div>
    );
}
