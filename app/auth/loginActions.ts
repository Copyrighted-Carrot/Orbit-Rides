'use server'

import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";

type LoginFormData = {
    email: string,
    password: string,
}

type State = {
    data?: LoginFormData,
    error?: string
}

export async function loginAdmin(_prevState: State, formData: FormData)
{
    return await login(_prevState, formData, true);
}

export async function loginCustomer(_prevState: State, formData: FormData)
{
    return await login(_prevState, formData, false);
}

async function login(_prevState: State, formData: FormData, isAdmin: boolean)
{
    const supabase = await createClient()
    const data = Object.fromEntries(formData) as LoginFormData;
    
    const {error} = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
    })

    if (error) {
        return {
            data: data,
            error: error.message,
        }
    }

    // After successful login, verify the user's actual role from the DB
    const {data: {user}} = await supabase.auth.getUser();
    if (user) {
        const {data: roleData} = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();

        const role = roleData?.role || 'customer';

        // If logging in as admin but role is customer, reject
        if (isAdmin && role !== 'admin') {
            await supabase.auth.signOut();
            return {
                data: data,
                error: 'You do not have admin access. Please contact your administrator.',
            }
        }
    }

    redirect(isAdmin ? '/admin/' : '/customer/');
}