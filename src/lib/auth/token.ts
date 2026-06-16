import { SignJWT, jwtVerify } from 'jose'
import { env } from '@/lib/env'
import { SESSION_MAX_AGE } from '@/lib/auth/constants'

function getSecretKey (): Uint8Array {
  if (!env.authSecret) {
    throw new Error('AUTH_SECRET não configurado')
  }

  return new TextEncoder().encode(env.authSecret)
}

export async function createSessionToken (userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey())
}

export async function verifySessionToken (token: string): Promise<string | null> {
  if (!env.authSecret) return null

  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

export async function isSessionTokenValid (token: string | undefined): Promise<boolean> {
  if (!token) return false
  const userId = await verifySessionToken(token)
  return userId !== null
}
