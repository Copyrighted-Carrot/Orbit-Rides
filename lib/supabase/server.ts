import {createServerClient} from '@supabase/ssr'
import {cookies} from 'next/headers'
import {Database} from '@/database.types'
import { guardedSupabaseFetch } from './transport'

/**
 * Creates a server-side Supabase client instance using Next.js cookies for SSR and server actions.
 */
export async function createClient<Schema = Database>()
{
    const cookieStore = await cookies()

    return createServerClient<Schema>(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        {
            global: { fetch: guardedSupabaseFetch },
            cookies: {
                getAll()
                {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet)
                {
                    try
                    {
                        cookiesToSet.forEach(({name, value, options}) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch
                    {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
