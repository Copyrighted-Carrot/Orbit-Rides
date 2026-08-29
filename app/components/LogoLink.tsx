import Link from "next/link";
import React from "react";

export default function LogoLink({href = '/', replace = false, className = '', size = 'lg'}: {
    href?: string,
    replace?: boolean,
    className?: string
    size?: 'sm' | 'md' | 'lg'
})
{
    return (
        <Link replace={replace} href={href} className={`flex items-center justify-center gap-2 group ${className}`}>
            <div className={`bg-[url('/images/logo-light.svg')] 
                            dark:bg-[url('/images/logo-dark.svg')]
                            group-hover:animate-bounce
                            ${size === 'sm' && 'size-12'}
                            ${size === 'md' && 'size-13'}
                            ${size === 'lg' && 'size-15'}`}/>

            <h1 className={`font-bold
                            ${size === 'sm' && 'text-xl'}
                            ${size === 'md' && 'text-2xl'}
                            ${size === 'lg' && 'text-4xl'} 
                            `}
            >Orbit Rides</h1>
        </Link>
    );
}