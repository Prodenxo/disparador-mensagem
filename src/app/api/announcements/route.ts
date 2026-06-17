import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import {
  createAnnouncementService,
  listAnnouncementsService
} from '@/lib/services/announcements'

export async function GET () {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const announcements = await listAnnouncementsService(session)
    return NextResponse.json({ announcements })
  } catch (error) {
    console.error('[api/announcements GET]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST (request: Request) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const canCreateAny = isSuperAdmin(session)
    || session.sectors.some(link => canCreateAnnouncement(session, link.sectorId))

  if (!canCreateAny) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const result = await createAnnouncementService(session, formData)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    revalidatePath('/anuncios')
    revalidatePath('/')

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('[api/announcements POST]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
