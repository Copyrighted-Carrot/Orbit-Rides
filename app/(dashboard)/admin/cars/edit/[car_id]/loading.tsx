export default function EditCarLoading() {
    return (
        <div className="px-4 md:px-8 lg:px-14 py-10 max-w-2xl mx-auto w-full flex flex-col gap-6">
            <div className="flex items-center gap-3">
                <div className="skeleton h-8 w-8 rounded-lg" />
                <div className="skeleton h-10 w-48" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="skeleton h-16 rounded-xl" />
                <div className="skeleton h-16 rounded-xl" />
                <div className="skeleton h-16 rounded-xl" />
                <div className="skeleton h-16 rounded-xl" />
                <div className="skeleton h-16 rounded-xl" />
                <div className="skeleton h-16 rounded-xl" />
            </div>
            <div className="skeleton h-12 w-full rounded-xl mt-4" />
        </div>
    );
}
