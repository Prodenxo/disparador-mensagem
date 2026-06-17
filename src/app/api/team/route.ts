import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { canManageTeam } from '@/lib/permissions'
import {
  createTeamMemberService,
  listTeamMembersService
} from '@/lib/services/team'

export async function GET (request: Request) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const sectorId = new URL(request.url).searchParams.get('sectorId')

  if (!sectorId) {
    return NextResponse.json({ error: 'Setor obrigatório' }, { status: 400 })
  }

  if (!canManageTeam(session, sectorId)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const result = await listTeamMembersService(sectorId)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ members: result.data })
}

export async function POST (request: Request) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body.sectorId || !canManageTeam(session, body.sectorId)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const result = await createTeamMemberService(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    revalidatePath('/equipe')
    revalidatePath('/usuarios')

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('[api/team POST]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
