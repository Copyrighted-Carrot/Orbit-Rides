import {createServerClient} from '@supabase/ssr'
import {NextResponse, type NextRequest} from 'next/server'

export async function updateSession(request: NextRequest)
{
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        {
            cookies: {
                getAll()
                {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet)
                {
                    cookiesToSet.forEach(({name, value}) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({name, value, options}) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {data: {user}} = await supabase.auth.getUser()

    // Redirect un-authenticated users to the login pages.
    if (!user)
    {
        const url = request.nextUrl.clone()
        if (request.nextUrl.pathname.startsWith('/admin'))
        {
            url.pathname = '/auth/admin/login'
            return NextResponse.redirect(url)
        }
        if (request.nextUrl.pathname.startsWith('/customer'))
        {
            url.pathname = '/auth/customer/login'
            return NextResponse.redirect(url)
        }
    }
    
    // Redirect un-authorized users based on their role from the database.
    // SECURITY FIX: Roles are now read from the secure `user_roles` table 
    // instead of `user_metadata` (which is client-writable).
    if (user)
    {
        // Query the secure user_roles table for the real role
        let role: string = 'customer';
        try {
            const {data: roleData} = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .maybeSingle();
            role = roleData?.role || user.user_metadata?.role || 'customer';
        } catch {
            role = user.user_metadata?.role || 'customer';
        }

        // Redirect unauthorized customer users when they try to access admin pages.  
        if (role === 'customer' && request.nextUrl.pathname.startsWith('/admin'))
        {
            const url = request.nextUrl.clone()
            url.pathname = '/customer/'
            return NextResponse.redirect(url)
        }

        // Redirect unauthorized admin users when they try to access customer pages.  
        if (role === 'admin' && request.nextUrl.pathname.startsWith('/customer'))
        {
            const url = request.nextUrl.clone()
            url.pathname = '/admin/'
            return NextResponse.redirect(url)
        }

        // Redirect already authenticated admin users to admin dashboard when they try to access auth pages.  
        if (role === 'admin' && request.nextUrl.pathname.startsWith('/auth/admin'))
        {
            const url = request.nextUrl.clone()
            url.pathname = '/admin/'
            return NextResponse.redirect(url)
        }

        // Redirect already authenticated customer users to customer dashboard when they try to access auth pages.  
        if (role === 'customer' && request.nextUrl.pathname.startsWith('/auth/customer'))
        {
            const url = request.nextUrl.clone()
            url.pathname = '/customer/'
            return NextResponse.redirect(url)
        }

        // If user is authenticated but visits any auth page, redirect to their dashboard
        if (request.nextUrl.pathname.startsWith('/auth/'))
        {
            const url = request.nextUrl.clone()
            url.pathname = role === 'admin' ? '/admin/' : '/customer/'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}