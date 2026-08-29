'use client'
import {MoonLoader} from "react-spinners";
import {ReactNode} from "react";

export function FormSubmitButton({text, isPending, icon}: { text: string, isPending: boolean, icon?: ReactNode })
{
    return (
        <button className='btn btn-primary relative'
                type='submit' disabled={isPending}>
            {
                isPending ? <MoonLoader size='18px'/> :
                    <>
                        <span>{text}</span>
                        {icon && <span className='absolute right-4'>{icon}</span>}
                    </>
            }
        </button>
    )
}