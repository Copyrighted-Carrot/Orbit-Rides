'use client'
import React, {useEffect, useActionState} from "react";
import TextBox from "@/app/components/TextBox";
import Link from "next/link";
import {LeftArrowIcon, LoginIcon} from "@/app/icons";
import {signupAdminWithEmail, signupCustomerWithEmail} from "@/app/auth/signupActions";
import {FormSubmitButton} from "@/app/components/FormSubmitButton";
import {toast} from "react-toastify";
import LogoLink from "@/app/components/LogoLink";
import PasswordTextBox from "@/app/components/PasswordTextBox";

export default function SignupWithEmailPage({isAdmin}: { isAdmin: boolean })
{

    const [state, signupAction, isPending] =
        useActionState(isAdmin ? signupAdminWithEmail : signupCustomerWithEmail, {
            data: {
                email: '',
                password: '',
                username: '',
            },
            error: ''
        })

    useEffect(() =>
    {
        if (!state.error) return;
        toast.error(state.error)
    }, [state]);

    return (
        <form action={signupAction}
              id="signup-form"
              autoComplete='on'
              className="flex flex-col w-full py-8 px-2 sm:px-8 my-auto min-h-screen h-full gap-7 justify-center relative scale-95 z-[1] animate-appear">

            <Link href={`/auth/${isAdmin ? 'admin' : 'customer'}/signup`} title='Back'
                  className='absolute left-3 top-3 text-sm'><LeftArrowIcon/></Link>

            <LogoLink/>

            <h1 className='text-2xl text-center'>Sign up</h1>

            <div className='flex flex-col gap-4'>
                <TextBox label='Email' type='email' id='email' placeholder='belindosamson@gmail.com'
                         defaultValue={state.data.email}/>
                <PasswordTextBox label='Password' id='password' placeholder='*****'
                         defaultValue={state.data.password}/>
                <TextBox label='User Name' type='text' id='username' placeholder='Copyrighted_Carrot'
                         defaultValue={state.data.username}/>
                <FormSubmitButton text='Sign up' isPending={isPending} icon={<LoginIcon/>}/>

                <span className='text-sm'>Already have an account? <Link
                    href={isAdmin ? '/auth/admin/login' : '/auth/customer/login'}
                    className='link link-primary link-hover font-medium'>Log in</Link></span>

                <span className='text-xs'>By signing up, you agree to our <a
                    className='link link-primary link-hover font-medium' href={`/privacy-policy`}>Privacy Policy</a>.</span>
            </div>
        </form>
    );
}