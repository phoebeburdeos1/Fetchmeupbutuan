import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard')

  const isAdminPage = request.nextUrl.pathname.startsWith('/dashboard/admin')
  const adminAccess = request.cookies.get('admin_access')?.value === 'true'

  // Admin access guard
  if (isAdminPage && !adminAccess) {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      const role = profile?.role || 'user'
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Not logged in and trying to access dashboard (and not admin) -> redirect to login
  if (!user && isDashboardPage && !adminAccess) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If logged in but email not verified -> force verification pending state on login page
  if (user && !user.email_confirmed_at && isDashboardPage) {
    return NextResponse.redirect(new URL('/login?tab=login&message=verify-email', request.url))
  }

  // If logged in and verified
  if (user && user.email_confirmed_at) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'user'

    // If on login page or landing page but already logged in and verified -> redirect to respective dashboard
    if (isAuthPage || request.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url))
    }

    // Role-based routing guard
    if (request.nextUrl.pathname.startsWith('/dashboard/user') && role !== 'user') {
      return NextResponse.redirect(new URL('/dashboard/driver', request.url))
    }
    
    if (request.nextUrl.pathname.startsWith('/dashboard/driver') && role !== 'driver') {
      return NextResponse.redirect(new URL('/dashboard/user', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
