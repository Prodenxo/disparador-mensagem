import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import {
  createCampaignService,
  listCampaignsService
} from '@/lib/services/campaigns'

export async function GET () {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const campaigns = await listCampaignsService(session)
    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('[api/campaigns GET]', error)
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
    const result = await createCampaignService(session, formData)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    revalidatePath('/campanhas')

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('[api/campaigns POST]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
