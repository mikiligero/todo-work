import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth-utils'

export async function middleware(request: NextRequest) {
    // 1. Check session for redirection on login page
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await decrypt(sessionCookie) : null

    if (request.nextUrl.pathname === '/login' && session?.userId) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    // 2. Check for public routes
    const isPublicRoute =
        request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/api') ||
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.includes('.')

    if (isPublicRoute) {
        return NextResponse.next()
    }

    // 3. Check for session cookie (Protected routes)
    if (!session?.userId) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
