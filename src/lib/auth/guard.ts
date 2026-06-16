import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { isSuperAdmin, type SessionUser } from '@/lib/permissions'

export async function requireSession (): Promise<SessionUser> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

export async function requireSuperAdmin (): Promise<SessionUser> {
  const session = await requireSession()
  if (!isSuperAdmin(session)) redirect('/')
  return session
}
