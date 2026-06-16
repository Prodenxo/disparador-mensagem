import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import type { SessionUser } from '@/lib/permissions'
import { SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth/constants'
import { createSessionToken, verifySessionToken } from '@/lib/auth/token'

export { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, verifySessionToken }

export async function getSession (): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (!token) return null

  const userId = await verifySessionToken(token)
  if (!userId) return null

  const user = await prisma.user.findFirst({
    where: { id: userId, active: true },
    select: {
      id: true,
      email: true,
      name: true,
      globalRole: true,
      sectorLinks: {
        select: {
          sectorId: true,
          role: true,
          canCreateAnnouncements: true
        }
      }
    }
  })

  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    globalRole: user.globalRole,
    sectors: user.sectorLinks
  }
}

export function sessionCookieOptions (token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE
  }
}
