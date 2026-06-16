import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { isSuperAdmin } from '@/lib/permissions'
import { updateUserService } from '@/lib/services/users'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH (request: Request, context: RouteContext) {
  const session = await getSession()

  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const { id } = await context.params
    const body = await request.json()
    const result = await updateUserService(id, session.id, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    revalidatePath('/usuarios')
    revalidatePath('/setores')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/users PATCH]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
