import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { canManageTeam } from '@/lib/permissions'
import { updateTeamMemberService } from '@/lib/services/team'

interface RouteContext {
  params: Promise<{ userId: string }>
}

export async function PATCH (request: Request, context: RouteContext) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const { userId } = await context.params
    const body = await request.json()

    if (!body.sectorId || !canManageTeam(session, body.sectorId)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const result = await updateTeamMemberService(userId, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    revalidatePath('/equipe')
    revalidatePath('/usuarios')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/team PATCH]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
