export default function CustomerCarsLoadingPage()
{
    return (
        <div className='py-10 px-4 flex flex-col grow gap-4 '>
            {/* Featured Cars Section Title */}
            <div className='skeleton h-8 w-40'></div>
            {/* Featured Cars Cards */}
            <div className='skeleton h-32'></div>

            <span className='flex justify-between items-end'>
                {/* Cars Section Title */}
                <div className='skeleton h-8 w-40'></div>
                {/* Filters Section */}
                <div className='hidden md:block skeleton h-16 w-40'></div>
            </span>
            <div className='flex gap-4'>
                {/* Cars Section */}
                <div className='flex flex-wrap gap-4'>
                    <div className="flex w-52 flex-col gap-4">
                        <div className="skeleton h-32 w-full"></div>
                        <div className="skeleton h-4 w-28"></div>
                        <div className="skeleton h-4 w-full"></div>
                        <div className="skeleton h-4 w-full"></div>
                    </div>
                    <div className="flex w-52 flex-col gap-4">
                        <div className="skeleton h-32 w-full"></div>
                        <div className="skeleton h-4 w-28"></div>
                        <div className="skeleton h-4 w-full"></div>
                        <div className="skeleton h-4 w-full"></div>
                    </div>
                    <div className="flex w-52 flex-col gap-4">
                        <div className="skeleton h-32 w-full"></div>
                        <div className="skeleton h-4 w-28"></div>
                        <div className="skeleton h-4 w-full"></div>
                        <div className="skeleton h-4 w-full"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}