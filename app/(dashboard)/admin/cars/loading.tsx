export default function AdminCarsPageSkeleton()
{
    return (
        <section
            className='grow relative py-10 px-4 md:px-8 lg:px-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 flex-wrap 
                           gap-8 md:gap-6 justify-center items-center'>
            <div className='w-full h-96 skeleton'/>
            <div className='w-full h-96 skeleton'/>
            <div className='w-full h-96 skeleton'/>
            <div className='w-full h-96 skeleton'/>
        </section>
    );
}