import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { isSuperAdmin } from '@/lib/permissions'
import { createUserService } from '@/lib/services/users'

export async function POST (request: Request) {
  const session = await getSession()

  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const result = await createUserService(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    revalidatePath('/usuarios')
    revalidatePath('/setores')

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('[api/users POST]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
