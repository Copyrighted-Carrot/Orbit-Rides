'use client'
import Image from "next/image.js";
import {MoonLoader} from "react-spinners";
import {SignOutIcon} from "@/app/icons";
import React, {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import {toast} from "react-toastify";
import Link from "next/link";

export default function UserProfile()
{
    const [isUserAuthenticated, setIsUserAuthenticated] = useState<boolean>(false);
    const [userAvatar, setUserAvatar] = useState('')
    const [userName, setUserName] = useState('')
    const [isSigningOut, setIsSigningOut] = useState(false)
    const router = useRouter();
    const supabase = createClient();

    useEffect(() =>
    {
        async function getUser()
        {
            const session = await supabase.auth.getSession();
            setIsUserAuthenticated(session.data.session?.user.email !== undefined);
            setUserAvatar(session.data.session?.user.user_metadata.picture)
            setUserName(session.data.session?.user.user_metadata.display_name || session.data.session?.user.user_metadata.full_name)

            supabase.auth.onAuthStateChange((_event, session) =>
            {
                setIsUserAuthenticated(session?.user.email !== undefined);
            });
        }

        getUser()
    }, [supabase]);

    const handleSignOut = async () =>
    {
        if (isSigningOut) return;

        setIsSigningOut(true);
        const {error} = await supabase.auth.signOut();

        if (error)
        {
            toast.error(error.message)
            return;
        }

        router.push('/');
        setIsSigningOut(false);
    };

    if (!isUserAuthenticated) return <Link className='btn btn-primary btn-sm' href={'/auth/customer/login/'}>Rent Now</Link>

    return (
        <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle justify-center items-center flex">
                <div className={`avatar w-9 h-9 ${!userAvatar && 'placeholder'}`}>
                    {
                        userAvatar
                            ?
                            <Image
                                className='rounded-full'
                                width={100}
                                height={100}
                                alt="User profile picture."
                                src={userAvatar}/>
                            :
                            <span
                                className='bg-emerald-950 dark:bg-emerald-100 text-emerald-100 dark:text-emerald-900 rounded-full h-auto w-full flex justify-center items-center text-lg'>{userName.substring(0, 1)}</span>
                    }
                </div>
            </div>
            <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow">
                <li>
                    <Link href="/customer/profile" className="justify-between">
                        Profile
                    </Link>
                </li>
                
                <li>
                    <Link href="/customer/settings" className="justify-between">
                        Settings
                    </Link>
                </li>

                <div>
                    <li>
                        <button type='button'
                                className='relative'
                                onClick={handleSignOut}>
                            Sign out
                            <span className='absolute right-3 top-0 bottom-0 inline-flex items-center'>
                    {isSigningOut ? <MoonLoader size='14px'/> : <SignOutIcon width={17} height={17}/>}
                    </span>
                        </button>
                    </li>
                </div>
            </ul>
        </div>
    );
}