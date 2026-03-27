import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createToken, cookieOptions, COOKIE_NAME, SessionUser } from '@/lib/auth'

// URL interna Docker para comunicação container-a-container;
// fallback para URL pública em dev local.
const ACCESS_URL =
  process.env.ACCESS_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_URL_ACCESS ??
  'http://localhost:3002'

/** Constrói redirect usando as headers forwarded (evita usar URL interna do container). */
function publicRedirect(request: NextRequest, path: string) {
  const proto = request.headers.get('x-forwarded-proto') ?? 'http'
  const host  = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost'
  return NextResponse.redirect(`${proto}://${host}${path}`)
}

// GET /auth/sso?token=<uuid>
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return publicRedirect(request, '/login')
  }

  try {
    const res = await fetch(`${ACCESS_URL}/api/sso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    if (!res.ok) {
      return publicRedirect(request, '/login?error=sso')
    }

    const { user } = (await res.json()) as { user: SessionUser }

    const jwt = await createToken(user)
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, jwt, cookieOptions())

    return publicRedirect(request, '/dashboard')
  } catch {
    return publicRedirect(request, '/login?error=sso')
  }
}
