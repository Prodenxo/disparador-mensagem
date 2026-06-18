import { prisma } from '@/lib/prisma'
import { actionError, actionSuccess, type ActionResult } from '@/lib/actions/result'
import {
  canCreateAnnouncement,
  isSuperAdmin,
  type SessionUser
} from '@/lib/permissions'
import { normalizePhone } from '@/lib/phone'
import {
  contactInputSchema,
  parseCsvContacts
} from '@/lib/validations/private-campaign'

const MAX_IMPORT_ROWS = 100

export interface ContactRow {
  id: string
  name: string
  phone: string
  notes: string | null
  createdAt: Date
  sector: { id: string; name: string }
  createdBy: { id: string; name: string }
  listCount: number
}

function sectorFilter (session: SessionUser) {
  return isSuperAdmin(session)
    ? {}
    : { sectorId: { in: session.sectors.map(link => link.sectorId) } }
}

export async function listContactsService (session: SessionUser): Promise<ContactRow[]> {
  const rows = await prisma.contact.findMany({
    where: sectorFilter(session),
    orderBy: { name: 'asc' },
    take: 500,
    select: {
      id: true,
      name: true,
      phone: true,
      notes: true,
      createdAt: true,
      sector: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { listMembers: true } }
    }
  })

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    notes: row.notes,
    createdAt: row.createdAt,
    sector: row.sector,
    createdBy: row.createdBy,
    listCount: row._count.listMembers
  }))
}

export async function createContactService (
  session: SessionUser,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = contactInputSchema.safeParse({
    name: String(formData.get('name') ?? '').trim(),
    sectorId: String(formData.get('sectorId') ?? ''),
    phone: String(formData.get('phone') ?? '').trim(),
    notes: String(formData.get('notes') ?? '').trim() || undefined
  })

  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? 'Dados inválidos')
  }

  if (!canCreateAnnouncement(session, parsed.data.sectorId)) {
    return actionError('Sem permissão neste setor')
  }

  const sector = await prisma.sector.findFirst({
    where: { id: parsed.data.sectorId, active: true }
  })

  if (!sector) {
    return actionError('Setor inválido')
  }

  const existing = await prisma.contact.findUnique({
    where: {
      sectorId_phone: {
        sectorId: parsed.data.sectorId,
        phone: parsed.data.phone
      }
    }
  })

  if (existing) {
    return actionError('Este telefone já está cadastrado neste setor')
  }

  const contact = await prisma.contact.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      notes: parsed.data.notes,
      sectorId: parsed.data.sectorId,
      createdById: session.id
    }
  })

  const listId = String(formData.get('listId') ?? '').trim()

  if (listId) {
    const list = await prisma.contactList.findFirst({
      where: { id: listId, sectorId: parsed.data.sectorId }
    })

    if (list) {
      await prisma.contactListMember.upsert({
        where: {
          listId_contactId: {
            listId,
            contactId: contact.id
          }
        },
        create: { listId, contactId: contact.id },
        update: {}
      })
    }
  }

  return actionSuccess({ id: contact.id })
}

export async function deleteContactService (
  session: SessionUser,
  contactId: string
): Promise<ActionResult<null>> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { sectorId: true }
  })

  if (!contact) {
    return actionError('Contato não encontrado')
  }

  if (!canCreateAnnouncement(session, contact.sectorId)) {
    return actionError('Sem permissão')
  }

  await prisma.contact.delete({ where: { id: contactId } })
  return actionSuccess(null)
}

export async function importContactsService (
  session: SessionUser,
  formData: FormData
): Promise<ActionResult<{ created: number; skipped: number; addedToList: number }>> {
  const sectorId = String(formData.get('sectorId') ?? '')
  const listId = String(formData.get('listId') ?? '').trim()
  const csv = String(formData.get('csv') ?? '')

  if (!sectorId) {
    return actionError('Setor obrigatório')
  }

  if (!canCreateAnnouncement(session, sectorId)) {
    return actionError('Sem permissão neste setor')
  }

  if (listId) {
    const list = await prisma.contactList.findFirst({
      where: { id: listId, sectorId }
    })

    if (!list) {
      return actionError('Lista inválida para este setor')
    }
  }

  const rows = parseCsvContacts(csv).slice(0, MAX_IMPORT_ROWS)

  if (rows.length === 0) {
    return actionError('Nenhum contato válido no arquivo. Use: nome, telefone')
  }

  let created = 0
  let skipped = 0
  let addedToList = 0

  for (const row of rows) {
    const phone = normalizePhone(row.phone)

    if (!phone) {
      skipped += 1
      continue
    }

    const contact = await prisma.contact.upsert({
      where: {
        sectorId_phone: { sectorId, phone }
      },
      create: {
        name: row.name,
        phone,
        sectorId,
        createdById: session.id
      },
      update: {
        name: row.name
      }
    })

    if (contact.createdAt.getTime() > Date.now() - 1000) {
      created += 1
    } else {
      skipped += 1
    }

    if (listId) {
      await prisma.contactListMember.upsert({
        where: {
          listId_contactId: {
            listId,
            contactId: contact.id
          }
        },
        create: { listId, contactId: contact.id },
        update: {}
      })
      addedToList += 1
    }
  }

  return actionSuccess({ created, skipped, addedToList })
}
