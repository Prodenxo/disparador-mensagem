import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/constants'
import { isSessionTokenValid } from '@/lib/auth/token'

const PUBLIC_PATHS = ['/login']

export async function middleware (request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const authenticated = await isSessionTokenValid(token)
  const isPublic = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))

  if (!authenticated && !isPublic) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'

    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }

    return NextResponse.redirect(loginUrl)
  }

  if (authenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
}
