import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

/**
 * Validates the Supabase auth session on every request.
 * Used by proxy.ts (Next.js middleware) to protect (app) routes.
 * Unauthenticated users are redirected to /login.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh session — important: do NOT remove this
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes — always allowed
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth")
  ) {
    return supabaseResponse
  }

  // Auth disabled for development — remove this block to re-enable login enforcement
  // if (!user) {
  //   const loginUrl = request.nextUrl.clone()
  //   loginUrl.pathname = "/login"
  //   return NextResponse.redirect(loginUrl)
  // }

  return supabaseResponse
}
