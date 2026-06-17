import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { cancelAnnouncementService } from '@/lib/services/announcements'

export async function PATCH (
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await context.params
  const result = await cancelAnnouncementService(session, id)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  revalidatePath('/anuncios')
  revalidatePath('/')

  return NextResponse.json({ success: true })
}
