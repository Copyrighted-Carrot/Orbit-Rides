export default function AdminBookingsLoading() {
    return (
        <div className="py-10 px-4 md:px-8 flex flex-col gap-6 w-full">
            <div className="skeleton h-8 w-48"></div>
            <div className="skeleton h-64 w-full rounded-2xl"></div>
        </div>
    );
}
