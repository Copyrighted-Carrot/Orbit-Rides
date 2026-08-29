'use server'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

type SignupFormData = {
    email: string,
    password: string,
    username: string,
}

type State = {
    data?: SignupFormData,
    error?: string
}

/**
 * Admin signup is disabled for security.
 * Admins must be created manually in the database or via invitation.
 */
export async function signupAdminWithEmail(_prevState: State, formData: FormData)
{
    // SECURITY: Admin accounts cannot be self-created.
    // To create an admin, insert directly into the user_roles table:
    //   UPDATE public.user_roles SET role = 'admin' WHERE user_id = '<uuid>';
    return {
        data: Object.fromEntries(formData) as SignupFormData,
        error: 'Admin registration is not available. Please contact your system administrator to request admin access.',
    }
}

export async function signupCustomerWithEmail(_prevState: State, formData: FormData)
{
    const supabase = await createClient()
    const data = Object.fromEntries(formData) as SignupFormData;
    const {error} = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
            data: {
                display_name: data.username,
                // Role is NO LONGER set via user_metadata.
                // It is auto-assigned to 'customer' by the DB trigger on auth.users INSERT.
            }
        },
    })

    if (!error) redirect('/customer/');

    // SECURITY FIX: Removed the old logic that auto-escalated roles to 'both'
    // when a user_already_exists error occurred. This was a privilege escalation vector.

    if (error.code === 'user_already_exists') {
        return {
            data: data,
            error: 'An account with this email already exists. Please log in instead.',
        }
    }

    // Return the form data with an error when an error happens during auth.
    return {
        data: data,
        error: error.message,
    }
}