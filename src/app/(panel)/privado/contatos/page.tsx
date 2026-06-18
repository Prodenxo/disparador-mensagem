import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { listContactsService } from '@/lib/services/contacts'
import { listContactListsService } from '@/lib/services/contact-lists'
import { ContactsManager } from '@/components/private-campaigns/contacts-manager'

export default async function PrivadoContatosPage () {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const creatableSectorIds = isSuperAdmin(session)
    ? null
    : session.sectors
      .filter(link => canCreateAnnouncement(session, link.sectorId))
      .map(link => link.sectorId)

  const [contacts, lists, sectors] = await Promise.all([
    listContactsService(session),
    listContactListsService(session),
    prisma.sector.findMany({
      where: {
        active: true,
        ...(creatableSectorIds ? { id: { in: creatableSectorIds } } : {})
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })
  ])

  const canCreate = isSuperAdmin(session)
    || session.sectors.some(link => canCreateAnnouncement(session, link.sectorId))

  return (
    <ContactsManager
      canCreate={canCreate}
      sectors={sectors}
      lists={lists.map(list => ({
        id: list.id,
        name: list.name,
        sectorId: list.sector.id
      }))}
      contacts={contacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        notes: contact.notes,
        sectorName: contact.sector.name,
        listCount: contact.listCount
      }))}
    />
  )
}
