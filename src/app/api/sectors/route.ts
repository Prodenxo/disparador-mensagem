import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { isSuperAdmin } from '@/lib/permissions'
import { createSectorService } from '@/lib/services/sectors'

export async function POST (request: Request) {
  const session = await getSession()

  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const result = await createSectorService(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    revalidatePath('/setores')
    revalidatePath('/usuarios')

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('[api/sectors POST]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
