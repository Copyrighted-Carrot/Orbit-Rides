'use client'
import ProviderButton from "../components/ProviderButton";
import React from "react";
import Link from "next/link";
import {toast} from "react-toastify";
import {GoogleLogo, EnvelopeIcon} from '../icons';
import LogoLink from "@/app/components/LogoLink";
import {createClient} from "@/lib/supabase/client";


export default function SignupPage({isAdmin}: { isAdmin: boolean })
{
    const handleOAuthSignIn = async () =>
    {
        const supabase = createClient();
        const baseUrl = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URL || `${window.location.origin}/auth/assign-user-role/`;
        const redirectUrl = baseUrl.endsWith('/') ? `${baseUrl}${isAdmin ? 'admin' : 'customer'}` : `${baseUrl}/${isAdmin ? 'admin' : 'customer'}`;
        const {error} = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {redirectTo: redirectUrl},
        });

        if (error) {
            if (error.message.includes('not enabled') || error.message.includes('Unsupported provider')) {
                toast.error('Google Auth is disabled in your Supabase project. Enable Google under Auth > Providers in Supabase dashboard.');
            } else {
                toast.error(error.message);
            }
        }
    }

    return (
        <div
            className="flex flex-col w-full py-8 px-4 sm:px-10 my-auto min-h-screen h-full gap-12 pt-24 relative animate-appear">

            <LogoLink/>

            <h1 className='z-10 text-2xl text-center'>Sign up</h1>

            <div className='flex items-center justify-center gap-4'>
                <ProviderButton icon={<GoogleLogo/>} onClickHandler={handleOAuthSignIn}/>
            </div>

            <div className="divider">OR</div>

            <div className='z-10 flex flex-col gap-4'>
                <Link href={isAdmin ? '/auth/admin/signup-with-email/' : '/auth/customer/signup-with-email/'}
                      className='btn btn-primary'>
                    <span>Continue With Email</span>
                    <EnvelopeIcon/>
                </Link>
                <span className='text-sm'>Already have an account? <Link
                    href={isAdmin ? '/auth/admin/login' : '/auth/customer/login'}
                    className='link link-primary link-hover font-medium'>Log in</Link></span>
                <span className='text-xs'>By signing up, you agree to our <a
                    className='link link-primary link-hover font-medium'
                    href={`/privacy-policy`}>Privacy Policy</a>.</span>
            </div>
        </div>
    );
}