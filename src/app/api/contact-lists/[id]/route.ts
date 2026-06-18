import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import {
  addContactToListService,
  deleteContactListService,
  getContactListMembersService,
  removeContactFromListService
} from '@/lib/services/contact-lists'

export async function GET (
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await context.params
  const result = await getContactListMembersService(session, id)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true, data: result.data })
}

export async function DELETE (
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await context.params
  const result = await deleteContactListService(session, id)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  revalidatePath('/privado/listas')

  return NextResponse.json({ success: true })
}

export async function PATCH (
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await context.params
  const body = await request.json()
  const action = String(body.action ?? '')
  const contactId = String(body.contactId ?? '')

  if (!contactId) {
    return NextResponse.json({ error: 'Contato inválido' }, { status: 400 })
  }

  const result = action === 'remove'
    ? await removeContactFromListService(session, id, contactId)
    : await addContactToListService(session, id, contactId)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  revalidatePath('/privado/listas')
  revalidatePath(`/privado/listas/${id}`)

  return NextResponse.json({ success: true })
}
