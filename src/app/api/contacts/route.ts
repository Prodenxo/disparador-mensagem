import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import {
  createContactService,
  importContactsService,
  listContactsService
} from '@/lib/services/contacts'

export async function GET () {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const contacts = await listContactsService(session)
  return NextResponse.json({ contacts })
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
  const action = String(formData.get('action') ?? 'create')

  if (action === 'import') {
    const result = await importContactsService(session, formData)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    revalidatePath('/privado/contatos')
    revalidatePath('/privado/listas')
    return NextResponse.json({ success: true, data: result.data })
  }

  const result = await createContactService(session, formData)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  revalidatePath('/privado/contatos')
  revalidatePath('/privado/listas')

  return NextResponse.json({ success: true, data: result.data })
}
