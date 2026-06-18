import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement } from '@/lib/permissions'
import { deleteContactService } from '@/lib/services/contacts'

export async function DELETE (
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await context.params
  const result = await deleteContactService(session, id)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  revalidatePath('/privado/contatos')
  revalidatePath('/privado/listas')

  return NextResponse.json({ success: true })
}
