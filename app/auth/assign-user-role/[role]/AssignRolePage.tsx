'use client'
import {createClient} from "@/lib/supabase/client";
import Link from "next/link";
import React, {useEffect} from "react";
import {useRouter} from "next/navigation";
import LoadingPage from "@/app/pages/LoadingPage";
import {toast} from "react-toastify";

/**
 * The contents of the Assign User Role Page.
 */
export default function AssignUserRolePageContent({role}: { role: string })
{
    const supabase = createClient()
    const router = useRouter()

    useEffect(() =>
    {
        if (role !== 'admin' && role !== 'customer') return;

        async function assignRole()
        {
            const user = await supabase.auth.getUser();
            const userCurrentRole = user.data.user?.user_metadata.role;

            if (!userCurrentRole)
            {
                const {error} = await supabase.auth.updateUser({data: {role: role}})

                if (error)
                {
                    toast.error(`Signup error: ${error.message}`)
                    router.push('/')
                    return;
                }
                router.push(`/${role}/`)
                return;
            }

            // Convert the role of the user to 'both' when a user from a specific
            // role tries to signup as a new user from the other role.
            if (role === 'admin' && userCurrentRole === 'customer' ||
                role === 'customer' && userCurrentRole === 'admin')
            {
                const {error} = await supabase.auth.updateUser({data: {role: 'both'}})
                if (error)
                {
                    toast.error(`Signup error: ${error.message}`)
                    router.push('/')
                    return;
                }
                router.push(`/${role}/`)
                return;
            }

            // The user is just trying to log in.
            router.push(`/${role}/`)
        }

        assignRole()
    }, [role, router, supabase]);

    return (
        <div className='min-h-screen flex flex-col justify-center items-center gap-6'>
            {
                (role !== 'admin' && role !== 'customer') ?
                    <>
                        <h1 className='text-lg'>Something went wrong!</h1>
                        <Link href='/' className='btn'>Return to home</Link>
                    </>
                    :
                    <LoadingPage message='Redirecting to dashboard, please wait...'/>
            }
        </div>);
}