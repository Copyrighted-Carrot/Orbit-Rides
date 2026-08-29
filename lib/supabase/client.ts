import {createBrowserClient} from '@supabase/ssr'
import {Database} from '@/database.types'

/**
 * Creates a browser-side Supabase client instance with typed database schema.
 */
export function createClient()
{
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string)
}