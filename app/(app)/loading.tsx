export default function HomePageLoadingPage()
{
    return (
        <div className='flex flex-col gap-8 p-3'>
            <div className="w-full h-14 skeleton"/>
            <div className="w-full max-w-56 h-8 skeleton"/>
            <div className="w-full max-w-64 h-4 skeleton"/>
            <div className="w-full max-w-64 h-4 skeleton"/>
            <div className="w-full max-w-64 h-4 skeleton"/>
            <div className="w-full max-w-64 h-4 skeleton"/>
            <div className="w-full h-56 skeleton"/>
        </div>
    );
}