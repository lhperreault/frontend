import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Server-side Supabase client using the service role key.
 * Used ONLY in Route Handlers (app/api/) and Server Components.
 * Never imported from client components.
 */
export function createServerClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
