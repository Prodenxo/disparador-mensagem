import { prisma } from '@/lib/prisma'
import { actionError, actionSuccess, type ActionResult } from '@/lib/actions/result'
import {
  canCreateAnnouncement,
  isSuperAdmin,
  type SessionUser
} from '@/lib/permissions'
import { contactListInputSchema } from '@/lib/validations/private-campaign'

export interface ContactListRow {
  id: string
  name: string
  createdAt: Date
  sector: { id: string; name: string }
  createdBy: { id: string; name: string }
  memberCount: number
}

export interface ContactListMemberRow {
  id: string
  name: string
  phone: string
  notes: string | null
}

function sectorFilter (session: SessionUser) {
  return isSuperAdmin(session)
    ? {}
    : { sectorId: { in: session.sectors.map(link => link.sectorId) } }
}

export async function listContactListsService (session: SessionUser): Promise<ContactListRow[]> {
  const rows = await prisma.contactList.findMany({
    where: sectorFilter(session),
    orderBy: { name: 'asc' },
    take: 200,
    select: {
      id: true,
      name: true,
      createdAt: true,
      sector: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { members: true } }
    }
  })

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    sector: row.sector,
    createdBy: row.createdBy,
    memberCount: row._count.members
  }))
}

export async function getContactListMembersService (
  session: SessionUser,
  listId: string
): Promise<ActionResult<{
  list: ContactListRow
  members: ContactListMemberRow[]
}>> {
  const list = await prisma.contactList.findUnique({
    where: { id: listId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      sectorId: true,
      sector: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { members: true } },
      members: {
        orderBy: { addedAt: 'desc' },
        select: {
          contact: {
            select: {
              id: true,
              name: true,
              phone: true,
              notes: true
            }
          }
        }
      }
    }
  })

  if (!list) {
    return actionError('Lista não encontrada')
  }

  const allowed = isSuperAdmin(session)
    || session.sectors.some(link => link.sectorId === list.sectorId)

  if (!allowed) {
    return actionError('Sem permissão')
  }

  return actionSuccess({
    list: {
      id: list.id,
      name: list.name,
      createdAt: list.createdAt,
      sector: list.sector,
      createdBy: list.createdBy,
      memberCount: list._count.members
    },
    members: list.members.map(member => member.contact)
  })
}

export async function createContactListService (
  session: SessionUser,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = contactListInputSchema.safeParse({
    name: String(formData.get('name') ?? '').trim(),
    sectorId: String(formData.get('sectorId') ?? '')
  })

  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? 'Dados inválidos')
  }

  if (!canCreateAnnouncement(session, parsed.data.sectorId)) {
    return actionError('Sem permissão neste setor')
  }

  const list = await prisma.contactList.create({
    data: {
      name: parsed.data.name,
      sectorId: parsed.data.sectorId,
      createdById: session.id
    }
  })

  return actionSuccess({ id: list.id })
}

export async function deleteContactListService (
  session: SessionUser,
  listId: string
): Promise<ActionResult<null>> {
  const list = await prisma.contactList.findUnique({
    where: { id: listId },
    select: { sectorId: true, _count: { select: { campaigns: true } } }
  })

  if (!list) {
    return actionError('Lista não encontrada')
  }

  if (!canCreateAnnouncement(session, list.sectorId)) {
    return actionError('Sem permissão')
  }

  if (list._count.campaigns > 0) {
    return actionError('Esta lista está vinculada a campanhas e não pode ser excluída')
  }

  await prisma.contactList.delete({ where: { id: listId } })
  return actionSuccess(null)
}

export async function addContactToListService (
  session: SessionUser,
  listId: string,
  contactId: string
): Promise<ActionResult<null>> {
  const list = await prisma.contactList.findUnique({
    where: { id: listId },
    select: { sectorId: true }
  })

  if (!list) {
    return actionError('Lista não encontrada')
  }

  if (!canCreateAnnouncement(session, list.sectorId)) {
    return actionError('Sem permissão')
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, sectorId: list.sectorId }
  })

  if (!contact) {
    return actionError('Contato inválido para este setor')
  }

  await prisma.contactListMember.upsert({
    where: {
      listId_contactId: { listId, contactId }
    },
    create: { listId, contactId },
    update: {}
  })

  return actionSuccess(null)
}

export async function removeContactFromListService (
  session: SessionUser,
  listId: string,
  contactId: string
): Promise<ActionResult<null>> {
  const list = await prisma.contactList.findUnique({
    where: { id: listId },
    select: { sectorId: true }
  })

  if (!list) {
    return actionError('Lista não encontrada')
  }

  if (!canCreateAnnouncement(session, list.sectorId)) {
    return actionError('Sem permissão')
  }

  await prisma.contactListMember.deleteMany({
    where: { listId, contactId }
  })

  return actionSuccess(null)
}
