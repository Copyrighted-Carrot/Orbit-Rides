import * as m from "framer-motion/m"
import FindCarForm from "@/app/customer/FindCarForm";
import Image from "next/image";
import bgImg from '@/public/images/customer-dashboard.jpg';
import NavBar from "@/app/components/NavBar";
import Footer from "@/app/components/Footer";

export const metadata = {
    title: "Your Journey Starts Here | Orbit Rides",
    description: "Choose your preferred pickup date, time, and delivery location for your car rental.",
};

export default function CustomerDashboard()
{
    return (
        <>
            <NavBar position={'fixed'} role={'customer'}/>
            
            <div
                className='px-4 md:px-8 lg:px-16 py-4 flex flex-col gap-4 relative min-h-[500px] h-[700px] md:h-screen'>

                <Image
                    src={bgImg}
                    alt="Customer dashboard background"
                    fill
                    priority
                    sizes="100vw"
                    quality={90}
                    className="absolute inset-0 object-cover md:!object-bottom"
                    style={{objectPosition: '-10rem 50%'}}
                />

                <div className='absolute inset-0 dark:bg-black dark:bg-opacity-10'></div>

                <div className='mt-28 text-3xl lg:text-4xl xl:text-5xl z-10'>
                    <m.h2 className='text-[length:inherit] font-semibold text-gray-700 relative'
                          initial={{x: -30, opacity: 0}}
                          animate={{x: 0, opacity: 1}}
                          transition={{duration: 0.6}}>
                        Lets find a suitable
                        <br/>
                        <m.span
                            className='text-[length:inherit] font-bold bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 bg-clip-text text-transparent relative'
                            initial={{x: -30, opacity: 0}}
                            animate={{x: 0, opacity: 1}}
                            transition={{duration: 0.6, delay: 0.3}}>
                            car for you!
                        </m.span>
                    </m.h2>
                </div>

                <FindCarForm/>

                <span className='absolute left-2 bottom-2 text-xs font-medium text-neutral-800'>Photo by <a
                    className='link link-hover font-bold'
                    href="https://unsplash.com/@mivosh?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Milosz Roman</a> on <a
                    className='link link-hover font-bold'
                    href="https://unsplash.com/photos/two-cars-parked-next-to-each-other-on-a-road-1ufbksTIUcQ?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Unsplash</a></span>
            </div>
            
            <Footer/>
        </>
    );
}