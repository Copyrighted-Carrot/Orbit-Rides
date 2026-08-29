'use client'
import {useEffect} from 'react'
import LogoLink from "@/app/components/LogoLink";

export default function Error({error, reset,}: {
    error: Error & { digest?: string }
    reset: () => void
})
{
    useEffect(() =>
    {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className='flex flex-col gap-8 py-8 min-h-96 justify-center items-center h-full'>
            <LogoLink href='/customer/' replace/>
            <h2 className='text-2xl'>Something went wrong!</h2>
            <h2 className='text-lg'>{error.message}</h2>
            <button
                className='btn btn-outline'
                onClick={() => reset()}>
                Try Again
            </button>
        </div>
    )
}