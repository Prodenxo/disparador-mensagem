import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { listContactListsService } from '@/lib/services/contact-lists'
import { ContactListsManager } from '@/components/private-campaigns/contact-lists-manager'

export default async function PrivadoListasPage () {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const creatableSectorIds = isSuperAdmin(session)
    ? null
    : session.sectors
      .filter(link => canCreateAnnouncement(session, link.sectorId))
      .map(link => link.sectorId)

  const [lists, sectors] = await Promise.all([
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
    <ContactListsManager
      canCreate={canCreate}
      sectors={sectors}
      lists={lists.map(list => ({
        id: list.id,
        name: list.name,
        sectorName: list.sector.name,
        memberCount: list.memberCount
      }))}
    />
  )
}
