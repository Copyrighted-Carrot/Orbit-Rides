export default function AdminDashboardSkeleton()
{
    return (
        <div className="px-4 md:p-8 py-8 flex flex-col md:flex-row items-center justify-center gap-8">
            <div className='skeleton h-[250px] md:h-[500px] w-full max-w-96'/>
            <div className='skeleton h-[250px] md:h-[500px] w-full max-w-96'/>
        </div>
    );
}