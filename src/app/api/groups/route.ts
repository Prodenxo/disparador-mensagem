import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { isSuperAdmin } from '@/lib/permissions'
import { listGroupsService, syncGroupsService } from '@/lib/services/groups'

function canSyncGroups (session: NonNullable<Awaited<ReturnType<typeof getSession>>>): boolean {
  if (isSuperAdmin(session)) return true
  return session.sectors.some(link => link.role === 'SECTOR_ADMIN')
}

export async function GET () {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const groups = await listGroupsService()
    return NextResponse.json({ groups })
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

  try {
    const result = await syncGroupsService()

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    revalidatePath('/grupos')
    revalidatePath('/anuncios/novo')

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('[api/groups POST]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
