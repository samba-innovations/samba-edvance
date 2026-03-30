import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const PUBLIC_PATHS = ['/auth/sso', '/login']
const ACCESS_URL = process.env.NEXT_PUBLIC_URL_ACCESS ?? 'http://localhost:3002'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('samba_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL(ACCESS_URL))
  }

  const user = await verifyToken(token)
  if (!user) {
    return NextResponse.redirect(new URL(ACCESS_URL))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
