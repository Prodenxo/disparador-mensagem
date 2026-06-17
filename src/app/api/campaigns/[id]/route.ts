import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import {
  getCampaignService,
  toggleCampaignService,
  updateCampaignService
} from '@/lib/services/campaigns'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET (_request: Request, context: RouteContext) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const campaign = await getCampaignService(session, id)

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('[api/campaigns/[id] GET]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH (request: Request, context: RouteContext) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const body = await request.json() as { active?: boolean }

    if (typeof body.active !== 'boolean') {
      return NextResponse.json({ error: 'Campo active é obrigatório' }, { status: 400 })
    }

    const result = await toggleCampaignService(session, id, body.active)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    revalidatePath('/campanhas')
    revalidatePath(`/campanhas/${id}/editar`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/campaigns/[id] PATCH]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT (request: Request, context: RouteContext) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const canCreateAny = isSuperAdmin(session)
    || session.sectors.some(link => canCreateAnnouncement(session, link.sectorId))

  if (!canCreateAny) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await context.params

  try {
    const formData = await request.formData()
    const result = await updateCampaignService(session, id, formData)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    revalidatePath('/campanhas')
    revalidatePath(`/campanhas/${id}/editar`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/campaigns/[id] PUT]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
