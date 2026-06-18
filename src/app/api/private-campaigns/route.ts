import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import {
  createPrivateCampaignService,
  listPrivateCampaignsService
} from '@/lib/services/private-campaigns'

export async function GET () {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const campaigns = await listPrivateCampaignsService(session)
  return NextResponse.json({ campaigns })
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

  const formData = await request.formData()
  const result = await createPrivateCampaignService(session, formData)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  revalidatePath('/privado')

  return NextResponse.json({ success: true, data: result.data })
}
