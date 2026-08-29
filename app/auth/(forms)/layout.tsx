import React from "react";
import {ThemeSwitcher} from "@/app/components/ThemeSwitcher";

export default function AuthFormsLayout({children}: { children: React.ReactNode })
{
    return (
        <div className='min-h-screen h-full flex justify-center items-stretch dark:text-white'>

            {/* Image Section */}
            <div
                className='relative grow min-h-screen hidden md:block bg-cover bg-center'
                style={{backgroundImage: "url('/images/auth-background.jpg')"}}>
            </div>

            {/* Form Section */}
            <section
                className="relative w-screen md:w-[440px] min-h-screen h-full shadow-xl"
            >
                <div className='absolute top-4 right-4 z-10'><ThemeSwitcher className='!m-0'/></div>
                {children}
            </section>
        </div>
    );
}