import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import {
  cancelPrivateCampaignService,
  getPrivateCampaignLogsService
} from '@/lib/services/private-campaigns'

export async function GET (
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await context.params
  const campaign = await getPrivateCampaignLogsService(session, id)

  if (!campaign) {
    return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: campaign })
}

export async function PATCH (
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await context.params
  const result = await cancelPrivateCampaignService(session, id)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  revalidatePath('/privado')

  return NextResponse.json({ success: true })
}
