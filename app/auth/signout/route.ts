import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { COOKIE_NAME } from '@/lib/auth'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  const accessUrl = process.env.NEXT_PUBLIC_URL_ACCESS ?? 'http://localhost:3002'
  return NextResponse.redirect(accessUrl)
}
