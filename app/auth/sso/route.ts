import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createToken, cookieOptions, COOKIE_NAME, SessionUser } from '@/lib/auth'

const ACCESS_URL = process.env.NEXT_PUBLIC_URL_ACCESS ?? 'http://localhost:3002'

// GET /auth/sso?token=<uuid>
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const res = await fetch(`${ACCESS_URL}/api/sso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    if (!res.ok) {
      return NextResponse.redirect(new URL('/login?error=sso', request.url))
    }

    const { user } = (await res.json()) as { user: SessionUser }

    const jwt = await createToken(user)
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, jwt, cookieOptions())

    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch {
    return NextResponse.redirect(new URL('/login?error=sso', request.url))
  }
}
