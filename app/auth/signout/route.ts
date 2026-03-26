import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  revalidatePath('/', 'layout')
  const accessUrl = process.env.NEXT_PUBLIC_URL_ACCESS ?? 'http://localhost:3002'
  return NextResponse.redirect(accessUrl, { status: 302 })
}
