'use client';
import React, {useEffect, useActionState} from "react";
import TextBox from "@/app/components/TextBox";
import Link from "next/link";
import {FormSubmitButton} from "@/app/components/FormSubmitButton";
import {toast} from "react-toastify";
import LogoLink from "@/app/components/LogoLink";
import {loginAdmin, loginCustomer} from "@/app/auth/loginActions";
import {createClient} from "@/lib/supabase/client";
import ProviderButton from "@/app/components/ProviderButton";
import {GoogleLogo} from "@/app/icons";
import PasswordTextBox from "@/app/components/PasswordTextBox";
import {LoginIcon} from "@/app/icons";
export function LoginPage({isAdmin}: { isAdmin: boolean })
{
    const [state, loginAction, isPending] =
        useActionState(isAdmin ? loginAdmin : loginCustomer, {
            data: {
                email: '',
                password: '',
            },
            error: ''
        })
    useEffect(() =>
    {
        if (!state.error) return;
        toast.error(state.error)
    }, [state]);
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
        <form action={loginAction}
              id="login-form"
              autoComplete='on'
              className="flex flex-col w-full py-8 px-2 sm:px-8 my-auto min-h-screen h-full gap-7 justify-center relative scale-95 z-[1] animate-appear">
            <LogoLink className='mx-auto'/>
            <h1 className='text-2xl text-center'>Log in</h1>
            <div className='flex items-center justify-center gap-4'>
                <ProviderButton icon={<GoogleLogo/>} onClickHandler={handleOAuthSignIn}/>
            </div>
            <div className="divider">OR</div>
            <div className='flex flex-col gap-4'>
                <TextBox label='Email' type='email' id='email' placeholder='belindosamson@gmail.com'
                         defaultValue={state.data.email}/>
                <PasswordTextBox label='Password' id='password' placeholder='*****'
                                 defaultValue={state.data.password}/>
                <FormSubmitButton text='Log in' isPending={isPending} icon={<LoginIcon/>}/>

                <span className='text-sm'>Don&#39;t have an account? <Link
                    href={isAdmin ? '/auth/admin/signup' : '/auth/customer/signup'}
                    className='link link-primary link-hover font-medium'>Sign up</Link>
                    </span>
            </div>
        </form>
    );
}