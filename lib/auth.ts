import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export const COOKIE_NAME = 'samba_token'

const getSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is required')
  return new TextEncoder().encode(secret)
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type SessionUser = {
  id: number
  email: string
  name: string
  role: string
  mustChangePassword: boolean
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export async function createToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}

// ─── Cookie ──────────────────────────────────────────────────────────────────

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 8 * 60 * 60,
    path: '/',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  }
}

// ─── Session ─────────────────────────────────────────────────────────────────

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}
