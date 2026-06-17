import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { isSuperAdmin } from '@/lib/permissions'
import { listGroupsService, syncGroupsService } from '@/lib/services/groups'
import {
  completeGroupsSync,
  failGroupsSync,
  getGroupsSyncState,
  startGroupsSyncIfIdle
} from '@/lib/services/groups-sync-state'

function canSyncGroups (session: NonNullable<Awaited<ReturnType<typeof getSession>>>): boolean {
  if (isSuperAdmin(session)) return true
  return session.sectors.some(link => link.role === 'SECTOR_ADMIN')
}

function runGroupsSyncInBackground (): void {
  void (async () => {
    const result = await syncGroupsService()

    if (!result.success) {
      failGroupsSync(result.error)
      return
    }

    completeGroupsSync(result.data.count)
    revalidatePath('/grupos')
    revalidatePath('/anuncios/novo')
  })().catch(error => {
    console.error('[api/groups background sync]', error)
    const message = error instanceof Error ? error.message : 'Erro ao sincronizar grupos'
    failGroupsSync(message)
  })
}

export async function GET () {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const groups = await listGroupsService()
    return NextResponse.json({
      groups,
      sync: getGroupsSyncState()
    })
  } catch (error) {
    console.error('[api/groups GET]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST () {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (!canSyncGroups(session)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const started = startGroupsSyncIfIdle()

  if (!started) {
    return NextResponse.json({
      success: true,
      sync: getGroupsSyncState()
    })
  }

  runGroupsSyncInBackground()

  return NextResponse.json({
    success: true,
    sync: getGroupsSyncState()
  })
}
